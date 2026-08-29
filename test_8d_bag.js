// Tedarikci <-> 8D bagi. index.html'deki GERCEK fonksiyonlar calistirilir.
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync('C:/Users/User/Desktop/_erp_deploy/supplier-system/index.html', 'utf8');

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

let sonAlert = null, sonMail = null, sonUpdate = null;
const ortam = `
    ${cek('normalizeName')}
    ${cek('gercek8DAdet')}
    ${cek('sekizDRozet')}
    ${cek('sekizDEsitle')}
    ${cek('sekizDTalepMaili')}
    return { gercek8DAdet, sekizDRozet, sekizDEsitle, sekizDTalepMaili };
`;
function kur(harita, tedarikciler, bilgi) {
    const win = { __gercek8D: harita, location: {} };
    Object.defineProperty(win.location, 'href', { set(v) { sonMail = decodeURIComponent(v); } });
    return new Function('window', 'allResults', 'getSupplierInfo', 'showAlert', 'update8D', 'confirm', 'console',
        ortam)(win, tedarikciler, () => bilgi || {},
        (m, t) => { sonAlert = [m, t]; },
        (a, b, c) => { sonUpdate = [a, b, c]; },
        () => true, console);
}
const H = (ad, adet) => new Map([[ad.toLowerCase().replace(/[^a-z0-9]/gi, ''), { adet, ad }]]);

// 1) Harita bos -> rozet BOS (tablo eskisiyle birebir ayni cizilir)
{
    const f = kur(new Map(), []);
    const r = f.sekizDRozet({ name: 'BASF', cevaplanan8D: 0 });
    // Link artik her satirda duruyor (kullanici istegi); sayi/durum yazisi
    // yalniz gercek 8D kaydi varken cikar.
    assert(/sekizDAc\(/.test(r), '1a: 8D linki yok');
    assert(!/otomatik|elle|kayit/.test(r), '1b: kayıt yokken durum yazısı çıkmış');
    console.log('✓ 1  kayıt yokken yalnızca 8D linki, sayı/durum yazısı yok');
}

// 2) Kayit varsa: link + sayi + "otomatik"
{
    const f = kur(H('BASF', 3), [{ name: 'BASF' }]);
    const r = f.sekizDRozet({ name: 'BASF', cevaplanan8D: 3 });
    assert(/sekizDAc\(/.test(r), '2a: 8D linki yok');
    assert(/3 kayit/.test(r), '2b: kayit sayisi yok: ' + r);
    assert(/otomatik/.test(r), '2c: otomatik durumu yok');
    console.log('✓ 2  kayit varsa link + sayi + "otomatik" gorunuyor');
}

// 3) Elle girilmisse otomatige donus baglantisi cikar
{
    const f = kur(H('BASF', 5), [{ name: 'BASF' }]);
    const r = f.sekizDRozet({ name: 'BASF', cevaplanan8D: 2, elle8D: true });
    assert(/otomatik8DDon\(/.test(r), '3a: otomatige donus baglantisi yok');
    assert(/elle/.test(r), '3b');
    console.log('✓ 3  elle girilmisse "otomatige don" baglantisi cikiyor');
}

// 4) Esitleme OTOMATIK yazmaz, update8D uzerinden gider
{
    sonUpdate = null;
    const f = kur(H('BASF', 5), []);
    f.sekizDEsitle('BASF', 5);
    assert.deepStrictEqual(sonUpdate, ['BASF', 'cevap', 5], '4: esitleme yanlis alana yazdi');
    console.log('✓ 4  esitleme sadece "Cevaplanan" alanini, onaydan sonra gunceller');
}

// 5) Kaydi olmayan tedarikcide yalniz link
{
    const f = kur(H('BASF', 3), []);
    const r = f.sekizDRozet({ name: 'AYPA', cevaplanan8D: 0 });
    assert(/sekizDAc\(/.test(r), '5a: link yok');
    assert(!/otomatik|elle|kayit/.test(r), '5b: gereksiz durum yazisi');
    console.log('✓ 5  kaydi olmayan tedarikcide yalniz 8D linki');
}

// 6) 8D talep maili: alici + termin + istenenler
{
    sonMail = null; sonAlert = null;
    const f = kur(new Map(), [{ name: 'BASF', duzeltilmisSinif: 'B' }], { email: 'kalite@basf.com' });
    f.sekizDTalepMaili('BASF');
    assert(/^mailto:kalite%40basf\.com/.test(sonMail) || /mailto:kalite@basf.com/.test(sonMail),
        '6a: alıcı yok: ' + String(sonMail).slice(0, 60));
    assert(/8D Raporu Talebi - BASF/.test(sonMail), '6b: konu yanlış');
    assert(/24 saat/.test(sonMail) && /D1-D3/.test(sonMail), '6c: acil önlem terminleri yok');
    assert(/mevcut sınıf: B/.test(sonMail), '6d: sınıf yazılmamış');
    assert.strictEqual(sonAlert[1], 'success');
    console.log('✓ 6  8D talep maili alıcı + terminler + sınıf ile taslak açıyor');
}

// 7) E-postasi olmayan tedarikci -> yine taslak, ama uyarir
{
    sonAlert = null;
    const f = kur(new Map(), [{ name: 'AYPA' }], {});
    f.sekizDTalepMaili('AYPA');
    assert.strictEqual(sonAlert[1], 'warning', '7: e-posta yokken uyarı verilmiyor');
    console.log('✓ 7  kayıtlı e-posta yoksa taslak açılıyor ama uyarıyor');
}

console.log('\nTüm senaryolar geçti.');
