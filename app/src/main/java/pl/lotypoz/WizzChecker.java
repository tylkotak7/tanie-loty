package pl.lotypoz;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Najtańsze loty Wizz Air (tam i z powrotem) z rozkładu cen na stronie wizzair.com. */
public class WizzChecker {

    // Przybliżone kursy do przeliczenia cen powrotów podanych w walucie lotniska docelowego.
    static final Map<String, Double> RATES = new HashMap<>();
    static {
        RATES.put("PLN", 1.0); RATES.put("EUR", 4.25); RATES.put("GBP", 4.95); RATES.put("USD", 3.9);
        RATES.put("CHF", 4.6); RATES.put("NOK", 0.37); RATES.put("SEK", 0.38); RATES.put("DKK", 0.57);
        RATES.put("HUF", 0.011); RATES.put("CZK", 0.17); RATES.put("RON", 0.85); RATES.put("BGN", 2.17);
        RATES.put("GEL", 1.45); RATES.put("ALL", 0.046); RATES.put("ISK", 0.03); RATES.put("MAD", 0.42);
        RATES.put("EGP", 0.08); RATES.put("ILS", 1.08); RATES.put("AED", 1.06); RATES.put("MKD", 0.069);
        RATES.put("RSD", 0.036); RATES.put("BAM", 2.17); RATES.put("MDL", 0.22); RATES.put("TRY", 0.11);
    }

    static class Fare { String date; double pln; Fare(String d, double p) { date = d; pln = p; } }

    public static List<FareChecker.Deal> search(Settings s) throws Exception {
        String base = baseUrl();
        JSONObject map = new JSONObject(http(base + "/Api/asset/map?languageCode=pl-pl", null));
        JSONArray cities = map.optJSONArray("cities");
        if (cities == null) throw new Exception("Wizz Air: brak listy połączeń");
        Map<String, JSONObject> byIata = new HashMap<>();
        for (int i = 0; i < cities.length(); i++) {
            JSONObject c = cities.getJSONObject(i);
            byIata.put(c.optString("iata"), c);
        }

        List<FareChecker.Deal> res = new ArrayList<>();
        Calendar start = Calendar.getInstance();
        start.add(Calendar.DAY_OF_MONTH, 1);
        int totalDays = Math.min(s.monthsAhead, 6) * 30; // Wizz: maks. 6 miesięcy, żeby nie wysyłać setek zapytań

        for (String origin : s.origins) {
            JSONObject oc = byIata.get(origin);
            if (oc == null) continue;
            JSONArray conns = oc.optJSONArray("connections");
            if (conns == null) continue;
            int n = Math.min(conns.length(), 40);
            for (int i = 0; i < n; i++) {
                String dest = conns.getJSONObject(i).optString("iata");
                if (dest.isEmpty()) continue;
                List<Fare> outs = new ArrayList<>(), rets = new ArrayList<>();
                for (int off = 0; off < totalDays; off += 40) {
                    Calendar a = (Calendar) start.clone(); a.add(Calendar.DAY_OF_MONTH, off);
                    Calendar b = (Calendar) start.clone(); b.add(Calendar.DAY_OF_MONTH, Math.min(off + 40, totalDays));
                    Calendar br = (Calendar) b.clone(); br.add(Calendar.DAY_OF_MONTH, Math.min(s.maxDays, 2));
                    timetable(base, origin, dest, FareChecker.fmt(a), FareChecker.fmt(b), FareChecker.fmt(br), outs, rets);
                    Thread.sleep(250);
                }
                FareChecker.Deal best = bestCombo(origin, dest, outs, rets, s);
                if (best != null) {
                    JSONObject dc = byIata.get(dest);
                    best.toCity = dc != null ? dc.optString("shortName", dest) : dest;
                    best.country = dc != null ? dc.optString("countryName", "") : "";
                    res.add(best);
                }
            }
        }
        return res;
    }

