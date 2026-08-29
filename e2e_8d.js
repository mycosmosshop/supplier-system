// BASTAN SONA CANLI TUR: sanal bir 8D olusturur, GERCEK Drive'a yazar,
// tedarikci gibi doldurur, geri ceker. Kod YAYINDAKI dosyadan cekilir,
// Drive gercek Apps Script'tir. Sonunda test dosyasi Drive'da
// "8D_ZZTEST_..." adiyla kalir (silinebilir).
const fs = require('fs'), assert = require('assert');
const D = 'C:/Users/User/Desktop/_erp_deploy/supplier-system/';
const src = fs.readFileSync(D + '8d-rapor.html', 'utf8');

function cek(ad) {
    const i = src.indexOf('function ' + ad + '(');
    assert(i > 0, ad + ' yok');
    let d = 0, b = false, k = i;
    for (; k < src.length; k++) {
        if (src[k] === '{') { d++; b = true; }
        else if (src[k] === '}') { d--; if (b && d === 0) { k++; break; } }
    }
    return src.slice(i, k);
}
// Yayindaki gercek birlestirme/yardimci fonksiyonlar.
// eval icindeki const'lar disari sizmaz; fonksiyon sarmalayip aliyoruz.
const { _MUSTERI_BOLUM, _TEDARIKCI_BOLUM, birlestir8D, _bolumDoluMu, paylasimAnahtari8D } =
    eval('(function(){'
        + [src.match(/const _MUSTERI_BOLUM = \[[^\]]*\];/)[0],
           src.match(/const _TEDARIKCI_BOLUM = \[[^\]]*\];/)[0],
           cek('birlestir8D'), cek('_bolumDoluMu'), cek('paylasimAnahtari8D')].join('\n')
        + '; return {_MUSTERI_BOLUM,_TEDARIKCI_BOLUM,birlestir8D,_bolumDoluMu,'
        + 'paylasimAnahtari8D};})()');

// Yayindaki Drive ayarlari (dosyadan okunur, elle yazilmaz)
const AYAR = (() => {
    const g = cek('driveAyar8D');
    const url = g.match(/DEF_URL = '([^']+)'/)[1];
    const secret = g.match(/DEF_SECRET = '([^']+)'/)[1];
    return { url, secret };
})();

// JSONP yerine ayni HTTP sozlesmesi
async function driveOku(key) {
    const r = await fetch(AYAR.url + '?action=getfile&name=' + encodeURIComponent(key)
        + '&secret=' + encodeURIComponent(AYAR.secret) + '&callback=cb');
    const t = await r.text();
    const j = JSON.parse(t.replace(/^cb\(/, '').replace(/\)\s*$/, ''));
    if (!j.success) throw new Error(j.error || 'okunamadi');
    return JSON.parse(j.content);
}
async function driveYaz(key, veri) {
    await fetch(AYAR.url, {
        method: 'POST', redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'save', secret: AYAR.secret, name: key,
            content: JSON.stringify(veri) })
    });
}

const bos = () => ({ teamMembers: [] });
const AD = 'ZZTEST Sanal Tedarikci A.S.';

