// Yerel 8D satir listesi: kaynak baklavasi, zil, sutunlar, kacis.
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
const F = new Function('window', 'localStorage', '_yerelGorunum',
    [cek('esc'), cek('escAttr'), cek('_kaynakBaklava'), cek('_zilIsareti'),
     cek('_yerelSatirlar'), cek('_yerelBaslik')].join('\n')
    + '\nreturn {_kaynakBaklava,_zilIsareti,_yerelSatirlar,_yerelBaslik};')(
    { __yeni8D: new Map([[2, { ne: ['d1', 'd2'] }]]) },
    { getItem: () => 'row', setItem: () => {} }, 'row');

const raporlar = [
    { id: 1, source: 'LeanSys', supplierName: 'ACME', timestamp: '2026-05-01T00:00:00Z',
      head: { reportNumber: 'DF2026-11', title: 'İç tetkik uygunsuzluğu', status: 'Closed', startDate: '2026-06-09' } },
    { id: 2, source: 'Tedarikçi', supplierName: 'BASF TÜRK KIMYA', timestamp: '2026-08-01T00:00:00Z',
      head: { reportNumber: '8D-26-001', title: 'Yüzey kabarcığı', status: 'Open', startDate: '2026-07-01' } },
    { id: 3, source: 'Uygunsuzluk', konu: 'Kayıt #42', timestamp: '2026-03-01T00:00:00Z',
      head: { reportNumber: 'UY-3', status: 'In Progress' } }
];

// 1) Kaynak baklavasi: LeanSys dolu, yerel ici bos
{
    assert(/\u25C6/.test(F._kaynakBaklava(raporlar[0])), '1a: LeanSys baklavası (◆) yok');
    assert(/LeanSys/.test(F._kaynakBaklava(raporlar[0])), '1b: açıklama yok');
    assert(/\u25C7/.test(F._kaynakBaklava(raporlar[1])), '1c: yerel baklavası (◇) yok');
    assert(/Tedarik\u00e7i 8D/.test(F._kaynakBaklava(raporlar[1])), '1d: yerel açıklama');
    assert(/\u25C7/.test(F._kaynakBaklava(raporlar[2])), '1e');
    console.log('✓ 1  ◆ LeanSys / ◇ yerel baklavası doğru, üstüne gelince açıklıyor');
}

// 2) Tablo: sutunlar ve satirlar
{
    const h = F._yerelSatirlar(raporlar);
    ['Kaynak', 'No', 'Başlık', 'Tedarikçi / Kaynak', 'Tarih', 'Durum', 'İşlem']
        .forEach(s => assert(h.indexOf('>' + s + '<') > 0, '2a: sütun yok: ' + s));
    // Baslik satiri haric govde satirlari (her satirda onclick 2 kez var:
    // satirin kendisi ve kalem dugmesi — o yuzden <tr> ile sayiyoruz)
    const govdeSatir = (h.match(/<tr style="border-bottom/g) || []).length;
    assert.strictEqual(govdeSatir, 3, '2b: gövde satırı sayısı');
    assert(/DF2026-11/.test(h) && /8D-26-001/.test(h) && /UY-3/.test(h), '2c: rapor no');
    assert(/BASF T\u00dcRK KIMYA/.test(h), '2d: tedarikçi sütunu');
    assert(/Uygunsuzluk/.test(h), '2e: kaynak sütunu (tedarikçi olmayanlar)');
    console.log('✓ 2  tablo sütunları ve 3 satır doğru çiziliyor');
}

// 3) Tarih sirasi: yeni ustte
{
    const h = F._yerelSatirlar(raporlar);
    // Beklenen: 01.07.2026 > 09.06.2026 > (startDate yok -> timestamp 01.03.2026)
    const sira = ['8D-26-001', 'DF2026-11', 'UY-3'].map(x => h.indexOf(x));
    assert(sira[0] < sira[1] && sira[1] < sira[2],
        '3: tarih sırası yanlış — bulunan sıra: ' + JSON.stringify(sira));
    console.log('✓ 3  en yeni tarih üstte (startDate yoksa kayıt tarihine düşüyor)');
}

// 4) Zil isareti yalniz ilgili satirda
{
    const h = F._yerelSatirlar(raporlar);
    const say = (h.match(/YEN\u0130<\/span>/g) || []).length;
    assert.strictEqual(say, 1, '4a: zil işareti ' + say + ' satırda (1 olmalı)');
    const satir = h.split('<tr ').find(x => /8D-26-001/.test(x));
    assert(/YEN\u0130/.test(satir), '4b: zil yanlış satırda');
    assert(/D1, D2/.test(satir), '4c: dolu bölümler yazılmamış');
    console.log('✓ 4  zil işareti yalnız yeni cevap gelen satırda, dolu bölümleri yazıyor');
}

// 5) HTML kacisi (baslikta script olsa bile)
{
    const kotu = [{ id: 9, source: 'Tedarikçi', supplierName: '<script>alert(1)</script>',
        timestamp: '2026-01-01T00:00:00Z', head: { reportNumber: 'X"><b>', title: 'T' } }];
    const h = F._yerelSatirlar(kotu);
    assert(!/<script>alert/.test(h), '5a: enjeksiyon riski');
    assert(!/X"><b>/.test(h), '5b: rapor no kaçırılmamış');
    console.log('✓ 5  tedarikçi adı ve rapor no HTML olarak kaçırılıyor');
}

// 6) Baslik seridi: gorunum dugmeleri + baklava aciklamasi
{
    const b = F._yerelBaslik(3);
    assert(/_setYerelGorunum\('card'\)/.test(b) && /_setYerelGorunum\('row'\)/.test(b),
        '6a: Kart/Satır düğmeleri yok');
    assert(/\u25C6 LeanSys/.test(b) && /\u25C7 yerel/.test(b), '6b: baklava açıklaması yok');
    assert(/3 rapor/.test(b), '6c: sayaç');
    console.log('✓ 6  başlık şeridinde Kart/Satır seçimi ve baklava açıklaması var');
}

fs.writeFileSync('ornek_yerel_liste.html',
    '<body style="font-family:Segoe UI,Arial,sans-serif;background:#eef2f7;padding:16px">'
    + '<style>.supplier-group{background:#fff;border-radius:10px;overflow:hidden;'
    + 'box-shadow:0 1px 4px rgba(0,0,0,.08)}.supplier-header{background:#1f3251;color:#fff;'
    + 'padding:12px 16px;font-weight:600}.status-badge{padding:2px 8px;border-radius:10px;'
    + 'font-size:.8em;font-weight:700}.status-closed{background:#dcfce7;color:#166534}'
    + '.status-open{background:#fee2e2;color:#b91c1c}.status-inprogress{background:#fef3c7;'
    + 'color:#92400e}.card-btn{border:none;border-radius:4px;padding:4px 7px;cursor:pointer;'
    + 'font-size:.85em}</style>'
    + '<div class="supplier-group">' + F._yerelBaslik(3) + F._yerelSatirlar(raporlar) + '</div>',
    'utf8');
console.log('\nTüm senaryolar geçti.');
