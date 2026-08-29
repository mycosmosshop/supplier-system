// Modul acma: ERP icindeyken IKINCI PENCERE acilmamali.
// Eskiden 700 ms icinde onay gelmezse window.open cagriliyordu; sayfa
// mesgulken onay gec kaliyor ve modul hem ERP sekmesinde hem ayri
// tarayici penceresinde aciliyordu.
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync('C:/Users/User/Desktop/_erp_deploy/supplier-system/index.html', 'utf8');

function cek(ad) {
    let i = src.indexOf('function ' + ad + '(');
    assert(i > 0, ad + ' yok');
    let d = 0, b = false, k = i;
    for (; k < src.length; k++) {
        if (src[k] === '{') { d++; b = true; }
        else if (src[k] === '}') { d--; if (b && d === 0) { k++; break; } }
    }
    return src.slice(i, k);
}

// Zamanlayiciyi elle isletebilmek icin sahte ortam
function kur({ ercinde, onayVer, onayGecikmesi = 0, onaylaSoru = false }) {
    const olan = { acilanPencere: null, gidenMesaj: null, sorulan: null };
    let dinleyici = null, zamanlayici = null;
    const win = {
        location: { origin: 'https://ornek' },
        addEventListener: (t, f) => { if (t === 'message') dinleyici = f; },
        removeEventListener: () => { dinleyici = null; },
        open: (u) => { olan.acilanPencere = u; }
    };
    win.parent = ercinde ? { postMessage: (m) => {
        olan.gidenMesaj = m;
        if (onayVer) {
            const gec = onayGecikmesi;
            (gec ? (f => { olan._gec = f; }) : (f => f()))(
                () => dinleyici && dinleyici({ data: { tip: 'erp-modul-ac-tamam' } }));
        }
    } } : win;

    const F = new Function('window', 'setTimeout', 'confirm',
        cek('_erpModulAc') + '\nreturn _erpModulAc;')(
        win, (f) => { zamanlayici = f; }, (m) => { olan.sorulan = m; return onaylaSoru; });
    return { F, olan, zamanAtla: () => zamanlayici && zamanlayici(),
        gecOnay: () => olan._gec && olan._gec() };
}

// 1) ERP icinde, onay ZAMANINDA gelirse: sekme acilir, pencere ACILMAZ
{
    const t = kur({ ercinde: true, onayVer: true });
    t.F('rapor8d', '', '8d-rapor.html');
    assert.deepStrictEqual(t.olan.gidenMesaj,
        { tip: 'erp-modul-ac', modul: 'rapor8d', sorgu: '' }, '1a: mesaj yanlış');
    t.zamanAtla();
    assert.strictEqual(t.olan.acilanPencere, null, '1b: gereksiz pencere açıldı');
    assert.strictEqual(t.olan.sorulan, null, '1c: gereksiz soru');
    console.log('✓ 1  ERP içinde onay gelince yalnız sekme açılıyor');
}

// 2) ERP icinde, onay GEC gelirse: yine ikinci pencere ACILMAZ
//    (eski davranista burada window.open cagriliyordu)
{
    const t = kur({ ercinde: true, onayVer: true, onayGecikmesi: 1 });
    t.F('rapor8d', '', '8d-rapor.html');
    t.gecOnay();          // onay zamanlayicidan ONCE ama gecikmeli geldi
    t.zamanAtla();
    assert.strictEqual(t.olan.acilanPencere, null,
        '2: onay geç gelince ikinci pencere açılmış (asıl şikâyet buydu)');
    console.log('✓ 2  onay geç gelse bile ikinci pencere açılmıyor');
}

// 3) ERP icinde portal HIC cevap vermezse: kendiliginden acmaz, SORAR
{
    const t = kur({ ercinde: true, onayVer: false, onaylaSoru: false });
    t.F('rapor8d', '', '8d-rapor.html');
    t.zamanAtla();
    assert(t.olan.sorulan && /ayr\u0131 bir pencerede/i.test(t.olan.sorulan), '3a: sorulmadı');
    assert.strictEqual(t.olan.acilanPencere, null, '3b: hayır denmesine rağmen açtı');
    console.log('✓ 3  portal cevapsızsa kendiliğinden açmıyor, soruyor');
}

// 4) ... kullanici EVET derse acar
{
    const t = kur({ ercinde: true, onayVer: false, onaylaSoru: true });
    t.F('rapor8d', 'ted=BASF', '8d-rapor.html');
    t.zamanAtla();
    assert.strictEqual(t.olan.acilanPencere, '8d-rapor.html?ted=BASF', '4: yanlış adres');
    console.log('✓ 4  kullanıcı onay verirse ayrı pencerede açılıyor');
}

// 5) Tek basina acilmis sayfa (ERP disinda): dogrudan yeni sekme
{
    const t = kur({ ercinde: false });
    t.F('rapor8d', 'ted=BASF', '8d-rapor.html');
    assert.strictEqual(t.olan.acilanPencere, '8d-rapor.html?ted=BASF', '5a');
    assert.strictEqual(t.olan.gidenMesaj, null, '5b: gereksiz mesaj');
    console.log('✓ 5  ERP dışında açılmışsa doğrudan yeni sekme');
}

// 6) Sorgu bossa adrese '?' eklenmez
{
    const t = kur({ ercinde: false });
    t.F('rapor8d', '', '8d-rapor.html');
    assert.strictEqual(t.olan.acilanPencere, '8d-rapor.html', '6: gereksiz ?');
    console.log('✓ 6  sorgu boşken adrese "?" eklenmiyor');
}

// 7) Kopya mantik kalmadi: tek gonderim yeri, tek yedek
{
    assert.strictEqual((src.match(/tip: 'erp-modul-ac'/g) || []).length, 1,
        '7a: erp-modul-ac birden fazla yerden gönderiliyor');
    ['sekizDAc', 'ppapAc'].forEach(ad => {
        const g = cek(ad);
        assert(/_erpModulAc\(/.test(g), '7b: ' + ad + ' ortak fonksiyonu kullanmıyor');
        assert(!/window\.open/.test(g), '7c: ' + ad + ' kendi penceresini açıyor');
    });
    console.log('✓ 7  sekizDAc ve ppapAc ortak fonksiyondan geçiyor, kopya kalmadı');
}

console.log('\nTüm senaryolar geçti.');
