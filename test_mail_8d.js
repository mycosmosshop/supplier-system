// 8D talep maili: gercek fonksiyonlarla uretip kontrol eder + ornek
// .eml/HTML dosyasi yazar (goz kontrolu icin).
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
const F = new Function('btoa', 'TextEncoder',
    [cek('_b64utf8'), cek('_mailAlanlari8D'), cek('_konu8D'), cek('_hataEkleri8D'),
     cek('_duzMetin8D'), cek('_htmlMetin8D')].join('\n')
    + '\nreturn {_b64utf8,_mailAlanlari8D,_konu8D,_hataEkleri8D,_duzMetin8D,_htmlMetin8D};')(
    t => Buffer.from(t, 'binary').toString('base64'), TextEncoder);

const rapor = {
    supplierName: 'BASF TÜRK KIMYA SAN. VE TIC. LTD. STI.',
    head: {
        reportNumber: '8D-26-001', title: 'DENEME', subject: 'BASF HATA1',
        partNumber: 'SF-4471', partName: 'Ön Panel Sünger',
        defectDescription: 'Yüzeyde kabarcık ve renk farkı',
        defectQuantity: '12', totalCheckedQuantity: '480',
        detectionPoint: 'Girdi kontrol', startDate: '2026-07-01',
        email: 'kalite@basf.com'
    }
};
const link = 'https://mycosmosshop.github.io/supplier-system/8d-rapor.html?d8p=8D_BASF_2.json';

// 1) Bozuk emoji kacisi kalmadi
{
    const duz = F._duzMetin8D(rapor, link);
    const html = F._htmlMetin8D(rapor, link);
    assert(!/U0001F/.test(duz + html + F._konu8D(rapor)), '1: hâlâ bozuk emoji var');
    assert(/📤/.test(duz) && /📋/.test(html), '1b: emoji hiç yok');
    console.log('✓ 1  bozuk "U0001F..." kaçışı kalmadı, emoji gerçek');
}

// 2) Parca satiri artik BOS degil (operator onceligi hatasi duzeldi)
{
    const duz = F._duzMetin8D(rapor, link);
    assert(/Parça\s+: SF-4471 — Ön Panel Sünger/.test(duz), '2: parça satırı hatalı:\n'
        + duz.split('\n').filter(l => /Parça/.test(l)).join('|'));
    console.log('✓ 2  Parça satırı doluyor (kod/ad birleşik)');
}

// 3) Bos alanlar mailde HIC gorunmez ('-' satiri birakmaz)
{
    const az = { supplierName: 'X', head: { reportNumber: '8D-1', title: 'T' } };
    const duz = F._duzMetin8D(az, link);
    assert(!/Hata tanımı/.test(duz) && !/Tespit yeri/.test(duz), '3: boş alan yazılmış');
    assert(/Rapor No/.test(duz) && /Konu/.test(duz), '3b: dolu alan kaybolmuş');
    assert(F._mailAlanlari8D(az).length === 2, '3c');
    console.log('✓ 3  boş alanlar mailde hiç görünmüyor');
}

// 4) HTML mail: link hem dugmede hem duz metinde, XSS kacisi var
{
    const kotu = JSON.parse(JSON.stringify(rapor));
    kotu.head.title = '<script>alert(1)</script>';
    const html = F._htmlMetin8D(kotu, link);
    assert(!/<script>alert/.test(html), '4a: HTML kaçışı yok — enjeksiyon riski');
    assert(html.indexOf('href="' + link + '"') > 0, '4b: düğme bağlantısı yok');
    assert(/8D Formunu A\u00e7 ve Doldur/.test(html), '4c: CTA düğmesi yok');
    assert(/24 saat i\u00e7inde/.test(html) && /10 g\u00fcn i\u00e7inde/.test(html), '4d: terminler yok');
    console.log('✓ 4  HTML mail: CTA düğmesi, terminler, HTML kaçışı tamam');
}

// 5) Konu satiri
{
    assert.strictEqual(F._konu8D(rapor),
        '⚠ 8D Raporu Talebi - BASF TÜRK KIMYA SAN. VE TIC. LTD. STI. (8D-26-001)');
    console.log('✓ 5  konu satırı doğru');
}

// 6) Base64 Turkce karakterle bozulmuyor (eml basligi/govdesi)
{
    const b = F._b64utf8('Şğüöçİ ⚠ 8D');
    assert.strictEqual(Buffer.from(b, 'base64').toString('utf8'), 'Şğüöçİ ⚠ 8D',
        '6: base64 Türkçe karakterde bozuluyor');
    console.log('✓ 6  base64 Türkçe karakter ve emojiyi bozmuyor');
}

// Goz kontrolu icin ornek dosya
const cikti = 'C:/Users/User/AppData/Local/Temp/claude/D--Yaz-l-m/'
    + '651c3d70-fb75-4585-8b7d-1923454b8e83/scratchpad/ornek_8d_mail.html';
fs.writeFileSync(cikti, F._htmlMetin8D(rapor, link), 'utf8');
console.log('\nTüm senaryolar geçti.  Örnek mail: ' + cikti);
