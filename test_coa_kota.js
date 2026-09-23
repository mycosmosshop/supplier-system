// coa-arsiv.html saveYearData: kota dolduğunda yükleme yarıda kalmasın,
// hammadde listesi iki kez yazılmasın. İşlev metni canlı HTML'den okunur.
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, 'coa-arsiv.html'), 'utf8');
const bas = html.indexOf('function saveYearData(');
const son = html.indexOf('function switchYear(', bas);
const kod = html.slice(bas, son);

function depo(kota) {             // kota: toplam karakter (tarayıcıda ~5M)
  const m = new Map();
  const boy = () => [...m].reduce((s, [k, v]) => s + k.length + v.length, 0);
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    removeItem: k => m.delete(k),
    setItem(k, v) {
      const eski = m.get(k);
      m.set(k, String(v));
      if (boy() > kota) {
        if (eski === undefined) m.delete(k); else m.set(k, eski);
        const e = new Error("Failed to execute 'setItem' on 'Storage'");
        e.name = 'QuotaExceededError';
        throw e;
      }
    },
    _boy: boy,
  };
}
const uyarilar = [];
function calistir(ls) {
  return new Function('localStorage', 'showToast', 'console', kod + '; return saveYearData;')(
    ls, (m) => uyarilar.push(m), { warn() {}, log() {} });
}
// LeanSys 2026 ölçeği: 880 hammadde, 8.606 irsaliye
const mats = Array.from({ length: 880 }, (_, i) => ({
  code: '9' + i, name: 'HAMMADDE ' + i, suppliers: ['AVS AMBALAJ VE KAGIT SAN.TIC.A.Ş.'],
  deliveries: Array.from({ length: i < 686 ? 10 : 7 }, () => ({
    date: '01.01.2026', serie: 'IRS26AY', no: '1234', girisDepo: 'ANKARA', supplier: 'AVS AMBALAJ VE KAGIT SAN.TIC.A.Ş.' })) }));
const tek = JSON.stringify({ suppliers: ['A'], materials: mats }).length;

let hata = 0;
const ok = (ad, k, ek = '') => { console.log((k ? '  OK  ' : 'HATA ') + ad + (k ? '' : '  → ' + ek)); if (!k) hata++; };

// 1) Tek kopya sığar, iki kopya sığmaz: eski davranış patlardı, yenisi yazar
const ls1 = depo(Math.round(tek * 1.5));
ls1.setItem('coa_materials', 'x'.repeat(Math.round(tek * 0.4)));        // eski büyük yedek
let h1 = null;
try { calistir(ls1)('2026', ['A'], mats, 'LeanSys 2026'); } catch (e) { h1 = e.name; }
ok('kota içinde hata yok', h1 === null, h1);
ok('yıl verisi yazıldı', ls1.getItem('coaExcelData_2026') !== null);
ok('ikinci kopya (coa_materials) yazılmadı / eskisi silindi', ls1.getItem('coa_materials') === null);

// 2) Kota yine yetmezse: hata FIRLATMAZ, uyarı verir, eski veriyi silmez
const ls2 = depo(Math.round(tek * 0.5));
ls2.setItem('coaExcelData_2026', '{"materials":[]}');
let h2 = null;
try { calistir(ls2)('2026', ['A'], mats, 'LeanSys 2026'); } catch (e) { h2 = e.name; }
ok('kota aşılınca yükleme durmuyor (hata fırlatmadı)', h2 === null, h2);
ok('kullanıcıya uyarı gösterildi', uyarilar.some(m => /sığmadı/.test(m)), uyarilar);
ok('eski yıl verisi silinmedi', ls2.getItem('coaExcelData_2026') === '{"materials":[]}');
console.log(hata ? hata + ' HATA' : 'TÜM KONTROLLER GEÇTİ');
process.exit(hata ? 1 : 0);
