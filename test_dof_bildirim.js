// Onayli listedeki 8D/DOF bildirim bandi.
const fs = require('fs'), assert = require('assert');
const D = 'C:/Users/User/Desktop/_erp_deploy/supplier-system/';
const src = fs.readFileSync(D + 'index.html', 'utf8');

function cek(ad) {
    let i = src.indexOf('function ' + ad + '(');
    assert(i > 0, ad + ' yok');
    // 'async' onekini de al: yoksa await gecersiz olur
    if (src.slice(i - 6, i) === 'async ') i -= 6;
    let d = 0, b = false, k = i;
    for (; k < src.length; k++) {
        if (src[k] === '{') { d++; b = true; }
        else if (src[k] === '}') { d--; if (b && d === 0) { k++; break; } }
    }
    return src.slice(i, k);
}

// Sahte DOM + IndexedDB + Drive
function kur(raporlar, uzakVeri) {
    const kap = { cocuklar: [], firstChild: null,
        insertBefore(e) { this.cocuklar.unshift(e); }, appendChild(e) { this.cocuklar.push(e); } };
    const belge = {
        querySelector: sec => (sec === '.container' ? kap : null),
        getElementById: () => null,
        createElement: () => ({ style: { cssText: '' }, _html: '',
            set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
            querySelectorAll: () => [{ set onclick(f) {} }, { set onclick(f) {} }],
            remove() {} })
    };
    const db = {
        objectStoreNames: { contains: () => true },
        transaction: () => ({ objectStore: () => ({ getAll() {
            const r = {}; setTimeout(() => { r.result = raporlar; r.onsuccess && r.onsuccess(); }, 0);
            return r; } }) })
    };
    const ortam = new Function('window', 'document', 'db', 'REPORT_8D_STORE_NAME',
        'driveJsonp', 'console', '_erpModulAc',
        cek('sekizDAcilisUyarisi') + '\nreturn sekizDAcilisUyarisi;')(
        {}, belge, db, 'report8D',
        async p => (uzakVeri[p.name]
            ? { success: true, content: JSON.stringify(uzakVeri[p.name]) }
            : { success: false }),
        console, () => {});
    return { calistir: ortam, kap: kap };
}
const bant = k => (k.cocuklar[0] || {}).innerHTML || '';

const R = (id, ad, durum, ek) => Object.assign(
    { id, supplierName: ad, head: { reportNumber: 'R' + id, status: durum } }, ek || {});

(async () => {
    // 1) Tedarikciden YENI cevap -> zil bandi
    {
        const t = kur(
            [R(1, 'BASF', 'Open', { paylasimKey: 'k1.json', gorulenTedarikciDamgasi: null })],
            { 'k1.json': { lastUpdatedBySupplier: '2026-08-29T10:00:00Z' } });
        await t.calistir();
        const h = bant(t.kap);
        assert(/yeni 8D cevab/.test(h), '1a: cevap bildirimi yok: ' + h);
        assert(/BASF/.test(h), '1b: tedarikçi adı yok');
        assert(/\uD83D\uDD14/.test(h), '1c: zil simgesi yok');
        assert(/8D listesini a\u00e7/.test(h), '1d: açma düğmesi yok');
        console.log('✓ 1  tedarikçiden yeni 8D cevabı gelince bant çıkıyor');
    }

    // 2) Cevap yok ama ACIK 8D var -> sade bilgi bandi
    {
        const t = kur([R(1, 'BASF', 'Open'), R(2, 'AYPA', 'Closed'), R(3, 'BASF', 'In Progress')], {});
        await t.calistir();
        const h = bant(t.kap);
        assert(/2 a\u00e7\u0131k 8D/.test(h), '2a: açık 8D sayısı yanlış: ' + h);
        assert(!/yeni 8D cevab/.test(h), '2b: olmayan cevap bildirilmiş');
        assert(/\uD83D\uDCCB/.test(h), '2c: bilgi simgesi yok');
        console.log('✓ 2  cevap yokken açık 8D sayısı bildiriliyor (2 açık, kapalı sayılmıyor)');
    }

    // 3) Hicbir sey yoksa bant CIKMAZ
    {
        const t = kur([R(1, 'BASF', 'Closed')], {});
        await t.calistir();
        assert.strictEqual(t.kap.cocuklar.length, 0, '3: gereksiz bant çıkmış');
        console.log('✓ 3  açık 8D ve yeni cevap yoksa bant hiç çıkmıyor');
    }

    // 4) Damga GORULMUSSE cevap bildirimi cikmaz (aldiktan sonra susar)
    {
        const t = kur(
            [R(1, 'BASF', 'Open', { paylasimKey: 'k1.json',
                gorulenTedarikciDamgasi: '2026-08-29T10:00:00Z' })],
            { 'k1.json': { lastUpdatedBySupplier: '2026-08-29T10:00:00Z' } });
        await t.calistir();
        const h = bant(t.kap);
        assert(!/yeni 8D cevab/.test(h), '4a: alınmış cevap tekrar bildiriliyor');
        assert(/1 a\u00e7\u0131k 8D/.test(h), '4b: açık 8D bilgisi kaybolmuş');
        console.log('✓ 4  "Tedarikçiden Al" sonrası cevap bildirimi susuyor, açık 8D kalıyor');
    }

    // 5) Drive'a ulasilamiyorsa cokmez, acik 8D yine bildirilir
    {
        const t = kur([R(1, 'BASF', 'Open', { paylasimKey: 'yok.json' })], {});
        await t.calistir();
        assert(/1 a\u00e7\u0131k 8D/.test(bant(t.kap)), '5: çevrimdışıyken bant kayboldu');
        console.log('✓ 5  Drive\'a ulaşılamazsa sessizce geçiyor, açık 8D yine bildiriliyor');
    }

    // 6) Rapor hic yoksa
    {
        const t = kur([], {});
        await t.calistir();
        assert.strictEqual(t.kap.cocuklar.length, 0, '6');
        console.log('✓ 6  hiç 8D kaydı yokken sessiz');
    }

    console.log('\nTüm senaryolar geçti.');
})().catch(e => { console.error('✗ ' + (e && e.message ? e.message : e)); process.exit(1); });
