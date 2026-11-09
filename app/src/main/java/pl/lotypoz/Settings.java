package pl.lotypoz;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

public class Settings {
    public List<String> origins = new ArrayList<>();
    public int maxPrice = 250;
    public int minDays = 2;
    public int maxDays = 7;
    public int monthsAhead = 3;
    public int everyHours = 6;
    public boolean enabled = false;

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("tanie_loty", Context.MODE_PRIVATE);
    }

    public static Settings load(Context c) {
        String s = prefs(c).getString("settings", null);
        Settings st = s == null ? null : fromJson(s);
        if (st == null) { st = new Settings(); st.origins.add("POZ"); st.origins.add("WRO"); }
        return st;
    }

    public void save(Context c) {
        prefs(c).edit().putString("settings", toJson().toString()).apply();
    }

    public static Settings fromJson(String json) {
        try {
            JSONObject o = new JSONObject(json);
            Settings s = new Settings();
            JSONArray a = o.optJSONArray("origins");
            if (a != null) for (int i = 0; i < a.length(); i++) s.origins.add(a.getString(i));
            if (s.origins.isEmpty()) s.origins.add("POZ");
            s.maxPrice = clamp(o.optInt("maxPrice", 250), 50, 3000);
            s.minDays = clamp(o.optInt("minDays", 2), 1, 30);
            s.maxDays = clamp(o.optInt("maxDays", 7), s.minDays, 30);
            s.monthsAhead = clamp(o.optInt("monthsAhead", 3), 1, 6);
            s.everyHours = clamp(o.optInt("everyHours", 6), 1, 24);
            s.enabled = o.optBoolean("enabled", false);
            return s;
        } catch (Exception e) {
            return null;
        }
    }

    public JSONObject toJson() {
        JSONObject o = new JSONObject();
        try {
            JSONArray a = new JSONArray();
            for (String s : origins) a.put(s);
            o.put("origins", a);
            o.put("maxPrice", maxPrice);
            o.put("minDays", minDays);
            o.put("maxDays", maxDays);
            o.put("monthsAhead", monthsAhead);
            o.put("everyHours", everyHours);
            o.put("enabled", enabled);
        } catch (Exception ignored) {}
        return o;
    }

    static int clamp(int v, int lo, int hi) { return Math.max(lo, Math.min(hi, v)); }
}
