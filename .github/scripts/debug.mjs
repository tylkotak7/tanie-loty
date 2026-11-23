const UA='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36';
const text=h=>h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
async function g(u){const r=await fetch(u,{headers:{'User-Agent':UA,'Accept-Language':'pl'}});return [r.status,await r.text()]}
let [st,h]=await g('https://www.bilety24.pl/kino/organizator/miejski-dom-kultury-623');
let i=h.indexOf('?id=1020430');console.log('=====B24 RAW');console.log(h.slice(i-2500,i+600).replace(/\s+/g,' '));
[st,h]=await g('https://mdkwagrowiec.pl/kino/');console.log('=====MDK',st,h.length);let t=text(h);i=t.search(/Repertuar|Grudzień|Listopad/);console.log(t.slice(i,i+2500));
i=h.indexOf('wydarzenie/?id=');console.log('=====MDKRAW');console.log(h.slice(i-1500,i+800).replace(/\s+/g,' '));
for(const u of ['https://www.ding.pl/kaufland','https://blix.pl/sklep/kaufland/','https://www.gazetkapromocyjna.com.pl/kaufland/','https://www.promoceny.pl/kaufland/','https://kaufland.okazjum.pl/']){try{[st,h]=await g(u);t=text(h);i=Math.max(0,t.search(/\d+,\d\d ?zł/));console.log('=====',u,st,h.length);console.log(t.slice(Math.max(0,i-600),i+900))}catch(e){console.log(u,e.message)}}
