const UA='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36';
const text=h=>h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
for (const u of ['https://www.autocentrum.pl/paliwa/ceny-paliw/wielkopolskie/','https://www.wynikilotto.net.pl/lotto/wyniki/','https://megalotto.pl/wyniki/lotto','https://www.lotto.pl/lotto/wyniki-i-wygrane','https://www.wynikilotto.net.pl/eurojackpot/wyniki/','https://www.wynikilotto.net.pl/mini-lotto/wyniki/','https://www.wynikilotto.net.pl/ekstra-pensja/wyniki/']){
 try{const r=await fetch(u,{headers:{'User-Agent':UA,'Accept-Language':'pl'}});const t=text(await r.text());console.log('\n=====',u,r.status,t.length);
 const i=Math.max(0,t.search(/Pb ?95|Wyniki|losowani/i));console.log(t.slice(i,i+1500))}catch(e){console.log(u,e.message)}}
