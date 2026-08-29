// Ayni adli IKI ust-duzey fonksiyon = sessiz hata. JS'te sonraki tanim
// oncekini eziyor; 'updateDocumentStatus' boyle iki kez tanimliydi ve
// dokuman modalinin kararlari yanlis fonksiyona dusuyordu.
const fs = require('fs'), assert = require('assert');
const yol = 'C:/Users/User/Desktop/_erp_deploy/supplier-system/index.html';
const src = fs.readFileSync(yol, 'utf8');

// Ust duzey tanimlar: satir basinda 8 bosluk + (async) function ad(
const re = /^ {8}(?:async )?function ([A-Za-z_$][\w$]*)\s*\(/gm;
const sayac = new Map(), m0 = [];
let m;
while ((m = re.exec(src))) {
    const ad = m[1];
    sayac.set(ad, (sayac.get(ad) || 0) + 1);
    m0.push([ad, src.slice(0, m.index).split('\n').length]);
}
const cakisan = [...sayac.entries()].filter(([, n]) => n > 1);
if (cakisan.length) {
    cakisan.forEach(([ad]) => {
        const satirlar = m0.filter(x => x[0] === ad).map(x => x[1]).join(', ');
        console.error(`✗ ${ad}  -> ${satirlar}. satırlarda ${sayac.get(ad)} kez tanımlı`);
    });
}
assert.strictEqual(cakisan.length, 0, 'aynı adlı üst düzey fonksiyon var');
console.log(`✓ ${sayac.size} üst düzey fonksiyon, ad çakışması yok`);

// Konum tabanli karar haritasi artik OKUNMAMALI
const okuma = src.match(/timestamps\[docKey\]|record\.timestamps\s*\?/g) || [];
assert.strictEqual(okuma.length, 0,
    'konum tabanlı timestamps haritası hâlâ okunuyor: ' + okuma.join(', '));
console.log('✓ karar artık konuma göre değil, dosyanın kendi status alanından okunuyor');

// Dokuman modalinin durum kutusu gercek fonksiyona gitmeli
assert(/onchange="updateDocumentStatus\('\$\{supplierName/.test(src), 'doküman modalı bağlantısı bozuk');
assert(/onchange="analizDurumGuncelle\('\$\{supplier\.name/.test(src), 'analiz ekranı bağlantısı bozuk');
console.log('✓ her iki ekran da doğru fonksiyona bağlı');
