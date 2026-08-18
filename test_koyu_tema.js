// Koyu tema kapsam testi.
// Modulun renklerinin cogu JS'in urettigi satir ici style="" icinde; koyu tema
// bunlari nitelik secicileriyle eziyor. Bu test, uygulamada KULLANILAN her ACIK
// zemin renginin koyu tema blogunda karsiligi olup olmadigini dogrular.
// Yeni bir acik yuzey eklenip koyu karsiligi unutulursa test patlar.
//   calistir:  node test_koyu_tema.js
const fs = require('fs'), assert = require('assert');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

// 1) Koyu tema blogunu al
const b0 = html.indexOf('<style id="koyuTema">');
assert(b0 > 0, 'koyuTema blogu bulunamadi');
const koyu = html.slice(b0, html.indexOf('</style>', b0)).toLowerCase();

// 2) Uygulamadaki satir ici zemin renklerini topla (koyu tema blogu haric)
const govde = html.slice(0, b0) + html.slice(html.indexOf('</style>', b0));
const zeminler = new Map();               // renk -> kac kez
for (const m of govde.matchAll(/style="([^"]*)"/g)) {
  for (const g of m[1].matchAll(/background(?:-color)?\s*:\s*([^;]+)/gi)) {
    const c = g[1].trim().toLowerCase();
    if (/^(transparent|none|inherit|initial|unset)$/.test(c)) continue;
    if (c.startsWith('linear-gradient') || c.startsWith('url(')) continue;
    zeminler.set(c, (zeminler.get(c) || 0) + 1);
  }
}

// 3) Renk "acik" mi? (kisa/uzun hex ve isimli beyaz)
function parlaklik(c) {
  if (c === 'white') return 1;
  let m = c.match(/^#([0-9a-f]{3})$/);
  if (m) c = '#' + [...m[1]].map(x => x + x).join('');
  m = c.match(/^#([0-9a-f]{6})$/);
  if (!m) return null;                     // rgb()/isimli diger renkler: olcme
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b2 = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b2) / 255;
}

// 4) Her acik renk koyu temada geciyor mu?
const eksik = [];
let kontrol = 0;
for (const [renk, adet] of zeminler) {
  const p = parlaklik(renk);
  if (p === null || p < 0.80) continue;    // yalnizca ACIK yuzeyler koyu karsilik ister
  kontrol++;
  const kisa = renk.replace(/^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/, '#$1$2$3');
  const gecer = koyu.includes(renk) || koyu.includes(kisa) ||
                (renk === 'white' && koyu.includes('background: white')) ||
                (/^#f{3,6}$/.test(renk) && koyu.includes('#fff'));
  if (!gecer) eksik.push(renk + '  (' + adet + ' yerde)');
}

console.log('satir ici zemin rengi cesidi :', zeminler.size);
console.log('acik zemin (koyu karsilik gerekli):', kontrol);
if (eksik.length) {
  console.log('\nKOYU TEMADA KARSILIGI OLMAYAN ACIK ZEMINLER:');
  eksik.forEach(x => console.log('  ✘ ' + x));
}
assert.strictEqual(eksik.length, 0, eksik.length + ' acik zemin rengi koyu temada ezilmiyor');

// 4b) <style> BLOKLARINDA tanimli acik yuzeyler: nitelik secicileri bunlari
//     YAKALAMAZ (onlar yalniz satir ici style="" icin calisir), bu yuzden
//     gercek sinif/eleman adiyla eslenmeleri gerekir. Beyaz kalan kontrol
//     paneli tam olarak bu gozden kacmisti.
const govdeCss = [...govde.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(x => x[1]).join('\n');
const eksikSecici = [];
for (const m of govdeCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const sec = m[1].trim(), gov = m[2];
  if (!/background(-color)?\s*:\s*(#fff|#ffffff|white|#f8f9fa|#f5f5f5|#fafafa)/i.test(gov)) continue;
  const ana = sec.split(',')[0].trim().split(':')[0].trim();
  if (ana && !koyu.includes(ana.toLowerCase())) eksikSecici.push(ana);
}
if (eksikSecici.length) {
  console.log('\nKOYU TEMADA KARSILIGI OLMAYAN <style> SECICILERI:');
  [...new Set(eksikSecici)].forEach(x => console.log('  ✘ ' + x));
}
assert.strictEqual(eksikSecici.length, 0,
  [...new Set(eksikSecici)].length + ' acik yuzey <style> icinde tanimli ve koyu temada ezilmiyor');

// 5) Temel yuzeylerin kurali var mi (yapisal kontrol)
['body', '.modal-dialog', 'tbody tr', 'input', 'select'].forEach(sec => {
  assert.ok(koyu.includes(sec), 'koyu temada "' + sec + '" kurali yok');
});

// 6) Tema dinleyicisi: uc kaynagi da dinlemeli (acilis, portal mesaji, storage)
const dinle = html.slice(html.indexOf('koyuTemaDinle'), html.indexOf('koyuTemaDinle') + 2000);
assert.ok(dinle.includes("'message'"), 'portal postMessage dinlenmiyor');
assert.ok(dinle.includes("'storage'"), 'storage olayi dinlenmiyor');
assert.ok(dinle.includes('erp_portal_theme'), 'ortak tema anahtari okunmuyor');

console.log('\nOK koyu tema: tum acik zeminlerin karsiligi var, temel yuzey kurallari ve tema dinleyicisi yerinde');
