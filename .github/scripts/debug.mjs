const UA='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36';
const h=await (await fetch('https://blix.pl/sklep/kaufland/gazetka/537726/?pageNumber=2',{headers:{'User-Agent':UA}})).text();
for(const k of ['Szynka wieprzowa bez kości','"price"','data-price','basePrice','oldPrice','regularPrice','"products"','offer']){let i=h.indexOf(k),n=h.split(k).length-1;console.log('=====',k,'count',n);if(i>0)console.log(h.slice(Math.max(0,i-900),i+900).replace(/\s+/g,' '))}
