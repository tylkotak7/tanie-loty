// Pobiera dane do apki "Dziś w Wągrowcu" i zapisuje docs/wagrowiec/data.json.
// Każda sekcja jest niezależna: jeśli źródło nie odpowie, zostają poprzednie dane.
import { readFile, writeFile } from 'node:fs/promises';

const OUT = 'docs/wagrowiec/data.json';
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36';
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });

let old = {};
try { old = JSON.parse(await readFile(OUT, 'utf8')); } catch {}
const data = { ...old };

async function get(url, json = false) {
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': json ? 'application/json' : 'text/html,application/xml,*/*', 'Accept-Language': 'pl-PL,pl;q=0.9' },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(url + ' HTTP ' + r.status);
  return json ? r.json() : r.text();
}
const text = html => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
const num = s => parseFloat(String(s).replace(',', '.'));

// ---------- Ceny paliw ----------
function findPrice(t, labels, lo, hi) {
  for (const lab of labels) {
    const re = new RegExp(lab + '[^0-9]{0,60}?(\\d[,.]\\d{2})', 'gi');
    let m;
    while ((m = re.exec(t))) { const v = num(m[1]); if (v >= lo && v <= hi) return v; }
  }
  return null;
}
const FUEL_SOURCES = [
  ['autocentrum.pl, woj. wielkopolskie', 'https://www.autocentrum.pl/paliwa/ceny-paliw/wielkopolskie/'],
  ['autocentrum.pl, Polska', 'https://www.autocentrum.pl/paliwa/ceny-paliw/'],
  ['e-petrol.pl, Polska', 'https://www.e-petrol.pl/notowania/rynek-krajowy/ceny-stacje-paliw'],
];
async function fuel() {
  for (const [src, url] of FUEL_SOURCES) {
    try {
      const t = text(await get(url));
      const pb95 = findPrice(t, ['Pb\\s?95', 'benzyna 95', '(?:^|\\s)95(?=\\s)'], 4, 10);
      const on = findPrice(t, ['\\bON\\b', 'olej napędowy', 'diesel'], 4, 10);
      const lpg = findPrice(t, ['LPG', 'autogaz'], 1.5, 5);
      if (pb95 && on && lpg) return { src, pb95, on, lpg };
      console.log('paliwa: niepełne dane z', src, { pb95, on, lpg });
    } catch (e) { console.log('paliwa:', e.message); }
  }
  return null;
}

// ---------- Lotto (wynikilotto.net.pl; lotto.pl blokuje serwery GitHuba) ----------
const GAMES = [['lotto', 'Lotto'], ['lotto-plus', 'Lotto Plus'], ['mini-lotto', 'Mini Lotto'], ['eurojackpot', 'Eurojackpot'], ['ekstra-pensja', 'Ekstra Pensja']];
async function lastDraw(slug) {
  const h = await get('https://www.wynikilotto.net.pl/' + slug + '/wyniki/');
  const m = h.match(/<tbody>\s*<tr>\s*<td>\d+<\/td>\s*<td>(\d{2})\.(\d{2})\.(\d{4})<\/td>\s*<td>([\s\S]*?)<\/td>/);
  if (!m) throw new Error('lotto: brak tabeli ' + slug);
  const [main, extra = ''] = m[4].replace(/<[^>]+>/g, '').split('+');
  const nums = s => (s.match(/\d+/g) || []).map(Number);
  return { date: `${m[3]}-${m[2]}-${m[1]}`, main: nums(main), extra: nums(extra) };
}
async function lotto() {
  const res = await Promise.allSettled(GAMES.map(([slug]) => lastDraw(slug)));
  res.forEach(r => r.reason && console.log(r.reason.message));
  const L = res[0].value;
  if (!L || L.main.length !== 6) return null;
  const games = GAMES.map(([, name], i) => res[i].value && [name, res[i].value.main, res[i].value.extra]).filter(Boolean);
  return { date: L.date, games };
}

// ---------- Wiadomości ----------
async function news() {
  const xml = await get('https://news.google.com/rss/search?q=W%C4%85growiec&hl=pl&gl=PL&ceid=PL:pl');
  const dec = s => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const f = tag => { const x = m[1].match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>')); return x ? dec(x[1]) : ''; };
    const s = f('source'), d = new Date(f('pubDate'));
    let t = f('title'); if (s && t.endsWith(' - ' + s)) t = t.slice(0, -(s.length + 3));
    return { t, l: f('link'), s, d: isNaN(d) ? '' : d.toISOString().slice(0, 10) };
  }).filter(x => x.t && x.l).sort((a, b) => (b.d > a.d ? 1 : -1));
  return items.length ? items.slice(0, 8) : null;
}

const [f, l, n] = await Promise.allSettled([fuel(), lotto(), news()]);
if (f.value) {
  const hist = (old.fuel?.hist || []).filter(h => h.d !== today);
  hist.push({ d: today, pb95: f.value.pb95, on: f.value.on, lpg: f.value.lpg });
  data.fuel = { ...f.value, date: today, hist: hist.slice(-120) };
}
if (l.value) data.lotto = l.value;
if (n.value) data.news = n.value;
console.log('paliwa', !!f.value, '| lotto', !!l.value, '| wiadomości', !!n.value, n.reason?.message || '');

const strip = o => JSON.stringify({ ...o, updated: undefined });
if (strip(data) !== strip(old)) {
  data.updated = new Date().toISOString();
  await writeFile(OUT, JSON.stringify(data, null, 1) + '\n');
  console.log('zapisano', OUT);
} else console.log('bez zmian');