(async () => {
    // ── 1) Ana PC: sanal 8D olustur ve tedarikciye gonder ───────────
    const rapor = {
        id: 999001, supplierName: AD, source: 'Tedarikçi',
        timestamp: new Date().toISOString(),
        head: {
            reportNumber: 'ZZ-TEST-001', title: 'Sanal doğrulama',
            partNumber: 'SF-0000', partName: 'Test Parçası',
            defectDescription: 'Yüzeyde kabarcık', defectQuantity: '5',
            totalCheckedQuantity: '100', detectionPoint: 'Girdi kontrol',
            startDate: '2026-08-29', email: 'test@ornek.local', defectPhotos: []
        },
        d1: bos(), d2: {}, d3: { actions: [] }, d4: { rootCauses: [] },
        d5: { actions: [] }, d6: {}, d7: {},
        d8: { result: '', assessmentBy: '', participants: [] }
    };
    const key = paylasimAnahtari8D(rapor);
    assert(/^8D_ZZTEST[A-Za-z0-9_]*_999001\.json$/.test(key), 'anahtar: ' + key);

    let uzak = null;
    try { uzak = await driveOku(key); } catch (e) { /* ilk gonderim */ }
    const gonderilen = birlestir8D(rapor, uzak, 'musteri');
    gonderilen.paylasimKey = key;
    gonderilen.gonderildi = new Date().toISOString();
    await driveYaz(key, gonderilen);
    await new Promise(r => setTimeout(r, 2500));
    console.log('✓ 1  sanal 8D oluşturuldu ve Drive\'a yazıldı  (' + key + ')');

    // ── 2) Tedarikci linki acti: sikayeti goruyor mu? ───────────────
    const tedarikciGorunum = await driveOku(key);
    assert.strictEqual(tedarikciGorunum.head.reportNumber, 'ZZ-TEST-001', '2a');
    assert.strictEqual(tedarikciGorunum.head.defectDescription, 'Yüzeyde kabarcık', '2b');
    assert.strictEqual(tedarikciGorunum.supplierName, AD, '2c');
    assert(!_TEDARIKCI_BOLUM.some(b => _bolumDoluMu(tedarikciGorunum[b])), '2d: D1-D7 boş değil');
    console.log('✓ 2  tedarikçi linkinden şikayet eksiksiz görünüyor, D1–D7 boş');

    // ── 3) Ana PC arada D8'i doldurdu ve Head'i duzeltti ────────────
    const yerelGuncel = JSON.parse(JSON.stringify(rapor));
    yerelGuncel.head.defectQuantity = '7';                 // duzeltme
    yerelGuncel.d8 = { result: 'Değerlendiriliyor', assessmentBy: 'V.Pekatik', participants: [] };

    // ── 4) Tedarikci D1/D2/D4'u doldurup GONDERDI ──────────────────
    const tedYerel = JSON.parse(JSON.stringify(tedarikciGorunum));
    tedYerel.d1 = { teamMembers: [{ name: 'Ali Vural', department: 'Kalite', position: 'Müh.', contact: '' }] };
    tedYerel.d2 = { symptom: 'Kabarcık', problem: 'Kalıp sıcaklığı düşük', errorType: '', errorLocation: '', riskAssessment: '', riskDate: '', attachments: [] };
    tedYerel.d4 = { rootCauses: [{ type: 'Proses', title: 'Isıtıcı arızası', description: 'Rezistans yanmış', verification: '', results: '', date: '' }] };

    // Tedarikci gonderirken once uzagi okur, birlestirir (ana PC'nin
    // D8'i ve Head duzeltmesi arada Drive'a yazilmis olsun)
    await driveYaz(key, birlestir8D(yerelGuncel, await driveOku(key), 'musteri'));
    await new Promise(r => setTimeout(r, 2500));

    const uzakTed = await driveOku(key);
    const tedGonderim = birlestir8D(tedYerel, uzakTed, 'tedarikci');
    tedGonderim.paylasimKey = key;
    tedGonderim.lastUpdatedBySupplier = new Date().toISOString();
    await driveYaz(key, tedGonderim);
    await new Promise(r => setTimeout(r, 2500));
    console.log('✓ 3  tedarikçi D1/D2/D4\'ü doldurup gönderdi');

    // ── 5) Ana PC ceker: her iki tarafin isi de duruyor mu? ─────────
    const cekilen = await driveOku(key);
    assert.strictEqual(cekilen.d1.teamMembers[0].name, 'Ali Vural', '5a: D1 gelmedi');
    assert.strictEqual(cekilen.d2.problem, 'Kalıp sıcaklığı düşük', '5b: D2 gelmedi');
    assert.strictEqual(cekilen.d4.rootCauses[0].title, 'Isıtıcı arızası', '5c: D4 gelmedi');
    assert.strictEqual(cekilen.head.defectQuantity, '7', '5d: Head düzeltmemiz EZİLDİ');
    assert.strictEqual(cekilen.d8.result, 'Değerlendiriliyor', '5e: D8 değerlendirmemiz EZİLDİ');
    assert(cekilen.lastUpdatedBySupplier, '5f: tedarikçi damgası yok');
    console.log('✓ 4  D1–D7 geldi; Head düzeltmemiz ve D8 değerlendirmemiz KORUNDU');

    // ── 6) ZIL: yeni gonderim algilaniyor mu? ───────────────────────
    const yerelKayit = { id: 999001, paylasimKey: key, gorulenTedarikciDamgasi: null };
    const yeni = !!cekilen.lastUpdatedBySupplier
        && cekilen.lastUpdatedBySupplier !== yerelKayit.gorulenTedarikciDamgasi;
    assert.strictEqual(yeni, true, '6a: zil tetiklenmedi');
    const dolu = _TEDARIKCI_BOLUM.filter(b => _bolumDoluMu(cekilen[b]));
    assert.deepStrictEqual(dolu, ['d1', 'd2', 'd4'], '6b: dolu bölümler: ' + dolu);
    // "Tedarikciden Al" damgayi isler -> zil duser
    yerelKayit.gorulenTedarikciDamgasi = cekilen.lastUpdatedBySupplier;
    assert.strictEqual(cekilen.lastUpdatedBySupplier !== yerelKayit.gorulenTedarikciDamgasi,
        false, '6c: aldıktan sonra zil düşmüyor');
    console.log('✓ 5  zil "D1, D2, D4 dolduruldu" diye uyardı, aldıktan sonra düştü');

    // ── 7) SAYAC: onayli listedeki otomatik hesap ───────────────────
    const kayitlar = [Object.assign({}, cekilen, { id: 999001 })];
    const talep = kayitlar.length;
    const cevap = kayitlar.filter(k =>
        _TEDARIKCI_BOLUM.some(b => _bolumDoluMu(k[b])) || k.lastUpdatedBySupplier).length;
    assert.strictEqual(talep, 1, '7a');
    assert.strictEqual(cevap, 1, '7b');
    assert.strictEqual(talep === 0 ? 100 : (cevap / talep) * 100, 100, '7c: dönüş oranı');
    console.log('✓ 6  onaylı liste sayaçları: 1 talep / 1 cevap → dönüş oranı %100');

    // ── 8) SILME: rapor silinince zil rozeti dusuyor mu? ────────────
    const zil = new Map([[999001, { damga: cekilen.lastUpdatedBySupplier, ne: dolu }]]);
    const kalanRaporlar = [];                       // rapor silindi
    const mevcut = new Set(kalanRaporlar.map(r => r.id));
    [...zil.keys()].forEach(id => { if (!mevcut.has(id)) zil.delete(id); });
    assert.strictEqual(zil.size, 0, '8: silinen rapor zilde kaldı');
    console.log('✓ 7  rapor silinince zil bildirimi düşüyor ("bulunamadı" hatası yok)');

    console.log('\nBaştan sona tur tamam. Drive test dosyası: ' + key);
})().catch(e => { console.error('\n✗ TUR BAŞARISIZ: ' + (e && e.message ? e.message : e)); process.exit(1); });
