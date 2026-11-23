const UA='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36';
async function g(u){const r=await fetch(u,{headers:{'User-Agent':UA,'Accept-Language':'pl'}});return await r.text()}
let h=await g('https://blix.pl/sklep/kaufland/');
let i=h.indexOf('href="https://blix.pl/sklep/kaufland/gazetka/');console.log('=====LEAFCARD');console.log(h.slice(i-200,i+2200).replace(/\s+/g,' '));
const P=(x)=>[...x.matchAll(/<span class="product__name">([^<]+)<\/span>\s*<span class="product__price">\s*([^<]+?)\s*<\/span>/g)].map(m=>m[1].trim()+' = '+m[2].replace(/&nbsp;/g,' '));
console.log('=====SHOPPRODS',P(h).length,P(h).join(' | '));
for(const id of ['537945','537726','537942','537390']){const l=await g('https://blix.pl/sklep/kaufland/gazetka/'+id+'/');const t=(l.match(/<title>([^<]*)/)||[])[1];const ps=P(l);console.log('=====LEAF',id,t,'prods',ps.length);console.log(ps.slice(0,40).join(' | '));const d=l.match(/\d{2}\.\d{2}(?:\.\d{4})?\s*-\s*\d{2}\.\d{2}(?:\.\d{4})?/);console.log('dates',d&&d[0]);const k=l.indexOf('product__name');if(k>0&&!ps.length)console.log(l.slice(k-800,k+400).replace(/\s+/g,' '))}
