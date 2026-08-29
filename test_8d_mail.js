// 8D talep maili (sade kurumsal sablon): govde, alanlar, fotograf gomme.
// test_mail_8d.js + test_8d_foto.js birlestirildi — ikisi de ayni
// fonksiyonlari tariyordu.
const fs = require('fs'), assert = require('assert');
const D = 'C:/Users/User/Desktop/_erp_deploy/supplier-system/';
const src = fs.readFileSync(D + '8d-rapor.html', 'utf8');

// Ortak sablonu yukle
global.window = global;
global.TextEncoder = TextEncoder;
global.btoa = t => Buffer.from(t, 'binary').toString('base64');
let yazilanEml = null, indirilenAd = null;
global.Blob = function (p) { yazilanEml = p[0]; };
global.URL = { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} };
global.document = {
    createElement: () => ({ set download(v) { indirilenAd = v; }, click() {}, remove() {} }),
    body: { appendChild() {} }
};
global.setTimeout = () => {};
eval(fs.readFileSync(D + 'mail-sablon.js', 'utf8'));

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
eval(['_hataEkleri8D', '_mailAlanlari8D', '_konu8D', '_duzMetin8D', '_htmlMetin8D',
    'outlookTaslagi8D'].map(cek).join('\n'));

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
    + 'AAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const rapor = {
    id: 7, supplierName: 'BASF TÜRK KIMYA SAN. VE TIC. LTD. STI.',
    head: {
        reportNumber: '8D-26-001', title: 'DENEME', subject: 'BASF HATA1',
        partNumber: 'SF-4471', partName: 'Ön Panel Sünger',
        defectDescription: 'Yüzeyde kabarcık ve renk farkı',
        defectQuantity: '12', totalCheckedQuantity: '480',
        detectionPoint: 'Girdi kontrol', startDate: '2026-07-01',
        email: 'kalite@basf.com',
        defectPhotos: [
            { name: 'hata-1.png', type: 'image/png', size: 95, data: PNG },
            { name: 'olcum.pdf', type: 'application/pdf', size: 200, data: 'data:application/pdf;base64,JVBERi0=' }
        ]
    }
};
const link = 'https://mycosmosshop.github.io/supplier-system/8d-rapor.html?d8p=8D_BASF_2.json';

// 1) Alanlar: dolu olanlar var, bos olanlar HIC yok
{
    const duz = _duzMetin8D(rapor, link);
    assert(/Parça\s+: SF-4471 — Ön Panel Sünger/.test(duz), '1a: parça satırı hatalı');
    const az = { supplierName: 'X', head: { reportNumber: '8D-1', title: 'T' } };
    const azDuz = _duzMetin8D(az, link);
    assert(!/Hata tanımı|Tespit yeri/.test(azDuz), '1b: boş alan yazılmış');
    assert(/Rapor No/.test(azDuz), '1c: dolu alan kaybolmuş');
    console.log('✓ 1  dolu alanlar yazılıyor, boş alanlar hiç görünmüyor');
}

// 2) Govde SADE: emoji yok, gereksiz renk yok
{
    const html = _htmlMetin8D(rapor, link);
    const emoji = html.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || [];
    assert.strictEqual(emoji.length, 0, '2a: gövdede emoji var: ' + emoji.join(''));
    const duz = _duzMetin8D(rapor, link) + _konu8D(rapor);
    const e2 = duz.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || [];
    assert.strictEqual(e2.length, 0, '2b: düz metinde emoji var: ' + e2.join(''));
    assert(!/U0001F/.test(html + duz), '2c: bozuk emoji kaçışı');
    console.log('✓ 2  gövde ve konu satırı emojisiz (sade kurumsal)');
}

