const UA='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36';
async function g(u){const r=await fetch(u,{headers:{'User-Agent':UA,'Accept-Language':'pl'}});return await r.text()}
let h=await g('https://www.bilety24.pl/kino/organizator/miejski-dom-kultury-623');
const ms=[...h.matchAll(/href="(\/kino\/623-[^"]+)"\s+title="Film: (.+?) - (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) - W/g)];
console.log('=====B24 count',ms.length);console.log(ms.slice(0,60).map(m=>m[3]+' '+m[4]+' '+m[2]).join(' | '));
h=await g('https://blix.pl/sklep/kaufland/');
let i=h.indexOf('Hot Wheels');console.log('=====BLIXPROD');console.log(h.slice(i-1500,i+500).replace(/\s+/g,' '));
i=h.indexOf('Zobacz aktualna');console.log('=====BLIXLEAF');console.log(h.slice(i-2500,i+300).replace(/\s+/g,' '));
const L=[...new Set([...h.matchAll(/href="([^"]*kaufland[^"]*)"/gi)].map(m=>m[1]))];console.log('=====BLIXLINKS');console.log(L.slice(0,40).join(' '));
