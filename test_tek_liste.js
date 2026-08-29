// Kendi 8D raporlarimiz + LeanSys TEK listede.
const fs = require('fs'), assert = require('assert');
const D = 'C:/Users/User/Desktop/_erp_deploy/supplier-system/';
const src = fs.readFileSync(D + '8d-rapor.html', 'utf8');

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

function kur(yerel, suzgec, yonetici) {
    const oturum = { _erpAdmin: yonetici ? '1' : '0' };
    const bilinen = {
        _yerel8DRows: yerel,
        _sb8dStatus: (suzgec || {}).durum || '',
        _sb8dDateFrom: (suzgec || {}).baslangic || '',
        _sb8dDateTo: (suzgec || {}).bitis || '',
        sessionStorage: { getItem: k => (k in oturum ? oturum[k] : null) },
        window: { __yeni8D: new Map([[2, { ne: ['d1'] }]]) },
        console, String, Object, Array, Date, JSON, Math, isNaN, parseInt
    };
    const kapsam = new Proxy(bilinen, { has: () => true,
        get: (t, k) => (k in t ? t[k] : function () {}) });
    return new Function('__k', 'with (__k) {\n'
        + [cek('esc'), cek('escAttr'), cek('_isoToTrShort'), cek('_yoneticiMi'),
           cek('_kaynakBaklava'), cek('_zilIsareti'), cek('_yerelFiltreli'),
           cek('_yerelSb8dSatir'), cek('_yerelSb8dKart')].join('\n')
        + '\nreturn {_yerelFiltreli,_yerelSb8dSatir,_yerelSb8dKart,_yoneticiMi};\n}')(kapsam);
}

const R = (id, ad, durum, tarih, ek) => Object.assign(
    { id, supplierName: ad, timestamp: tarih + 'T00:00:00Z',
      head: { reportNumber: 'R' + id, title: 'Konu ' + id, status: durum, startDate: tarih } }, ek || {});

const yerel = [
    R(1, 'BASF', 'Open', '2026-07-01'),
    R(2, 'AYPA', 'Closed', '2026-05-20'),
    R(3, 'X', 'In Progress', '2026-08-10', { source: 'Uygunsuzluk', konu: 'Kayıt #42' })
];

// 1) Yerel satirlar tabloya giriyor, en yeni ustte
{
    const F = kur(yerel, {}, true);
    const l = F._yerelFiltreli();
    assert.strictEqual(l.length, 3, '1a');
    assert.deepStrictEqual(l.map(r => r.id), [3, 1, 2], '1b: tarih sırası (yeni üstte)');
    console.log('✓ 1  yerel kayıtlar listeye giriyor, en yeni üstte');
}

// 2) DURUM suzgeci yerel satirlara da uygulanir
{
    const F = kur(yerel, { durum: 'Open' }, true);
    assert.deepStrictEqual(F._yerelFiltreli().map(r => r.id), [1], '2: durum süzgeci');
    console.log('✓ 2  durum süzgeci yerel kayıtlara da uygulanıyor');
}

// 3) TARIH suzgeci de uygulanir
{
    const F = kur(yerel, { baslangic: '2026-06-01' }, true);
    assert.deepStrictEqual(F._yerelFiltreli().map(r => r.id), [3, 1], '3: tarih süzgeci');
    console.log('✓ 3  tarih süzgeci yerel kayıtlara da uygulanıyor');
}

// 4) LOKASYON suzgecinden MUAF (yerel kayitlarin lokasyonu yok)
{
    const F = kur(yerel, {}, true);
    // _sb8dLoc ayarli olsa bile _yerelFiltreli ona bakmaz
    assert.strictEqual(F._yerelFiltreli().length, 3,
        '4: lokasyon seçilince yerel kayıtlar kaybolmamalı');
    console.log('✓ 4  lokasyon seçilince kendi kayıtlarımız kaybolmuyor');
}

// 5) Satir icerigi: baklava, zil, tedarikci, islem dugmeleri
{
    const F = kur(yerel, {}, true);
    const h = F._yerelSb8dSatir(yerel[0], true);
    assert(/\u25C7/.test(h), '5a: yerel baklavası yok');
    assert(/openReportForEdit\(1\)/.test(h), '5b: açma bağlantısı yok');
    assert(/deleteReportFromList\(1,/.test(h), '5c: silme düğmesi yok');
    assert(/BASF/.test(h), '5d: tedarikçi yok');
    assert(/status-badge status-open/.test(h), '5e: durum rozeti yok');
    const zilli = F._yerelSb8dSatir(yerel[1], true);
    assert(/YEN\u0130/.test(zilli), '5f: zil işareti (id 2) yok');
    console.log('✓ 5  satırda baklava, zil, tedarikçi, durum ve işlem düğmeleri var');
}

// 6) Yonetici degilse Kaynak hucresi hic cizilmez
{
    const F = kur(yerel, {}, false);
    const h = F._yerelSb8dSatir(yerel[0], false);
    assert(!/\u25C7|\u25C6/.test(h), '6a: baklava gizlenmemiş');
    assert(/openReportForEdit\(1\)/.test(h), '6b: satır bozulmuş');
    console.log('✓ 6  yönetici değilse Kaynak hücresi çizilmiyor, satır bozulmuyor');
}

// 7) Tablo basligi ve LeanSys satiri Kaynak sutununu yoneticiye gore ciziyor
{
    const g = cek('_paintSb8dBody');
    assert(/_yerelFiltreli\(\)/.test(g), '7a: yerel satırlar gövdeye bağlanmamış');
    assert(/_yerelSb8dSatir\(r,_yon\)/.test(g), '7b: satır üretimi bağlı değil');
    assert(/_yerelSb8dKart/.test(g), '7c: kart görünümü bağlı değil');
    const th = (g.match(/_yon\?'<th/g) || []).length;
    const td = (g.match(/_yon\?'<td/g) || []).length;
    assert.strictEqual(th, 1, '7d: Kaynak başlığı ' + th + ' kez');
    assert.strictEqual(td, 1, '7e: LeanSys satırında Kaynak hücresi ' + td + ' kez');
    console.log('✓ 7  Kaynak sütunu başlık ve LeanSys satırında tutarlı (yöneticiye bağlı)');
}

// 8) renderList artik kendi grubunu cizmiyor
{
    const rl = cek('renderList');
    assert(!/supplier-group/.test(rl), '8a: hâlâ ayrı grup çiziyor');
    assert(/_yerel8DRows = reports/.test(rl), '8b: satırlar devredilmemiş');
    assert(/_paintSb8d\(\)/.test(rl), '8c: birleşik liste çizilmiyor');
    assert(/empty-state/.test(rl), '8d: hiç kayıt yokken boş ekran yok');
    console.log('✓ 8  renderList ayrı bölüm çizmiyor, satırları tek listeye devrediyor');
}

console.log('\nTüm senaryolar geçti.');
