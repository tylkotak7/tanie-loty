package pl.lotypoz;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

/** Pobiera najtańsze loty w obie strony z publicznej wyszukiwarki taryf Ryanair. */
public class FareChecker {

    public static class Deal {
        public String from, to, toCity, country, out, in;
        public double price;

        public String key() { return from + "-" + to + "-" + out + "-" + in; }

        public String bookUrl() {
            return "https://www.ryanair.com/pl/pl/trip/flights/select?adults=1&teens=0&children=0&infants=0"
                    + "&dateOut=" + out + "&dateIn=" + in
                    + "&isConnectedFlight=false&isReturn=true&discount=0&promoCode="
                    + "&originIata=" + from + "&destinationIata=" + to;
        }

        public JSONObject toJson() {
            JSONObject o = new JSONObject();
            try {
                o.put("from", from); o.put("to", to); o.put("toCity", toCity); o.put("country", country);
                o.put("out", out); o.put("in", in); o.put("price", Math.round(price)); o.put("url", bookUrl());
            } catch (Exception ignored) {}
            return o;
        }
    }

    static String fmt(Calendar c) {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(c.getTime());
    }

    public static List<Deal> search(Settings s) throws Exception {
        List<Deal> all = new ArrayList<>();
        Exception last = null;
        for (String o : s.origins) {
            try { all.addAll(searchOrigin(o, s)); } catch (Exception e) { last = e; }
        }
        if (all.isEmpty() && last != null) throw last;
        Collections.sort(all, (a, b) -> Double.compare(a.price, b.price));
        return all;
    }

    static List<Deal> searchOrigin(String origin, Settings s) throws Exception {
        Calendar c = Calendar.getInstance();
        c.add(Calendar.DAY_OF_MONTH, 1);
        String outFrom = fmt(c);
        Calendar c2 = (Calendar) c.clone();
        c2.add(Calendar.DAY_OF_MONTH, s.monthsAhead * 30);
        String outTo = fmt(c2);
        Calendar c3 = (Calendar) c2.clone();
        c3.add(Calendar.DAY_OF_MONTH, s.maxDays);
        String inTo = fmt(c3);

        String url = "https://services-api.ryanair.com/farfnd/v4/roundTripFares"
                + "?departureAirportIataCode=" + origin
                + "&outboundDepartureDateFrom=" + outFrom + "&outboundDepartureDateTo=" + outTo
                + "&inboundDepartureDateFrom=" + outFrom + "&inboundDepartureDateTo=" + inTo
                + "&durationFrom=" + s.minDays + "&durationTo=" + s.maxDays
                + "&priceValueTo=" + s.maxPrice
                + "&currency=PLN&market=pl-pl&language=pl&limit=100&offset=0";

        JSONObject root = new JSONObject(get(url));
        JSONArray fares = root.optJSONArray("fares");
        List<Deal> res = new ArrayList<>();
        if (fares == null) return res;
        for (int i = 0; i < fares.length(); i++) {
            JSONObject f = fares.getJSONObject(i);
            JSONObject ob = f.optJSONObject("outbound");
            JSONObject ib = f.optJSONObject("inbound");
            if (ob == null || ib == null) continue;
            JSONObject arr = ob.optJSONObject("arrivalAirport");
            Deal d = new Deal();
            d.from = origin;
            d.to = arr != null ? arr.optString("iataCode", "?") : "?";
            JSONObject city = arr != null ? arr.optJSONObject("city") : null;
            d.toCity = city != null ? city.optString("name", d.to) : (arr != null ? arr.optString("name", d.to) : d.to);
            d.country = arr != null ? arr.optString("countryName", "") : "";
            d.out = ob.optString("departureDate", "").length() >= 10 ? ob.optString("departureDate").substring(0, 10) : "";
            d.in = ib.optString("departureDate", "").length() >= 10 ? ib.optString("departureDate").substring(0, 10) : "";
            double p = -1;
            JSONObject sum = f.optJSONObject("summary");
            if (sum != null && sum.optJSONObject("price") != null) p = sum.optJSONObject("price").optDouble("value", -1);
            if (p < 0) {
                double a = ob.optJSONObject("price") != null ? ob.optJSONObject("price").optDouble("value", 0) : 0;
                double b = ib.optJSONObject("price") != null ? ib.optJSONObject("price").optDouble("value", 0) : 0;
                p = a + b;
            }
            d.price = p;
            if (p > 0 && p <= s.maxPrice && !d.out.isEmpty()) res.add(d);
        }
        return res;
    }

    static String get(String u) throws Exception {
        HttpURLConnection con = (HttpURLConnection) new URL(u).openConnection();
        con.setConnectTimeout(15000);
        con.setReadTimeout(20000);
        con.setRequestProperty("Accept", "application/json");
        con.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36");
        int code = con.getResponseCode();
        if (code != 200) throw new Exception("Ryanair odpowiedział kodem " + code);
        StringBuilder sb = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(con.getInputStream(), "UTF-8"))) {
            String line;
            while ((line = r.readLine()) != null) sb.append(line);
        }
        return sb.toString();
    }
}
