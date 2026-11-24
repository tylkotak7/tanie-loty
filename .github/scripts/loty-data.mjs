// Pobiera najtańsze loty Ryanair (tam i z powrotem) z polskich lotnisk
// i zapisuje je do docs/loty/deals.json dla strony i apki „Tanie loty”.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
mkdirSync("docs/loty", { recursive: true });

const ORIGINS = ["POZ","WRO","WAW","WMI","GDN","KRK","KTW","SZZ","BZG","LCJ","RZE","LUZ"];
// przedziały liczby nocy: od 2 dni (1 noc) do 2 tygodni i dłużej
const BUCKETS = [[1,2],[3,5],[6,8],[9,11],[12,14],[15,21]];
// okna wylotu (dni od dziś): najbliższe 3 miesiące i później
const WINDOWS = [[1,90],[90,240]];
const MAX_PRICE = 1000;
const OUT = "docs/loty/deals.json";
const STATUS = "docs/loty/status.json";
const errors = [];
let sample = "";

const day = n => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0,10); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fares(origin, [w1, w2], [n1, n2]) {
  const q = new URLSearchParams({
    departureAirportIataCode: origin,
    outboundDepartureDateFrom: day(w1), outboundDepartureDateTo: day(w2),
    inboundDepartureDateFrom: day(w1), inboundDepartureDateTo: day(w2 + n2),
    durationFrom: String(n1), durationTo: String(n2),
    priceValueTo: String(MAX_PRICE), currency: "PLN", market: "pl-pl", language: "pl",
  });
  const url = "https://services-api.ryanair.com/farfnd/v4/roundTripFares?" + q;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, { headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/120 Safari/537.36" } });
      const text = await r.text();
      if (!sample) sample = `${r.status} ${text.slice(0, 300)}`;
      if (!r.ok) throw new Error("HTTP " + r.status + " " + text.slice(0, 120));
      const j = JSON.parse(text);
      return j.fares || [];
    } catch (e) {
      if (attempt === 1) { console.log(`! ${origin} ${w1}-${w2} ${n1}-${n2}: ${e.message}`); if (errors.length < 10) errors.push(`${origin}: ${e.message}`); return null; }
      await sleep(2000);
    }
  }
}

const rows = new Map();
let ok = 0, fail = 0;
for (const o of ORIGINS) {
  for (const w of WINDOWS) for (const b of BUCKETS) {
    const list = await fares(o, w, b);
    if (list === null) { fail++; continue; }
    ok++;
    for (const f of list) {
      const ob = f.outbound, ib = f.inbound;
      if (!ob || !ib) continue;
      const a = ob.arrivalAirport || {};
      const out = (ob.departureDate || "").slice(0,10), inn = (ib.departureDate || "").slice(0,10);
      const op = ob.price?.value ?? 0, ip = ib.price?.value ?? 0;
      const price = Math.round(f.summary?.price?.value ?? (op + ip));
      if (!out || !inn || !price || price > MAX_PRICE) continue;
      const from = o === "WMI" ? "WAW" : o;   // Modlin pokazujemy jako Warszawę
      const key = `${from}-${a.iataCode}-${out}-${inn}`;
      if (rows.has(key) && rows.get(key)[6] <= price) continue;
      rows.set(key, [from, a.iataCode, a.city?.name || a.name || a.iataCode, a.countryName || "", out, inn, price, Math.round(op), Math.round(ip), o === "WMI" ? "WMI" : ""]);
    }
    await sleep(350);
  }
}
console.log(`zapytania ok: ${ok}, błędy: ${fail}, lotów: ${rows.size}`);
writeFileSync(STATUS, JSON.stringify({ time: new Date().toISOString(), ok, fail, flights: rows.size, errors, sample }, null, 1));
if (rows.size === 0) {
  console.log("Brak danych – zostawiam poprzedni plik.");
  process.exit(0);
}
const data = {
  updated: new Date().toISOString(),
  source: "Ryanair",
  cols: ["from","to","city","country","out","in","price","outPrice","inPrice","airport"],
  rows: [...rows.values()].sort((a, b) => a[6] - b[6]),
};
const json = JSON.stringify(data);
if (existsSync(OUT)) {
  const prev = JSON.parse(readFileSync(OUT, "utf8"));
  if (JSON.stringify(prev.rows) === JSON.stringify(data.rows)) { console.log("Bez zmian."); process.exit(0); }
}
writeFileSync(OUT, json);
console.log(`Zapisano ${OUT} (${(json.length/1024).toFixed(0)} KB)`);
