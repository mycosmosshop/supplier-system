// Excel'e yazilan CANLI formuller ile uygulamanin kendi hesabi ayni sonucu vermeli.
// Formuller HTML'deki XF nesnesinden, referans hesap yine HTML'deki gercek
// fonksiyonlardan (recalculateSupplierScore / computeIatfFields) alinir.
//   calistir:  node test_excel_formul.js
const fs = require('fs'), assert = require('assert');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

function blok(bas, son) {
  const i = html.indexOf(bas); assert(i > 0, bas + ' bulunamadi');
  const j = html.indexOf(son, i); assert(j > i, son + ' bulunamadi');
  return html.slice(i, j);
}
// --- HTML'den gercek kod ---
const XF = new Function(blok('const _tavanVar =', '\n            };') + '};\nreturn XF;')();
const app = new Function(
  'getSupplierCategory',
  blok('const _SINIF_SIRA', '\n        function _reloadCategoryMap') +
  blok('function recalculateSupplierScore(', '\n        function analyzeData') +
  blok('function computeIatfFields(', '\n        function saveSupplierIatfData') +
  blok('var _icMi = function', '\n') + '\n' +   // 'Ic'/'Ic-Ultech' ayrimi HTML'den
  'function _iatfDefaults(){}\n' +   // testte varsayilanlar zaten ornek verisinde
  'return {recalculateSupplierScore, computeIatfFields, sinifTavaniUygula};'
)(ad => (ad || '').includes('OTO') ? 'Otomotiv' : 'Diger');

// --- kucuk Excel yorumlayici (IF/AND/OR/MIN/MAX/ROUNDDOWN/SEARCH/ISERROR/ISNUMBER) ---
const HATA = Symbol('#VALUE!');
const F = {
  IF: (k, a, b) => k ? a : b,
  AND: (...a) => a.every(Boolean), OR: (...a) => a.some(Boolean),
  MIN: (...a) => Math.min(...a), MAX: (...a) => Math.max(...a),
  ROUNDDOWN: (n, d) => Math.floor(n * 10 ** d) / 10 ** d,
  SEARCH: (ara, ic) => { const i = String(ic).toUpperCase().indexOf(String(ara).toUpperCase()); return i < 0 ? HATA : i + 1; },
  ISERROR: v => v === HATA, ISNUMBER: v => typeof v === 'number',
  RIGHT: (v, n) => String(v).slice(-(n || 1))
};
function excel(formul, satir) {
  // tirnak disini donustur: hucre referansi -> S["X"], '=' -> '===', '<>' -> '!=='
  const js = formul.split(/("(?:[^"]*)")/).map((p, i) => i % 2 ? p :
    p.replace(/\$?\b([A-Z]{1,2})\$?\d+\b/g, (_, c) => 'S[' + JSON.stringify(c) + ']')
     .replace(/<>/g, '!==').replace(/(?<![<>!=])=(?!=)/g, '===').replace(/&/g, '+')).join('');
  try { return new Function('S', 'F', 'with(F) return ' + js)(satir, F); }
  catch (e) { throw new Error('Formul cozulemedi: ' + formul + '\n' + e.message); }
}

