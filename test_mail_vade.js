// Paylasim mailinin vade uyarisini GERCEKTEN uretip kontrol eder.
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

const gun = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const ortam = `
    const qualityCertTypes = [{key:'iso9001',label:'ISO 9001'},{key:'iatf',label:'IATF 16949'},{key:'iso14001',label:'ISO 14001'}];
    function belgeUyariGun() { return 14; }
    ${cek('belgeVadeleri')}
    ${cek('belgeVadeMetni')}
    ${cek('sendDocumentShareEmail')}
`;

function calistir(certExpiryDates, dil) {
    let yakalanan = null;
    const kap = new Function('allResults', 'currentDocShareSupplier', 'prompt', 'window', 'showAlert', 'console', 'yakala',
        ortam + '\nsendDocumentShareEmail("https://ornek/?d=X.json", "drive", "BASF");');
    kap(
        [{ name: 'BASF', certExpiryDates: certExpiryDates }],
        'BASF',
        () => dil,
        { get location() { return { set href(v) { yakalanan = v; } }; }, set location(v) { yakalanan = v.href || v; } },
        () => {}, console, null
    );
    return decodeURIComponent(String(yakalanan).replace(/^mailto:\?subject=/, '').replace('&body=', '\n@@@\n'));
}

// 1) Yaklasan belge -> mailde cikmali
{
    const m = calistir({ iso9001: gun(9), iatf: gun(400) }, '1');
    assert(/SÜRESİ YAKLAŞAN/.test(m), '1a: uyarı bloğu yok');
    assert(/ISO 9001/.test(m) && /9 gün kaldı/.test(m), '1b: yaklaşan belge yazılmadı');
    assert(!/IATF/.test(m), '1c: vadesi uzak belge boşuna yazılmış');
    assert(/Belge Yenileme Talebi/.test(m), '1d: konu satırı uyarmıyor');
    console.log('✓ 1  yaklaşan belge mailde ve konu satırında uyarıyor');
}

// 2) Suresi DOLMUS -> gecen gun sayisi + kirmizi isaret
{
    const m = calistir({ iso14001: gun(-31) }, '1');
    assert(/31 gün geçti/.test(m), '2a: geçen gün yazılmadı');
    assert(/\u26D4/.test(m), '2b: dolmuş işareti yok');
    console.log('✓ 2  süresi dolmuş belge "gün geçti" olarak uyarıyor');
}

// 3) Vadesi uzak -> mail eskisi gibi sade
{
    const m = calistir({ iso9001: gun(300) }, '1');
    assert(!/SÜRESİ YAKLAŞAN/.test(m), '3a: gereksiz uyarı eklenmiş');
    assert(/Doküman Paylaşımı - BASF/.test(m), '3b: normal konu bozulmuş');
    console.log('✓ 3  vadesi uzakken mail sade kalıyor');
}

// 4) Ingilizce govde
{
    const m = calistir({ iso9001: gun(5) }, '2');
    assert(/EXPIRING \/ EXPIRED CERTIFICATES/.test(m), '4a: EN blok yok');
    assert(/5 days left/.test(m), '4b: EN gün sayısı yok');
    assert(/Certificate Renewal Request/.test(m), '4c: EN konu uyarmıyor');
    console.log('✓ 4  İngilizce mailde de uyarı var');
}

// 5) Tarihi hic girilmemis -> patlamamali
{
    const m = calistir(null, '1');
    assert(/Doküman Paylaşımı/.test(m), '5: tarihsiz tedarikçide mail bozuldu');
    console.log('✓ 5  vade tarihi girilmemiş tedarikçide sorunsuz');
}

console.log('\nTüm senaryolar geçti.');
