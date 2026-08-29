// Onayli listedeki 8D sayilari: otomatik dolum + elle gecersiz kilma.
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

let ekranTazelendi = 0, kaydedilen = null;
// update8D onlarca yardimci cagiriyor; ilgilendiklerimiz disindaki her ad
// zararsiz bir no-op'a duser (Proxy). Boylece testin ilgilendigi mantik
// yalitilir, sahte fonksiyon listesi surekli buyumez.
function kur(harita, tedarikciler) {
    const bilinen = {
        window: { __gercek8D: harita },
        allResults: tedarikciler,
        normalizeName: n => String(n || '').toLowerCase().replace(/[^a-z0-9]/gi, ''),
        displayResults: () => { ekranTazelendi++; },
        save8DCounts: (...a) => { kaydedilen = a; return Promise.resolve(); },
        showAlert: () => {},
        _perfEditAllowed: () => true,
        console: console,
        JSON: JSON, Math: Math, String: String, Object: Object, Array: Array, Number: Number,
        parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Date: Date
    };
    const kapsam = new Proxy(bilinen, {
        has: () => true,
        get: (t, k) => (k in t ? t[k] : function () {})
    });
    return new Function('__k',
        'with (__k) {\n'
        + [cek('otomatik8DUygula'), cek('sekizDRozet'), cek('update8D')].join('\n')
        + '\nreturn {otomatik8DUygula, sekizDRozet, update8D};\n}')(kapsam);
}
const H = (ad, talep, cevap) => new Map([[ad.toLowerCase().replace(/[^a-z0-9]/gi, ''),
    { adet: talep, talep, cevap, ad }]]);

// 1) Otomatik dolum + donus orani
{
    const t = [{ name: 'BASF', talepEdilen8D: 0, cevaplanan8D: 0, donusOrani8D: 100 }];
    const f = kur(H('BASF', 4, 3), t);
    assert.strictEqual(f.otomatik8DUygula(), 1, '1a: değişiklik sayılmadı');
    assert.strictEqual(t[0].talepEdilen8D, 4, '1b');
    assert.strictEqual(t[0].cevaplanan8D, 3, '1c');
    assert.strictEqual(Math.round(t[0].donusOrani8D), 75, '1d: dönüş oranı yanlış');
    console.log('✓ 1  sayılar 8D kayıtlarından doluyor, dönüş oranı hesaplanıyor');
}

// 2) Hic 8D yoksa donus orani %100 (mevcut davranis korunur)
{
    const t = [{ name: 'AYPA', talepEdilen8D: 0, cevaplanan8D: 0, donusOrani8D: 100 }];
    const f = kur(new Map(), t);
    f.otomatik8DUygula();
    assert.strictEqual(t[0].donusOrani8D, 100, '2: 8D\'siz tedarikçi cezalandırılmış');
    console.log('✓ 2  8D kaydı olmayan tedarikçide dönüş oranı %100 kalıyor');
}

// 3) ELLE giris otomatigi devre disi birakir
{
    const t = [{ name: 'BASF', talepEdilen8D: 0, cevaplanan8D: 0, donusOrani8D: 100 }];
    const f = kur(H('BASF', 4, 3), t);
    f.update8D('BASF', 'talep', '9');
    assert.strictEqual(t[0].elle8D, true, '3a: elle işareti konmadı');
    assert.strictEqual(t[0].talepEdilen8D, 9, '3b');
    assert.strictEqual(f.otomatik8DUygula(), 0, '3c: otomatik elle girilene dokundu');
    assert.strictEqual(t[0].talepEdilen8D, 9, '3d: elle giriş ezildi');
    console.log('✓ 3  elle girilen sayıyı otomatik hesap EZMİYOR');
}

// 4) Rozet: otomatik / elle durumu + 8D linki
{
    const t = [{ name: 'BASF', cevaplanan8D: 3 }];
    const f = kur(H('BASF', 4, 3), t);
    const oto = f.sekizDRozet(t[0]);
    assert(/sekizDAc\(/.test(oto), '4a: 8D linki yok');
    assert(/otomatik/.test(oto) && !/otomatik8DDon/.test(oto), '4b: otomatik durumu yanlış');
    t[0].elle8D = true;
    const elle = f.sekizDRozet(t[0]);
    assert(/otomatik8DDon\(/.test(elle), '4c: otomatiğe dönüş bağlantısı yok');
    assert(/elle/.test(elle), '4d');
    console.log('✓ 4  rozet 8D linki + otomatik/elle durumunu gösteriyor');
}

// 5) Kaydi olmayan tedarikcide sadece link (tablo sade kalir)
{
    const t = [{ name: 'AYPA', cevaplanan8D: 0 }];
    const f = kur(H('BASF', 4, 3), t);
    const r = f.sekizDRozet(t[0]);
    assert(/sekizDAc\(/.test(r), '5a: link yok');
    assert(!/otomatik|elle|kayit/.test(r), '5b: gereksiz durum yazısı: ' + r);
    console.log('✓ 5  8D kaydı olmayan satırda yalnızca link görünüyor');
}

console.log('\nTüm senaryolar geçti.');
