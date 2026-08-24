const fs = require('fs');
const s = fs.readFileSync('C:/Users/User/Desktop/_erp_deploy/supplier-system/index.html', 'utf8');
function blok(b, e) { const i = s.indexOf(b); const j = s.indexOf(e, i); return s.slice(i, j + e.length); }

// Minimal DOM taklidi — gercek fonksiyonu DEGISTIRMEDEN sinar
function hucre(icerik, girdiMi) {
  return {
    textContent: girdiMi ? '' : icerik,
    querySelector: sel => (girdiMi && sel === 'input') ? { value: icerik } : null
  };
}
function satir(hucreler, gizli, ayrac) {
  return {
    cells: hucreler,
    offsetParent: gizli ? null : {},
    classList: { contains: c => ayrac && c === 'separator-row' }
  };
}
const satirlar = [
  satir([hucre('A'), hucre('100 %')], false, false),
  satir([hucre('B'), hucre('100 %')], false, false),
  satir([hucre('C'), hucre('55', true)], false, false),   // duzenlenebilir hucre
  satir([hucre('D'), hucre('95 %')], false, false),
  satir([hucre('-'), hucre('9999')], true,  false),        // GIZLI satir
  satir([hucre('-'), hucre('-')],    false, true),         // AYRAC satir
  satir([hucre('E'), hucre('-')],    false, false),        // sayisal degil
];
const tablo = { querySelectorAll: () => satirlar };

eval(blok('function _sutunSayilari(tablo, idx) {', '\n        }'));
const sonuc = _sutunSayilari(tablo, 1);
console.log('okunan sayilar:', sonuc);

const bekle = [100, 100, 55, 95];
const ok = JSON.stringify(sonuc) === JSON.stringify(bekle);
console.log(ok ? 'OK  ' : 'HATA', '- beklenen:', bekle);
if (!ok) process.exit(1);

const ort = sonuc.reduce((a, b) => a + b, 0) / sonuc.length;
console.log('ortalama:', Math.round(ort * 10) / 10, '(87.5 bekleniyor)');
if (Math.abs(ort - 87.5) > 0.01) { console.error('HATA: ortalama yanlis'); process.exit(1); }
console.log('\nSONUC: % isareti, <input> hucresi, gizli satir ve ayrac DOGRU islendi');