// --- test verisi: farkli senaryolar ---
const ornekler = [
  { ad: 'denetimli, temiz', name: 'X', totalSevk: 500000, totalIade: 300, ppmTarget: 1000, hataHedefi: 2, totalHata: 1, kalitePuan: 100, vdaPuan: 88, talepEdilen8D: 0, cevaplanan8D: 0, terminPuan: 89.6, tamamlanmaPuan: 88.4, iatf: 1, iso9001: 1 },
  { ad: 'denetimsiz, hedef asan', name: 'Y', totalSevk: 200000, totalIade: 900, ppmTarget: 1000, hataHedefi: 2, totalHata: 6, kalitePuan: 70, vdaPuan: 0, talepEdilen8D: 4, cevaplanan8D: 2, terminPuan: 77.4, tamamlanmaPuan: 85.6, iatf: 0, iso9001: 1 },
  { ad: 'sifir sevk / sifir hata', name: 'Z', totalSevk: 0, totalIade: 0, ppmTarget: 1000, hataHedefi: 2, totalHata: 0, kalitePuan: 80, vdaPuan: 0, talepEdilen8D: 0, cevaplanan8D: 0, terminPuan: 100, tamamlanmaPuan: 100, iatf: 0, iso9001: 1, iso14001: 1, iso45001: 1 },
  { ad: 'OTOMOTIV, IATF yok -> tavan B', name: 'OTO A', totalSevk: 1000000, totalIade: 0, ppmTarget: 1000, hataHedefi: 2, totalHata: 0, kalitePuan: 70, vdaPuan: 95, talepEdilen8D: 0, cevaplanan8D: 0, terminPuan: 100, tamamlanmaPuan: 100, iatf: 0, iso9001: 1 },
  { ad: 'OTOMOTIV, belge yok -> tavan C', name: 'OTO B', totalSevk: 1000000, totalIade: 0, ppmTarget: 1000, hataHedefi: 2, totalHata: 0, kalitePuan: 0, vdaPuan: 95, talepEdilen8D: 0, cevaplanan8D: 0, terminPuan: 100, tamamlanmaPuan: 100, iatf: 0, iso9001: 0 },
  { ad: 'IATF olaylari (kesinti)', name: 'W', totalSevk: 400000, totalIade: 200, ppmTarget: 1000, hataHedefi: 2, totalHata: 2, kalitePuan: 100, vdaPuan: 90, talepEdilen8D: 3, cevaplanan8D: 3, terminPuan: 95, tamamlanmaPuan: 95, iatf: 1, iso9001: 1,
    musteriAksaklikSayisi: 3, musteriAksaklikSorumlu: 'Tedarikçi', ekstraNavlunSayisi: 1, ekstraNavlunSorumlu: 'Tedarikçi',
    sahaProblemSayisi: 1, sahaProblemSorumlu: 'Tedarikçi', ozelDurum: 'Evet', ppapOnay: 'Hayır' },
  { ad: 'olaylar musteri kaynakli', name: 'V', totalSevk: 400000, totalIade: 100, ppmTarget: 1000, hataHedefi: 2, totalHata: 0, kalitePuan: 100, vdaPuan: 90, talepEdilen8D: 0, cevaplanan8D: 0, terminPuan: 100, tamamlanmaPuan: 100, iatf: 1, iso9001: 1,
    musteriAksaklikSayisi: 2, musteriAksaklikSorumlu: 'Müşteri', sahaProblemSayisi: 1, sahaProblemSorumlu: 'İç/Ultech' }
];

