package pl.lotypoz;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class Alerts {
    static final String CHANNEL = "okazje";
    static final int JOB_ID = 1;

    public static void schedule(Context ctx, Settings s) {
        JobScheduler js = (JobScheduler) ctx.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (js == null) return;
        js.cancel(JOB_ID);
        if (!s.enabled) return;
        JobInfo ji = new JobInfo.Builder(JOB_ID, new ComponentName(ctx, DealJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(s.everyHours * 3600000L)
                .setPersisted(true)
                .build();
        js.schedule(ji);
    }

    /** Sprawdza loty, zapisuje wyniki i powiadamia o nowych lub tańszych okazjach. Zwraca liczbę nowych. */
    public static int runCheck(Context ctx) throws Exception {
        Settings s = Settings.load(ctx);
        List<FareChecker.Deal> deals = new ArrayList<>();
        StringBuilder errors = new StringBuilder();
        int ok = 0;
        Exception lastErr = null;
        if (s.ryanair) {
            try { deals.addAll(FareChecker.search(s)); ok++; }
            catch (Exception e) { lastErr = e; errors.append("Ryanair: ").append(e.getMessage()).append(". "); }
        }
        if (s.wizz) {
            try { deals.addAll(WizzChecker.search(s)); ok++; }
            catch (Exception e) { lastErr = e; errors.append("Wizz Air: ").append(e.getMessage()).append(". "); }
        }
        SharedPreferences p = Settings.prefs(ctx);
        p.edit().putString("lastErrors", errors.toString().trim()).apply();
        if (ok == 0 && lastErr != null) throw lastErr;
        Collections.sort(deals, (a, b) -> Double.compare(a.price, b.price));

        JSONArray last = new JSONArray();
        for (FareChecker.Deal d : deals) last.put(d.toJson());
        p.edit().putString("last", last.toString()).putLong("lastTime", System.currentTimeMillis()).apply();

        JSONObject seen;
        try { seen = new JSONObject(p.getString("seen", "{}")); } catch (Exception e) { seen = new JSONObject(); }
        int fresh = 0;
        FareChecker.Deal best = null;
        StringBuilder lines = new StringBuilder();
        for (FareChecker.Deal d : deals) {
            double prev = seen.optDouble(d.key(), -1);
            if (prev < 0 || d.price < prev - 1) {
                fresh++;
                if (best == null) best = d;
                if (fresh <= 5) lines.append(d.from).append(" → ").append(d.toCity).append(" (").append(d.airline).append("): ")
                        .append(Math.round(d.price)).append(" zł (").append(shortDate(d.out)).append("–").append(shortDate(d.in)).append(")\n");
            }
            seen.put(d.key(), d.price);
        }
        // nie trzymaj w nieskończoność starych wpisów
        if (seen.length() > 800) {
            JSONObject trimmed = new JSONObject();
            for (FareChecker.Deal d : deals) trimmed.put(d.key(), d.price);
            seen = trimmed;
        }
        p.edit().putString("seen", seen.toString()).apply();

        if (fresh > 0 && best != null) {
            String title = "✈ " + best.from + " → " + best.toCity + " za " + Math.round(best.price) + " zł";
            String more = fresh > 1 ? "Nowych okazji: " + fresh + "\n" : "";
            show(ctx, title, more + lines.toString().trim());
        }
        return fresh;
    }

    static String shortDate(String iso) {
        if (iso == null || iso.length() < 10) return "";
        return Integer.parseInt(iso.substring(8, 10)) + "." + iso.substring(5, 7);
    }

    public static void show(Context ctx, String title, String text) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Tanie loty", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Powiadomienia o nowych tanich lotach");
            nm.createNotificationChannel(ch);
        }
        Intent i = new Intent(ctx, MainActivity.class);
        i.putExtra("tab", "alerts");
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, CHANNEL) : new Notification.Builder(ctx);
        b.setSmallIcon(R.drawable.ic_notif)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setContentIntent(pi)
                .setAutoCancel(true);
        nm.notify((int) (System.currentTimeMillis() % 100000), b.build());
    }
}