    static FareChecker.Deal bestCombo(String from, String to, List<Fare> outs, List<Fare> rets, Settings s) {
        FareChecker.Deal best = null;
        for (Fare o : outs) {
            for (Fare r : rets) {
                int nights = daysBetween(o.date, r.date);
                if (nights < s.minDays || nights > s.maxDays) continue;
                double total = o.pln + r.pln;
                if (total > s.maxPrice) continue;
                if (best == null || total < best.price) {
                    best = new FareChecker.Deal();
                    best.airline = "Wizz Air";
                    best.from = from; best.to = to; best.out = o.date; best.in = r.date;
                    best.price = total; best.outPrice = o.pln; best.inPrice = r.pln;
                }
            }
        }
        return best;
    }

    static int daysBetween(String a, String b) {
        try {
            java.text.SimpleDateFormat f = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US);
            return (int) Math.round((f.parse(b).getTime() - f.parse(a).getTime()) / 86400000.0);
        } catch (Exception e) { return -1; }
    }

    static void timetable(String base, String from, String to, String d1, String d2, String d2ret,
                          List<Fare> outs, List<Fare> rets) throws Exception {
        JSONObject body = new JSONObject();
        JSONArray fl = new JSONArray();
        JSONObject o = new JSONObject();
        o.put("departureStation", from); o.put("arrivalStation", to); o.put("from", d1); o.put("to", d2);
        JSONObject r = new JSONObject();
        r.put("departureStation", to); r.put("arrivalStation", from); r.put("from", d1); r.put("to", d2ret);
        fl.put(o); fl.put(r);
        body.put("flightList", fl);
        body.put("priceType", "regular");
        body.put("adultCount", 1); body.put("childCount", 0); body.put("infantCount", 0);
        JSONObject resp = new JSONObject(http(base + "/Api/search/timetable", body.toString()));
        collect(resp.optJSONArray("outboundFlights"), outs);
        collect(resp.optJSONArray("returnFlights"), rets);
    }

    static void collect(JSONArray arr, List<Fare> into) {
        if (arr == null) return;
        for (int i = 0; i < arr.length(); i++) {
            JSONObject f = arr.optJSONObject(i);
            if (f == null || !"price".equals(f.optString("priceType"))) continue;
            JSONObject p = f.optJSONObject("price");
            if (p == null) continue;
            Double rate = RATES.get(p.optString("currencyCode", "PLN"));
            double amount = p.optDouble("amount", -1);
            String date = f.optString("departureDate", "");
            if (rate == null || amount <= 0 || date.length() < 10) continue;
            into.add(new Fare(date.substring(0, 10), amount * rate));
        }
    }

    static String baseUrl() throws Exception {
        String t = http("https://wizzair.com/buildnumber", null).trim();
        int i = t.indexOf("https://");
        if (i < 0) throw new Exception("Wizz Air: nie znaleziono adresu wyszukiwarki");
        String u = t.substring(i).trim();
        int sp = u.indexOf(' ');
        if (sp > 0) u = u.substring(0, sp);
        return u.endsWith("/") ? u.substring(0, u.length() - 1) : u;
    }

    static String http(String url, String postBody) throws Exception {
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        con.setConnectTimeout(15000);
        con.setReadTimeout(20000);
        con.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36");
        con.setRequestProperty("Accept", "application/json, text/plain, */*");
        con.setRequestProperty("Origin", "https://wizzair.com");
        con.setRequestProperty("Referer", "https://wizzair.com/pl-pl");
        if (postBody != null) {
            con.setRequestMethod("POST");
            con.setDoOutput(true);
            con.setRequestProperty("Content-Type", "application/json");
            try (OutputStream os = con.getOutputStream()) { os.write(postBody.getBytes("UTF-8")); }
        }
        int code = con.getResponseCode();
        if (code != 200) throw new Exception("Wizz Air odpowiedział kodem " + code);
        StringBuilder sb = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(con.getInputStream(), "UTF-8"))) {
            String line;
            while ((line = r.readLine()) != null) sb.append(line).append('\n');
        }
        return sb.toString();
    }
}
