const UA='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36';
for(const id of ['537726','537957']){
const h=await (await fetch((id==='537726'?'https://blix.pl/sklep/kaufland/gazetka/':'https://blix.pl/sklep/biedronka/gazetka/')+id+'/',{headers:{'User-Agent':UA}})).text();
const all=[...h.matchAll(/data-name="([^"]*)" data-price="([^"]*)"/g)];
console.log('=====',id,'offers',all.length,'withprice',all.filter(m=>m[2]).length);
console.log(all.slice(0,40).map(m=>m[1]+'='+m[2]).join(' | '));
const i=h.indexOf('data-price="',h.search(/data-price="\d/));console.log('=====BLOCK');console.log(h.slice(i-200,i+2200).replace(/\s+/g,' '));}
