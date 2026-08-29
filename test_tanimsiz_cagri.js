// Cagriliyor ama TANIMLI DEGIL — node --check bunu yakalamaz (sozdizimi
// gecerlidir), tarayicida calisma aninda ReferenceError olur.
//
// Gercek olay: bir yama sirasinda _hataEkleri8D silindi; uc yerden
// cagriliyordu, sozdizimi kontrolu "temiz" dedi, hata ancak testte cikti.
//
// Genel bir cozumleyici yerine, projenin KENDI fonksiyonlarini adiyla
// kontrol ediyoruz: yanlis alarm vermez, silinmeyi kesin yakalar.
const fs = require('fs'), assert = require('assert');
const D = 'C:/Users/User/Desktop/_erp_deploy/supplier-system/';

function kod(dosya) {
    const src = fs.readFileSync(D + dosya, 'utf8');
    return /\.js$/.test(dosya) ? src
        : (src.match(/<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/g) || []).join('\n');
}

// dosya -> orada TANIMLI olmasi gereken kendi fonksiyonlarimiz
const GEREKLI = {
    'mail-sablon.js': ['esc', 'b64', 'bolumBasligi', 'tablo', 'kutu', 'gorselSeridi',
        'sayfa', 'ekleriAyir', 'eml', 'indir', 'duzTablo', 'duzBaslik', 'mailto',
        'secimPenceresi'],
    '8d-rapor.html': ['form8DVerisi', 'driveAyar8D', 'driveOku8D', 'driveYaz8D',
        'birlestir8D', 'paylasimAnahtari8D', 'perde8D', 'kapatPerde8D',
        'tedarikciyeGonder8D', 'tedarikcidenAl8D', '_bolumDoluMu', 'tedarikciKipiniAc',
        'tedarikciGonder8D', 'tedarikci8DTara', '_zilSayaci8D', '_hataEkleri8D',
        '_mailAlanlari8D', '_konu8D', '_duzMetin8D', '_htmlMetin8D',
        'outlookTaslagi8D', 'basitMail8D', 'gonderMaili8D', 'startNewReport'],
    'index.html': ['gercek8DSayilariYukle', 'gercek8DAdet', 'otomatik8DUygula',
        'otomatik8DDon', 'sekizDRozet', 'sekizDAc', 'sekizDEsitle', 'sekizDTalepMaili',
        'belgeTalepHtml', 'belgeleriBirlestir', 'silmeTasiEkle', 'paylasimOku',
        'paylasimaYaz', 'kararlariPaylas', '_dosyaAnahtari', 'belgeVadeleri',
        'belgeVadeMetni', 'analizDurumGuncelle', 'updateDocumentStatus',
        'sertifikaTarihiTazele', 'sekizDAcilisUyarisi', '_erpModulAc', 'sekizDListeAc']
};

// MailSablon uzerinden cagrilanlar: sablonda gercekten var mi?
const SABLON_UYELERI = ['esc', 'b64', 'bolumBasligi', 'tablo', 'kutu', 'gorselSeridi',
    'sayfa', 'ekleriAyir', 'eml', 'indir', 'duzTablo', 'duzBaslik', 'mailto',
    'secimPenceresi', 'renk'];

let hata = 0;
Object.keys(GEREKLI).forEach(dosya => {
    const js = kod(dosya);
    const eksik = GEREKLI[dosya].filter(ad =>
        !new RegExp('function\\s+' + ad.replace(/\$/g, '\\$') + '\\s*\\(').test(js));
    if (eksik.length) {
        hata += eksik.length;
        console.error('✗ ' + dosya + ' — çağrılıyor ama TANIMLI DEĞİL: ' + eksik.join(', '));
    } else {
        console.log('✓ ' + dosya + ' — ' + GEREKLI[dosya].length + ' fonksiyonun hepsi tanımlı');
    }
});

// Sayfalar MailSablon.X diye ne cagiriyorsa sablonda karsiligi olmali
const kullanilan = new Set();
['8d-rapor.html', 'index.html'].forEach(f => {
    let m; const r = /MailSablon\.([A-Za-z_$][\w$]*)/g; const js = kod(f);
    while ((m = r.exec(js))) kullanilan.add(m[1]);
});
const yok = [...kullanilan].filter(x => !SABLON_UYELERI.includes(x));
if (yok.length) { hata += yok.length; console.error('✗ MailSablon\'da yok: ' + yok.join(', ')); }
else console.log('✓ MailSablon.' + [...kullanilan].join(' / ') + ' — hepsi şablonda var');

// Sablon dosyasi iki sayfaya da bagli mi?
['8d-rapor.html', 'index.html'].forEach(f => {
    const src = fs.readFileSync(D + f, 'utf8');
    if (!/<script src="mail-sablon\.js">/.test(src)) {
        hata++; console.error('✗ ' + f + ' — mail-sablon.js bağlanmamış');
    }
});
if (!hata) console.log('✓ mail-sablon.js her iki sayfaya da bağlı');

assert.strictEqual(hata, 0, 'tanımsız çağrı / eksik bağlantı var');
console.log('\nTüm senaryolar geçti.');
