// Belge/ISO talep maili: sade kurumsal govde + vade tablosu (TR/EN).
// Eski test_mail_vade.js duz-metin mailto'yu kontrol ediyordu; mail
// artik ortak sablondan uretiliyor, kontrol de oraya tasindi.
const fs = require('fs'), assert = require('assert');
const D = 'C:/Users/User/Desktop/_erp_deploy/supplier-system/';

global.window = global;
global.TextEncoder = TextEncoder;
global.btoa = t => Buffer.from(t, 'binary').toString('base64');
global.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
eval(fs.readFileSync(D + 'mail-sablon.js', 'utf8'));

const src = fs.readFileSync(D + 'index.html', 'utf8');
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
eval(cek('belgeTalepHtml'));
eval(cek('belgeVadeleri') + '\n' + cek('belgeVadeMetni'));

const AD = 'BASF TÜRK KIMYA SAN. VE TIC. LTD. STI.';
const LINK = 'https://mycosmosshop.github.io/supplier-system/?d=DOCS_BASF.json';
const gun = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

// 1) Yaklasan + dolmus belgeler tabloda
{
    const vade = [{ ad: 'IATF 16949', tarih: gun(-12), kalan: -12 },
                  { ad: 'ISO 9001', tarih: gun(9), kalan: 9 }];
    const h = belgeTalepHtml(AD, LINK, vade, true);
    assert(/Belge Yenileme Talebi/.test(h), '1a: uyarı başlığı yok');
    assert(/S\u00fcresi yakla\u015fan \/ dolmu\u015f belgeler/i.test(h), '1b: vade bölümü yok');
    assert(/IATF 16949/.test(h) && /12 g\u00fcn \u00f6nce doldu/.test(h), '1c: dolmuş belge');
    assert(/ISO 9001/.test(h) && /9 g\u00fcn kald\u0131/.test(h), '1d: yaklaşan belge');
    console.log('✓ 1  süresi yaklaşan/dolmuş belgeler tabloda listeleniyor');
}

// 2) Vade yoksa sade "Dokuman Paylasimi"
{
    const h = belgeTalepHtml(AD, LINK, [], true);
    assert(/Dok\u00fcman Payla\u015f\u0131m\u0131/.test(h), '2a');
    assert(!/yakla\u015fan/i.test(h), '2b: gereksiz uyarı bölümü');
    console.log('✓ 2  vadesi yaklaşan belge yoksa mail sade kalıyor');
}

// 3) SADE: emoji yok
{
    const h = belgeTalepHtml(AD, LINK, [{ ad: 'ISO 9001', tarih: gun(5), kalan: 5 }], true);
    const emoji = h.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || [];
    assert.strictEqual(emoji.length, 0, '3: gövdede emoji var: ' + emoji.join(''));
    console.log('✓ 3  belge maili emojisiz (sade kurumsal)');
}

// 4) CTA + portal aciklamalari
{
    const h = belgeTalepHtml(AD, LINK, [], true);
    assert(h.indexOf('href="' + LINK + '"') > 0, '4a: portal bağlantısı');
    assert(/Dok\u00fcman Portal\u0131n\u0131 A\u00e7/.test(h), '4b: CTA metni');
    assert(/Dosya Y\u00fckle/.test(h) && /Yeni De\u011fi\u015fiklikleri Al/.test(h), '4c: kullanım adımları');
    console.log('✓ 4  portal bağlantısı, CTA ve kullanım adımları yerinde');
}

// 5) Ingilizce
{
    const h = belgeTalepHtml(AD, LINK, [{ ad: 'ISO 9001', tarih: gun(5), kalan: 5 }], false);
    assert(/Certificate Renewal Request/.test(h), '5a: EN başlık');
    assert(/5 days left/.test(h), '5b: EN gün sayısı');
    assert(/Open Document Portal/.test(h), '5c: EN CTA');
    assert(/Quality Team/.test(h), '5d: EN imza');
    console.log('✓ 5  İngilizce sürüm eksiksiz');
}

// 6) .eml: Outlook duzenlenebilir taslak
{
    const eml = window.MailSablon.eml({
        alici: 'kalite@basf.com', konu: 'Belge Yenileme Talebi - ' + AD,
        damga: '1', html: () => belgeTalepHtml(AD, LINK, [], true)
    });
    assert(/^To: kalite@basf\.com$/m.test(eml), '6a: alıcı');
    assert(/^X-Unsent: 1$/m.test(eml), '6b: X-Unsent yok');
    const konu = eml.match(/^Subject: =\?UTF-8\?B\?(.+)\?=$/m)[1];
    assert(Buffer.from(konu, 'base64').toString('utf8').indexOf('TÜRK') > 0,
        '6c: konu satırında Türkçe bozulmuş');
    console.log('✓ 6  .eml Outlook düzenlenebilir taslak olarak açılır (Türkçe konu sağlam)');
}

// 7) HTML kacisi
{
    const h = belgeTalepHtml('<script>alert(1)</script>', LINK, [], true);
    assert(!/<script>alert/.test(h), '7: enjeksiyon riski');
    console.log('✓ 7  tedarikçi adı HTML olarak kaçırılıyor');
}

fs.writeFileSync('ornek_belge_mail.html',
    belgeTalepHtml(AD, LINK, [{ ad: 'IATF 16949', tarih: gun(-12), kalan: -12 },
                              { ad: 'ISO 9001', tarih: gun(9), kalan: 9 }], true), 'utf8');
console.log('\nTüm senaryolar geçti.');
