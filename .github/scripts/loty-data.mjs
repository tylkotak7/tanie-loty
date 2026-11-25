// Pobiera najtańsze loty Ryanair (tam i z powrotem) z polskich lotnisk – po każdej trasie z osobna –
// i zapisuje je do docs/loty/deals.json dla strony i apki „Tanie loty”.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
mkdirSync("docs/loty", { recursive: true });

const ORIGINS = ["POZ","WRO","WAW","WMI","GDN","KRK","KTW","SZZ","BZG","LCJ","RZE","LUZ"];
// liczba nocy: krótko (2–5 dni) i dłużej (6 dni – 2 tygodnie); okna wylotu: najbliższe 3 mies. i później
const PER_ROUTE = [[[1,4],[1,90]], [[5,14],[1,90]], [[1,4],[90,240]], [[5,14],[90,240]]];
// dodatkowo ogólne zapytania (najtańsze kierunki) dla różnych długości wyjazdu
const BUCKETS = [[1,2],[3,5],[6,8],[9,11],[12,14],[15,21]];
const MAX_PRICE = 1000;
const OUT = "docs/loty/deals.json", STATUS = "docs/loty/status.json";
const H = { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/120 Safari/537.36" };
const day = n => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0,10); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = []; let ok = 0, fail = 0;

async function getJson(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: H });
      if (r.status === 429) { await sleep(5000 * (attempt + 1)); continue; }
      const text = await r.text();
      if (!r.ok) throw new Error("HTTP " + r.status + " " + text.slice(0, 100));
      ok++; return JSON.parse(text);
    } catch (e) {
      if (attempt === 2) { fail++; if (errors.length < 15) errors.push(e.message); return null; }
      await sleep(1500);
    }
  }
  fail++; return null;
}

function faresUrl(origin, [n1, n2], [w1, w2], dest) {
  const q = new URLSearchParams({
    departureAirportIataCode: origin,
    outboundDepartureDateFrom: day(w1), outboundDepartureDateTo: day(w2),
    inboundDepartureDateFrom: day(w1), inboundDepartureDateTo: day(w2 + n2),
    durationFrom: String(n1), durationTo: String(n2),
    priceValueTo: String(MAX_PRICE), currency: "PLN", market: "pl-pl", language: "pl", limit: "20",
  });
  if (dest) q.set("arrivalAirportIataCode", dest);
  return "https://services-api.ryanair.com/farfnd/v4/roundTripFares?" + q;
}

const rows = new Map();
const airports = {};          // kod -> [miasto, kraj]
const routes = {};            // lotnisko wylotu -> [kody]
function addFares(origin, list) {
  for (const f of list || []) {
    const ob = f.outbound, ib = f.inbound;
    if (!ob || !ib) continue;
    const a = ob.arrivalAirport || {};
    const out = (ob.departureDate || "").slice(0,10), inn = (ib.departureDate || "").slice(0,10);
    const op = ob.price?.value ?? 0, ip = ib.price?.value ?? 0;
    const price = Math.round(f.summary?.price?.value ?? (op + ip));
    if (!out || !inn || !price || price > MAX_PRICE) continue;
    const from = origin === "WMI" ? "WAW" : origin;
    const city = a.city?.name || a.name || a.iataCode, country = a.countryName || "";
    airports[a.iataCode] = [city, country];
    const key = `${from}-${a.iataCode}-${out}-${inn}`;
    if (rows.has(key) && rows.get(key)[6] <= price) continue;
    rows.set(key, [from, a.iataCode, city, country, out, inn, price, Math.round(op), Math.round(ip), origin === "WMI" ? "WMI" : ""]);
  }
}

for (const o of ORIGINS) {
  // 1) lista tras z lotniska
  const r = await getJson(`https://www.ryanair.com/api/views/locate/searchWidget/routes/pl/airport/${o}`);
  const dests = [];
  for (const x of r || []) {
    const a = x.arrivalAirport; if (!a?.code) continue;
    dests.push(a.code);
    if (!airports[a.code]) airports[a.code] = [a.city?.name || a.name || a.code, a.country?.name || ""];
  }
  const from = o === "WMI" ? "WAW" : o;
  routes[from] = [...new Set([...(routes[from] || []), ...dests])];
  // 2) ogólne zapytania – najtańsze kierunki dla każdej długości
  for (const b of BUCKETS) for (const w of [[1,90],[90,240]]) {
    const j = await getJson(faresUrl(o, b, w)); if (j) addFares(o, j.fares); await sleep(150);
  }
  // 3) każda trasa z osobna
  for (const d of dests) for (const [b, w] of PER_ROUTE) {
    const j = await getJson(faresUrl(o, b, w, d)); if (j) addFares(o, j.fares); await sleep(120);
  }
  console.log(`${o}: tras ${dests.length}, lotów razem ${rows.size}`);
}

console.log(`zapytania ok: ${ok}, błędy: ${fail}, lotów: ${rows.size}`);
writeFileSync(STATUS, JSON.stringify({ time: new Date().toISOString(), ok, fail, flights: rows.size, destinations: Object.keys(airports).length, errors }, null, 1));
if (rows.size === 0) { console.log("Brak danych – zostawiam poprzedni plik."); process.exit(0); }
const data = {
  updated: new Date().toISOString(),
  source: "Ryanair",
  cols: ["from","to","city","country","out","in","price","outPrice","inPrice","airport"],
  rows: [...rows.values()].sort((a, b) => a[6] - b[6]),
  airports, routes,
};
writeFileSync(OUT, JSON.stringify(data));
console.log(`Zapisano ${OUT} (${(JSON.stringify(data).length/1024).toFixed(0)} KB)`);
