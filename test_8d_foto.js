// Hata fotograflarinin maile gomulmesi (.eml multipart/related + cid).
const fs = require('fs'), assert = require('assert');
const yol = 'C:/Users/User/Desktop/_erp_deploy/supplier-system/8d-rapor.html';
const src = fs.readFileSync(yol, 'utf8');

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

// outlookTaslagi8D indirme yapar; Blob/URL/document sahte olacak
let yazilanEml = null, indirilenAd = null;
const F = new Function('btoa', 'TextEncoder', 'Blob', 'URL', 'document', 'setTimeout', 'Date',
    [cek('_b64utf8'), cek('_mailAlanlari8D'), cek('_konu8D'), cek('_hataEkleri8D'),
     cek('_htmlMetin8D'), cek('outlookTaslagi8D')].join('\n')
    + '\nreturn {_hataEkleri8D,_htmlMetin8D,outlookTaslagi8D};')(
    t => Buffer.from(t, 'binary').toString('base64'), TextEncoder,
    function (p) { yazilanEml = p[0]; return {}; },
    { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} },
    { createElement: () => ({ set download(v) { indirilenAd = v; }, get download() { return indirilenAd; }, click() {}, remove() {} }),
      body: { appendChild() {} } },
    () => {}, Date);

// 1x1 PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const rapor = {
    supplierName: 'BASF',
    head: {
        reportNumber: '8D-26-001', title: 'DENEME', email: 'kalite@basf.com',
        defectDescription: 'Yüzeyde kabarcık',
        defectPhotos: [
            { name: 'hata-1.png', type: 'image/png', size: 95, data: PNG, uploadDate: '2026-08-29' },
            { name: 'olcum.pdf', type: 'application/pdf', size: 200, data: 'data:application/pdf;base64,JVBERi0=', uploadDate: '2026-08-29' }
        ]
    }
};
const link = 'https://ornek/8d-rapor.html?d8p=8D_BASF_2.json';

// 1) Gorsel / diger ek ayrimi
{
    const e = F._hataEkleri8D(rapor);
    assert.strictEqual(e.gorseller.length, 1, '1a: görsel sayısı');
    assert.strictEqual(e.digerleri.length, 1, '1b: diğer ek sayısı');
    console.log('✓ 1  görseller ve diğer ekler ayrılıyor');
}

// 2) HTML: onizlemede data URL, .eml icin cid
{
    const onizleme = F._htmlMetin8D(rapor, link);
    assert(onizleme.indexOf('src="' + PNG + '"') > 0, '2a: önizlemede görsel yok');
    const emlHtml = F._htmlMetin8D(rapor, link, i => 'cid:hata' + (i + 1) + '@sanifoam');
    assert(/src="cid:hata1@sanifoam"/.test(emlHtml), '2b: cid referansı yok');
    assert(/HATA FOTO\u011eRAFLARI/.test(emlHtml), '2c: foto başlığı yok');
    assert(/olcum\.pdf/.test(emlHtml), '2d: PDF eki adı yazılmamış');
    console.log('✓ 2  önizlemede data URL, .eml\'de cid — ikisi de görsel gösteriyor');
}

// 3) .eml yapisi: multipart/related + gomulu gorsel
{
    F.outlookTaslagi8D(rapor, link);
    assert(yazilanEml, '3a: .eml üretilmedi');
    assert(/Content-Type: multipart\/related; type="text\/html"; boundary="(----8D_\d+)"/.test(yazilanEml),
        '3b: multipart/related değil');
    const sinir = yazilanEml.match(/boundary="([^"]+)"/)[1];
    assert(yazilanEml.split('--' + sinir).length >= 4, '3c: parça sayısı az');
    assert(/Content-ID: <hata1@sanifoam>/.test(yazilanEml), '3d: Content-ID yok');
    assert(/Content-Disposition: inline; filename="hata-1\.png"/.test(yazilanEml), '3e: inline değil');
    assert(/Content-Type: image\/png; name="hata-1\.png"/.test(yazilanEml), '3f: MIME türü yanlış');
    assert(/^X-Unsent: 1$/m.test(yazilanEml), '3g: X-Unsent yok — Outlook düzenlenebilir taslak açmaz');
    assert(yazilanEml.trim().endsWith('--' + sinir + '--'), '3h: kapanış sınırı yok');
    console.log('✓ 3  .eml multipart/related, görsel cid ile gömülü, X-Unsent var');
}

// 4) Gorsel base64'u dogru cozuluyor (bozuk gorsel gitmesin)
{
    const sinir = yazilanEml.match(/boundary="([^"]+)"/)[1];
    const parca = yazilanEml.split('--' + sinir).find(p => /Content-ID: <hata1@/.test(p));
    const govde = parca.split('\r\n\r\n')[1].replace(/\s+/g, '');
    const ham = Buffer.from(govde, 'base64');
    assert.strictEqual(ham.slice(1, 4).toString('ascii'), 'PNG', '4: gömülü görsel bozuk');
    console.log('✓ 4  gömülü görselin baytları sağlam (PNG imzası doğru)');
}

// 5) Fotograf yoksa eski sade yapiya duser
{
    yazilanEml = null;
    F.outlookTaslagi8D({ supplierName: 'X', head: { reportNumber: '1', email: 'a@b.c' } }, link);
    assert(!/multipart/.test(yazilanEml), '5a: gereksiz multipart');
    assert(/Content-Type: text\/html; charset=utf-8/.test(yazilanEml), '5b');
    console.log('✓ 5  fotoğraf yokken mail sade text/html kalıyor');
}

// Goz kontrolu
const cikti = 'C:/Users/User/AppData/Local/Temp/claude/D--Yaz-l-m/'
    + '651c3d70-fb75-4585-8b7d-1923454b8e83/scratchpad/ornek_8d_mail.html';
fs.writeFileSync(cikti, F._htmlMetin8D(rapor, link), 'utf8');
console.log('\nTüm senaryolar geçti.');