let hepsi = 0;
for (const o of ornekler) {
  // ---- referans: uygulamanin kendi hesabi ----
  const r = Object.assign({}, o);
  r.ppm = r.totalSevk > 0 ? (r.totalIade / r.totalSevk) * 1000000 : 0;
  const t = r.ppmTarget;
  r.ppmPuan = r.ppm === 0 ? 1 : r.ppm <= 0.2 * t ? 0.95 : r.ppm <= 0.4 * t ? 0.9
            : r.ppm <= 0.6 * t ? 0.85 : r.ppm <= 0.8 * t ? 0.8 : r.ppm < 1.2 * t ? 0.6 : 0;
  r.hataPuan = r.hataHedefi === 0 ? (r.totalHata === 0 ? 1 : 0)
             : r.totalHata === 0 ? 1 : Math.min(r.hataHedefi / r.totalHata, 1);
  r.donusOrani8D = r.talepEdilen8D === 0 ? 100 : Math.min(r.cevaplanan8D / r.talepEdilen8D, 1) * 100;
  app.recalculateSupplierScore(r);
  app.computeIatfFields(r);

  // ---- Excel: formulleri ham girdiler uzerinde coz ----
  const belge = [o.iatf && 'IATF16949', o.iso9001 && 'ISO 9001',
                 o.iso14001 && 'ISO 14001', o.iso45001 && 'ISO 45001'].filter(Boolean).join(', ') || '-';
  const S = { F: o.totalSevk, G: o.totalIade, H: o.ppmTarget, K: o.hataHedefi, L: o.totalHata,
    N: belge, O: o.kalitePuan, P: o.vdaPuan, Q: o.talepEdilen8D, R: o.cevaplanan8D,
    T: o.terminPuan, U: o.tamamlanmaPuan,
    X: o.musteriAksaklikSayisi || 0, Y: o.musteriAksaklikSorumlu || '-',
    AA: o.ekstraNavlunSayisi || 0, AB: o.ekstraNavlunSorumlu || '-',
    AD: o.ozelDurum || 'Hayır', AE: o.ppapOnay || 'Gerekmiyor',
    AG: o.sahaProblemSayisi || 0, AH: o.sahaProblemSorumlu || '-',
    AN: o.name.includes('OTO') ? 'EVET' : 'HAYIR' };
  S.I  = excel(XF.ppm(10), S);         S.J  = excel(XF.ppmPuan(10), S);
  S.O  = excel(XF.kbp(10), S);         // Kalite Belge Puani belgelerden turetilir
  S.M  = excel(XF.hataPuan(10), S);    S.S  = excel(XF.donus8D(10), S);
  S.V  = excel(XF.tdp(10), S);         S.W  = excel(XF.sinif(10, 'V'), S);
  S.AJ = excel(XF.kesinti(10), S);     S.AK = excel(XF.dtp(10), S);
  S.AL = excel(XF.sinif(10, 'AK'), S); S.AM = excel(XF.risk(10), S);
  const durumM = excel(XF.durum(10, 'X', 'Y', 1), S);
  const durumS = excel(XF.durum(10, 'AG', 'AH', 0), S);
  const tdpApp = Math.floor(r.tedarikcipuani * 1000) / 10;

  const kars = [
    ['PPM',               S.I,  r.ppm],
    ['PPM Puani',         S.J,  r.ppmPuan * 100],
    ['Hata Puani',        S.M,  r.hataPuan * 100],
    ['8D Donus',          S.S,  r.donusOrani8D],
    ['Kalite Belge Puani', S.O, o.kalitePuan],
    ['TDP',               S.V,  tdpApp],
    ['Sinif',             String(S.W).replace('⚠ ', ''), r.tedarikcisınıfı],
    ['Sinif uyarisi',     String(S.W).startsWith('⚠'), !!r.sinifTavaniNot],
    ['IATF kesinti',      S.AJ, r.iatfDuzeltme],
    ['Duzeltilmis puan',  S.AK, Math.max(0, tdpApp + r.iatfDuzeltme)],
    ['Duzeltilmis sinif', String(S.AL).replace('⚠ ', ''), r.duzeltilmisSinif],
    ['Tavan aciklamasi',  excel(XF.tavanNot(10), S).replace('⚠ ', ''), r.sinifTavaniNot || ''],
    ['Risk',              S.AM, r.riskAnalizi],
    ['Musteri durum',     durumM, r.musteriDurum],
    ['Saha durum',        durumS, r.sahaDurum]
  ];
  for (const [ad, exc, uyg] of kars) {
    const es = typeof exc === 'number' && typeof uyg === 'number' ? Math.abs(exc - uyg) < 0.11 : exc === uyg;
    if (!es) console.log('  X ' + o.ad + ' -> ' + ad + ': Excel=' + JSON.stringify(exc) + '  uygulama=' + JSON.stringify(uyg));
    assert.ok(es, o.ad + ' / ' + ad);
    hepsi++;
  }
  console.log('OK ' + o.ad.padEnd(32) + ' TDP=' + S.V + '  sinif=' + S.W + '  duzeltilmis=' + S.AK + '/' + S.AL);
}
console.log('\nOK ' + ornekler.length + ' senaryo x ' + (hepsi / ornekler.length) + ' sutun = ' + hepsi + ' karsilastirma, hepsi eslesti');
