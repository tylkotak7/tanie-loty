const UA='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36';
const text=h=>h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
const U=['https://www.wagrowiec.eu/pl/dla-turysty/kultura/repertuar-kina','https://www.bilety24.pl/kino/organizator/miejski-dom-kultury-623','https://www.mdkwagrowiec.pl/','https://www.kaufland.pl/oferta/aktualny-tydzien.html','https://www.kaufland.pl/oferta/przeglad.html','https://www.kaufland.pl/'];
for(const u of U){try{const r=await fetch(u,{headers:{'User-Agent':UA,'Accept-Language':'pl'},redirect:'follow'});const h=await r.text();const t=text(h);
console.log('\n=====',u,'->',r.url,r.status,h.length);
const links=[...new Set([...h.matchAll(/href="([^"]*(?:oferta|repertuar|kino|film|wydarzen|event|seans)[^"]*)"/gi)].map(m=>m[1]))].slice(0,25);console.log('LINKS',links.join(' '));
const i=Math.max(0,t.search(/repertuar|seans|Oferta|Promocj|zł/i));console.log('TEXT',t.slice(i,i+1800));
const j=h.search(/__NEXT_DATA__|application\/ld\+json|window\.__/);if(j>0)console.log('JSONHINT',h.slice(j,j+400))}catch(e){console.log(u,e.message)}}
