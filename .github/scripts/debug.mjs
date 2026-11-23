const UA='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36';
for (const u of ['https://www.wynikilotto.net.pl/lotto/wyniki/','https://www.wynikilotto.net.pl/eurojackpot/wyniki/']){
 const h=await (await fetch(u,{headers:{'User-Agent':UA}})).text();
 const i=h.indexOf('Statystyki automatyczne');const j=h.indexOf('<table',i);
 console.log('=====',u);console.log(h.slice(j,j+3500).replace(/\s+/g,' '));}
