// Pareto hesabi: azalan siralama, pay/kumulatif yuzde ve %80 sinirindaki firma sayisi.
// Fonksiyon HTML'den ALINIR (kopya degil) -> uygulama degisirse test de onu olcer.
//   calistir:  node test_pareto.js
const fs = require('fs'), assert = require('assert');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

const bas = html.indexOf('function paretoHesapla(');
assert(bas > 0, 'paretoHesapla bulunamadi');
const son = html.indexOf('\n        }', bas);
const paretoHesapla = new Function(html.slice(bas, son + 10) + '\nreturn paretoHesapla;')();

const yuvarla = (v, n) => Math.round(v * 10 ** n) / 10 ** n;

// --- 1) Klasik 80/20: 2 firma toplamin %80'i ---
let r = paretoHesapla([
  { ad: 'A', iade: 100 }, { ad: 'B', iade: 60 }, { ad: 'C', iade: 20 },
  { ad: 'D', iade: 12 },  { ad: 'E', iade: 8 }
], 'iade');
assert.strictEqual(r.genel, 200, 'toplam');
assert.deepStrictEqual(r.veri.map(x => x.ad), ['A', 'B', 'C', 'D', 'E'], 'azalan siralama');
assert.strictEqual(yuvarla(r.veri[0].pay, 1), 50, 'A payi %50');
assert.strictEqual(yuvarla(r.veri[1].kum, 1), 80, 'A+B kumulatif %80');
assert.strictEqual(r.kritik, 2, '%80 sinirina 2 firmada ulasilmali');
assert.strictEqual(yuvarla(r.veri[4].kum, 6), 100, 'son satir %100');

// --- 2) Sirasiz girdi de dogru siralanmali ---
r = paretoHesapla([{ ad: 'X', iade: 5 }, { ad: 'Y', iade: 90 }, { ad: 'Z', iade: 5 }], 'iade');
assert.deepStrictEqual(r.veri.map(x => x.ad), ['Y', 'X', 'Z']);
assert.strictEqual(r.kritik, 1, 'tek firma %90 -> kritik 1');

// --- 3) Sifir ve negatif olmayan degerler elenir ---
r = paretoHesapla([{ ad: 'A', iade: 10 }, { ad: 'B', iade: 0 }, { ad: 'C', iade: null }], 'iade');
assert.strictEqual(r.veri.length, 1, 'sifir/bos olanlar listeye girmez');
assert.strictEqual(r.kritik, 1);

// --- 4) Bos liste cokmez ---
r = paretoHesapla([], 'iade');
assert.strictEqual(r.genel, 0);
assert.strictEqual(r.kritik, 0, 'veri yokken kritik 0 olmali (1 degil)');
assert.strictEqual(r.veri.length, 0);

// --- 5) Farkli olcut (hata) ayni mantikla calisir ---
r = paretoHesapla([{ ad: 'A', hata: 8, iade: 1 }, { ad: 'B', hata: 2, iade: 999 }], 'hata');
assert.deepStrictEqual(r.veri.map(x => x.ad), ['A', 'B'], 'olcut hata iken hataya gore siralanir');
assert.strictEqual(yuvarla(r.veri[0].kum, 1), 80);
assert.strictEqual(r.kritik, 1);

// --- 6) Esit degerlerde toplam yine %100 ---
r = paretoHesapla([{ ad: 'A', iade: 1 }, { ad: 'B', iade: 1 }, { ad: 'C', iade: 1 }], 'iade');
assert.strictEqual(yuvarla(r.veri[2].kum, 6), 100);
assert.strictEqual(r.kritik, 3, 'esit dagilimda %80 icin 3 firma gerekir');

console.log('OK paretoHesapla: siralama, pay/kumulatif %, %80 siniri ve sinir durumlari dogru (6 senaryo)');
