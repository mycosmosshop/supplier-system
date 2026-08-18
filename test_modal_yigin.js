// Ust uste acilan modallerin siralamasi: en son acilan en ustte olmali.
// Yigin yoneticisi HTML'den ALINIR (kopya degil) ve jsdom'da calistirilir.
//   calistir:  node test_modal_yigin.js
const fs = require('fs'), assert = require('assert');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

const bas = html.indexOf('(function modalYigin(){');
assert(bas > 0, 'modalYigin bulunamadi');
const son = html.indexOf('})();', bas);
const kod = html.slice(bas, son + 5);

const dom = new JSDOM(`<!doctype html><body>
  <div id="a" class="modal-overlay" style="display:none"></div>
  <div id="b" class="modal-overlay" style="display:none"></div>
  <div id="c" class="modal-overlay" style="display:none"></div>
</body>`, { runScripts: 'outside-only' });
const { window } = dom;
const $ = id => window.document.getElementById(id);
const z = id => +$(id).style.zIndex || 0;
const ac = id => { $(id).style.display = 'flex'; };
const kapat = id => { $(id).style.display = 'none'; };
// MutationObserver eşzamansız — her adımdan sonra kuyruğu boşalt
const bekle = () => new Promise(r => window.setTimeout(r, 0));

window.eval(kod);

(async () => {
  await bekle();
  assert.strictEqual(z('a'), 0, 'kapali modal z-index almamali');

  ac('a'); await bekle();
  const za = z('a');
  assert.ok(za > 2000, 'acilan modal tabanin ustune cikmali, alinan: ' + za);

  ac('b'); await bekle();
  assert.ok(z('b') > z('a'), 'sonra acilan USTTE olmali (b > a): ' + z('b') + ' vs ' + z('a'));

  ac('c'); await bekle();
  assert.ok(z('c') > z('b'), 'ucuncu modal en ustte olmali');

  // Ustteki kapaninca digerlerinin sirasi bozulmamali
  kapat('c'); await bekle();
  assert.strictEqual(z('c'), 0, 'kapanan modal z-index birakmali');
  assert.ok(z('b') > z('a'), 'kapanma digerlerinin sirasini bozmamali');

  // Alttaki tekrar acilirsa (yeniden gosterilirse) en uste cikmali
  kapat('a'); await bekle();
  ac('a'); await bekle();
  assert.ok(z('a') > z('b'), 'yeniden acilan modal en uste cikmali: ' + z('a') + ' vs ' + z('b'));

  // Hepsi kapaninca sayac sifirlanmali (sonsuz buyume olmasin)
  kapat('a'); kapat('b'); await bekle();
  ac('a'); await bekle();
  assert.ok(z('a') <= 2005, 'hic modal kalmayinca sayac sifirlanmali, alinan: ' + z('a'));

  // Sonradan DOM'a eklenen modal da yonetilmeli
  const d = window.document.createElement('div');
  d.id = 'd'; d.className = 'modal-overlay'; d.style.display = 'none';
  window.document.body.appendChild(d); await bekle();
  ac('d'); await bekle();
  assert.ok(z('d') > z('a'), 'sonradan eklenen modal da yigina girmeli');

  console.log('OK modal yigini: sira, kapanma, yeniden acma, sayac sifirlama ve dinamik modal dogru');
})().catch(e => { console.error('HATA:', e.message); process.exit(1); });