// 3) Icerik: uygunsuzluk tablosu, CTA, terminler, D8 notu
{
    const html = _htmlMetin8D(rapor, link);
    assert(/8D Raporu Talebi/.test(html) && /BASF/.test(html), '3a: başlık');
    assert(/SF-4471/.test(html) && /Girdi kontrol/.test(html), '3b: uygunsuzluk tablosu');
    assert(html.indexOf('href="' + link + '"') > 0, '3c: CTA bağlantısı');
    assert(/8D Formunu A\u00e7 ve Doldur/.test(html), '3d: CTA metni');
    assert(/24 saat i\u00e7inde/.test(html) && /10 g\u00fcn i\u00e7inde/.test(html), '3e: terminler');
    assert(/D8 \(kapan\u0131\u015f de\u011ferlendirmesi\)/.test(html), '3f: D8 notu');
    console.log('✓ 3  uygunsuzluk tablosu, CTA, terminler ve D8 notu yerinde');
}

// 4) HTML kacisi (tedarikci adinda script olsa bile)
{
    const kotu = JSON.parse(JSON.stringify(rapor));
    kotu.head.title = '<script>alert(1)</script>';
    assert(!/<script>alert/.test(_htmlMetin8D(kotu, link)), '4: enjeksiyon riski');
    console.log('✓ 4  alan içeriği HTML olarak kaçırılıyor');
}

// 5) Fotograf: onizlemede data URL, .eml'de cid
{
    const e = _hataEkleri8D(rapor);
    assert.strictEqual(e.gorseller.length, 1, '5a');
    assert.strictEqual(e.digerleri.length, 1, '5b');
    assert(_htmlMetin8D(rapor, link).indexOf('src="' + PNG + '"') > 0, '5c: önizlemede görsel');
    assert(/src="cid:ek1@sanifoam"/.test(_htmlMetin8D(rapor, link, i => 'cid:ek' + (i + 1) + '@sanifoam')),
        '5d: cid referansı');
    assert(/olcum\.pdf/.test(_htmlMetin8D(rapor, link)), '5e: PDF eki adı');
    console.log('✓ 5  görsel önizlemede data URL, .eml\'de cid ile gidiyor');
}

// 6) .eml yapisi: Outlook duzenlenebilir taslak + gomulu gorsel
{
    outlookTaslagi8D(rapor, link);
    assert(yazilanEml, '6a: .eml üretilmedi');
    assert(/^X-Unsent: 1$/m.test(yazilanEml), '6b: X-Unsent yok — düzenlenebilir taslak açılmaz');
    assert(/multipart\/related/.test(yazilanEml), '6c: multipart değil');
    assert(/Content-ID: <ek1@sanifoam>/.test(yazilanEml), '6d: Content-ID yok');
    const sinir = yazilanEml.match(/boundary="([^"]+)"/)[1];
    const parca = yazilanEml.split('--' + sinir).find(p => /Content-ID: <ek1@/.test(p));
    const ham = Buffer.from(parca.split('\r\n\r\n')[1].replace(/\s+/g, ''), 'base64');
    assert.strictEqual(ham.slice(1, 4).toString('ascii'), 'PNG', '6e: gömülü görsel bozuk');
    assert(yazilanEml.trim().endsWith('--' + sinir + '--'), '6f: kapanış sınırı yok');
    console.log('✓ 6  .eml: X-Unsent + multipart/related, gömülü görselin baytları sağlam');
}

// 7) Fotograf yoksa sade text/html
{
    yazilanEml = null;
    outlookTaslagi8D({ supplierName: 'X', head: { reportNumber: '1', email: 'a@b.c' } }, link);
    assert(!/multipart/.test(yazilanEml), '7a: gereksiz multipart');
    assert(/Content-Type: text\/html; charset=utf-8/.test(yazilanEml), '7b');
    console.log('✓ 7  fotoğraf yokken mail sade text/html kalıyor');
}

// 8) Base64 Turkce karakteri bozmuyor (konu satiri)
{
    const b = window.MailSablon.b64('Şğüöçİ 8D');
    assert.strictEqual(Buffer.from(b, 'base64').toString('utf8'), 'Şğüöçİ 8D', '8');
    console.log('✓ 8  base64 Türkçe karakteri bozmuyor');
}

fs.writeFileSync('ornek_8d_mail.html', _htmlMetin8D(rapor, link), 'utf8');
console.log('\nTüm senaryolar geçti.');
