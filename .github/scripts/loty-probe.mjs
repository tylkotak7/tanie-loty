// Jednorazowy test możliwości API Ryanair (wynik w docs/loty/probe.json)
import { writeFileSync, mkdirSync } from "node:fs";
mkdirSync("docs/loty", { recursive: true });
const H = { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/120 Safari/537.36" };
const day = n => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0,10); };
const out = {};
async function t(name, url) {
  try { const r = await fetch(url, { headers: H }); const x = await r.text(); out[name] = { status: r.status, len: x.length, head: x.slice(0, 400) };
    try { const j = JSON.parse(x); if (j.fares) out[name].fares = j.fares.length; if (Array.isArray(j)) out[name].items = j.length; if (j.size!==undefined) out[name].size=j.size; } catch {}
  } catch (e) { out[name] = { error: e.message }; }
}
const base = `https://services-api.ryanair.com/farfnd/v4/roundTripFares?departureAirportIataCode=POZ&outboundDepartureDateFrom=${day(1)}&outboundDepartureDateTo=${day(90)}&inboundDepartureDateFrom=${day(1)}&inboundDepartureDateTo=${day(100)}&durationFrom=1&durationTo=14&currency=PLN&market=pl-pl&language=pl`;
await t("nolimit", base);
for (const l of [10, 16, 20, 25, 50]) await t("limit" + l, base + "&limit=" + l);
await t("offset16", base + "&limit=16&offset=16");
await t("arrival_BCN", base + "&arrivalAirportIataCode=BCN");
await t("arrivalCountry_es", base + "&arrivalCountryCode=es");
await t("routes_view", "https://www.ryanair.com/api/views/locate/searchWidget/routes/pl/airport/POZ");
await t("routes_locate", "https://www.ryanair.com/api/locate/v1/autocomplete/routes?arrivalPhrase=&departurePhrase=POZ&market=pl-pl");
await t("airports_active", "https://www.ryanair.com/api/views/locate/5/airports/pl/active");
writeFileSync("docs/loty/probe.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
