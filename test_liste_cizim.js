// _paintSb8dBody'yi GERCEKTEN calistirir.
//
// Neden: parcalari (_yerelFiltreli, _yerelSb8dSatir) tek tek test etmek
// yetmedi. Cizicinin kendisinde `const _yer` baslik satirindan SONRA
// tanimlanmisti; JS'in "olu bolge" kurali yuzunden her cizim
// ReferenceError atiyor ve liste BOMBOS kaliyordu. Sozdizimi kontrolu de
// bunu yakalamaz. Bu test ciziciyi bastan sona kosturur.
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync('C:/Users/User/Desktop/_erp_deploy/supplier-system/8d-rapor.html', 'utf8');

function cek(ad) {
    let i = src.indexOf('function ' + ad + '(');
    assert(i > 0, ad + ' yok');
    if (src.slice(i - 6, i) === 'async ') i -= 6;
    let d = 0, b = false, k = i;
    for (; k < src.length; k++) {
        if (src[k] === '{') { d++; b = true; }
        else if (src[k] === '}') { d--; if (b && d === 0) { k++; break; } }
    }
    return src.slice(i, k);
}

function oge() {
    return { innerHTML: '', style: {}, value: '', querySelectorAll: () => [] };
}
function kur(yerel, leansys, yonetici) {
    const dom = { sb8dHeader: oge(), sb8dBulk: oge(), sb8dBody: oge() };
    const oturum = { _erpAdmin: yonetici ? '1' : '0' };
    const bilinen = {
        _sb8dRows: leansys, _yerel8DRows: yerel,
        _sb8dLoc: '', _sb8dStatus: '', _sb8dDateFrom: '', _sb8dDateTo: '',
        _sb8dSortDir: 'desc', _sb8dView: 'row', _sb8dSelected: new Set(),
        document: { getElementById: id => dom[id] || null },
        sessionStorage: { getItem: k => (k in oturum ? oturum[k] : null) },
        window: { __yeni8D: new Map() },
        console, String, Object, Array, Date, JSON, Math, Set, isNaN, parseInt
    };
    const kapsam = new Proxy(bilinen, { has: () => true,
        get: (t, k) => (k in t ? t[k] : function () {}) });
    const F = new Function('__k', 'with (__k) {\n'
        + [cek('esc'), cek('escAttr'), cek('_isoToTrShort'), cek('_8dLoc'),
           cek('_8dStartDate'), cek('_ls8dEsc'), cek('_yoneticiMi'),
           cek('_kaynakBaklava'), cek('_zilIsareti'), cek('_yerelFiltreli'),
           cek('_yerelSb8dSatir'), cek('_yerelSb8dKart'), cek('_paintSb8dBody')].join('\n')
        + '\nreturn _paintSb8dBody;\n}')(kapsam);
    return { ciz: F, dom, kapsam };
}

const Y = (id, ad, no, tarih) => ({ id, supplierName: ad, timestamp: tarih + 'T00:00:00Z',
    head: { reportNumber: no, title: 'Konu', status: 'Open', startDate: tarih } });
const L = (id, seri, sira, tarih) => ({ id, seri, sira, baslik: 'LeanSys konu',
    status: 'Closed', loc: 'CERKEZKOY', startDate: tarih });

// 1) Cizici HATA ATMADAN calisiyor ve satirlari basiyor
{
    const t = kur([Y(1, 'BASF', '8D-26-001', '2026-07-01')], [L(9, 'DF2026', '11', '2026-06-09')], true);
    t.ciz();                                   // hata atarsa test burada duser
    const g = t.dom.sb8dBody.innerHTML;
    assert(g.length > 0, '1a: gövde boş kaldı');
    assert(/8D-26-001/.test(g), '1b: kendi kaydımız listede yok');
    assert(/DF2026-11/.test(g), '1c: LeanSys kaydı listede yok');
    console.log('✓ 1  çizici hatasız çalışıyor; kendi kayıt + LeanSys aynı tabloda');
}

// 2) Baslik seridi doluyor (asil hatanin gorundugu yer)
{
    const t = kur([Y(1, 'BASF', '8D-26-001', '2026-07-01')], [L(9, 'DF2026', '11', '2026-06-09')], true);
    t.ciz();
    const h = t.dom.sb8dHeader.innerHTML;
    assert(h.length > 0, '2a: başlık şeridi BOŞ (const ölü bölgesi hatası geri geldi)');
    assert(/8D Raporlar/.test(h), '2b: başlık metni yok');
    assert(/1 kendi/.test(h), '2c: kendi kayıt sayısı yok: ' + h);
    assert(/LeanSys/.test(h), '2d: LeanSys sayısı yok');
    console.log('✓ 2  başlık şeridi doluyor: "1 kendi + … LeanSys"');
}

// 3) Kendi kaydimiz USTTE
{
    const t = kur([Y(1, 'BASF', '8D-26-001', '2020-01-01')],   // cok eski tarih
                  [L(9, 'DF2026', '11', '2026-06-09')], true);
    t.ciz();
    const g = t.dom.sb8dBody.innerHTML;
    assert(g.indexOf('8D-26-001') < g.indexOf('DF2026-11'),
        '3: kendi kaydımız üstte olmalı (tarihten bağımsız)');
    console.log('✓ 3  kendi kayıtlarımız her zaman üstte');
}

// 4) Kart gorunumu de hatasiz
{
    const t = kur([Y(1, 'BASF', '8D-26-001', '2026-07-01')], [L(9, 'DF2026', '11', '2026-06-09')], true);
    t.kapsam._sb8dView = 'card';
    t.ciz();
    const g = t.dom.sb8dBody.innerHTML;
    assert(/report-card/.test(g), '4a: kart çizilmedi');
    assert(/8D-26-001/.test(g), '4b: kendi kaydımız kartlarda yok');
    console.log('✓ 4  kart görünümü de hatasız, kendi kayıtlarımız dahil');
}

// 5) Yalniz kendi kaydimiz varsa (LeanSys bos) yine cizilir
{
    const t = kur([Y(1, 'BASF', '8D-26-001', '2026-07-01')], [], true);
    t.ciz();
    assert(/8D-26-001/.test(t.dom.sb8dBody.innerHTML), '5: LeanSys boşken kendi kaydımız kayboldu');
    console.log('✓ 5  LeanSys boşken kendi kayıtlarımız yine görünüyor');
}

// 6) Yonetici degilken de cizim saglam (sutun sayisi tutarli)
{
    const t = kur([Y(1, 'BASF', '8D-26-001', '2026-07-01')], [L(9, 'DF2026', '11', '2026-06-09')], false);
    t.ciz();
    const g = t.dom.sb8dBody.innerHTML;
    const bas = (g.match(/<th /g) || []).length;
    const ilkSatir = g.slice(g.indexOf('<tr style="border-bottom'));
    const hucre = (ilkSatir.slice(0, ilkSatir.indexOf('</tr>')).match(/<td /g) || []).length;
    assert.strictEqual(bas, hucre, '6: başlık ' + bas + ' sütun, satır ' + hucre + ' hücre');
    assert(!/\u25C6|\u25C7/.test(g), '6b: yönetici değilken baklava görünüyor');
    console.log('✓ 6  yönetici değilken sütun sayısı tutarlı (' + bas + '), baklava yok');
}

console.log('\nTüm senaryolar geçti.');
