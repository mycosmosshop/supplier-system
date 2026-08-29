// Dugme temasi: rol cikarimi, ton uretimi, okunabilir yazi rengi.
// Sayfadaki GERCEK dugme renkleri index.html'den cekilip siniflandirilir.
const fs = require('fs'), assert = require('assert');
const D = 'C:/Users/User/Desktop/_erp_deploy/supplier-system/';
global.window = global;
global.document = { querySelector: () => null, addEventListener: () => {}, readyState: 'complete' };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.setTimeout = () => {};
eval(fs.readFileSync(D + 'buton-temasi.js', 'utf8'));
const T = window.ButonTemasi;

// 1) Sayfadaki gercek renkler dogru role dusuyor mu?
{
    const bekle = {
        '#28a745': 'onay',      // Excel İndir
        '#2e7d32': 'onay',
        '#dc3545': 'tehlike',   // PDF İndir
        '#f44336': 'tehlike',   // Sil
        '#f57f17': 'uyari',     // Belge Süresi
        '#ff9800': 'uyari',     // Kaydedilen Sürümler
        '#9c27b0': 'vurgu',     // Doküman Matrisi
        '#6a1b9a': 'vurgu',     // Gelişim Planı
        '#1e3c72': 'bilgi',     // 8D Raporlar
        '#3f51b5': 'bilgi',     // Değerlendirme Prosedürü
        '#00897b': 'onay',      // Kalite Belge Matrisi (turkuaz-yeşil)
        '#2196f3': 'bilgi',
        '#9e9e9e': 'notr',      // Yönetici (gri)
        '#6d4c41': 'notr'       // Düzeltmeler (kahve)
    };
    const yanlis = Object.keys(bekle).filter(c => T.rol(c) !== bekle[c])
        .map(c => c + ' -> ' + T.rol(c) + ' (beklenen ' + bekle[c] + ')');
    assert.strictEqual(yanlis.length, 0, '1: ' + yanlis.join(', '));
    console.log('✓ 1  sayfadaki 14 gerçek düğme rengi doğru role düşüyor');
}

// 2) Her temada 6 rolun de rengi var
{
    Object.keys(T.TEMALAR).forEach(k => {
        const t = T.TEMALAR[k];
        if (t.ozgun) return;
        T.ROLLER.forEach(r => assert(/^#[0-9a-f]{6}$/i.test(t.renk[r]),
            '2: ' + k + ' temasında ' + r + ' rengi eksik/geçersiz'));
    });
    console.log('✓ 2  yerleşik temaların hepsinde 6 rolün rengi tam');
}

// 3) Yazi rengi okunabilir (koyu zemin -> beyaz, acik -> koyu)
{
    assert.strictEqual(T.yaziRengi('#1f3251'), '#ffffff', '3a');
    assert.strictEqual(T.yaziRengi('#14532d'), '#ffffff', '3b');
    assert.strictEqual(T.yaziRengi('#f8fafc'), '#1f2937', '3c');
    assert.strictEqual(T.yaziRengi('#ffe08a'), '#1f2937', '3d');
    console.log('✓ 3  yazı rengi zemine göre okunabilir seçiliyor');
}

// 4) Grup kutusu tonlari: zemin cok acik, cerceve orta
{
    const zemin = T.ton('#1f3251', 0.955), cerceve = T.ton('#1f3251', 0.82);
    const l = c => { const x = T.hsl(c); return x.l; };
    assert(l(zemin) > 0.9, '4a: kutu zemini yeterince açık değil');
    assert(l(cerceve) > 0.7 && l(cerceve) < 0.9, '4b: çerçeve tonu aralık dışı');
    assert(Math.abs(T.hsl(zemin).h - T.hsl('#1f3251').h) < 1, '4c: ton kayması');
    console.log('✓ 4  grup kutusu zemin/çerçeve tonu ana renkten türetiliyor');
}

// 5) Ozgun tema paletsiz (geri yukleme modu)
{
    assert.strictEqual(T.temaCoz('ozgun').ozgun, true, '5a');
    assert.strictEqual(T.temaCoz('bilinmeyen').ozgun, true, '5b: bilinmeyen tema özgüne düşmeli');
    console.log('✓ 5  bilinmeyen/özgün tema ilk hâle döndürme modunda');
}

// 6) Renk okuma: kisa hex, uzun hex, rgb
{
    assert.strictEqual(T.rol('#0a0'), 'onay', '6a: kısa hex');
    assert.strictEqual(T.rol('rgb(220, 53, 69)'), 'tehlike', '6b: rgb');
    assert.strictEqual(T.rol(''), 'notr', '6c: boş renk nötre düşmeli');
    console.log('✓ 6  kısa hex, rgb() ve boş değer sorunsuz');
}

// Onizleme: temalarin yan yana gorunumu
const dugmeler = [
    ['📥 Excel İndir', '#28a745'], ['📄 PDF İndir', '#dc3545'],
    ['⏰ Belge Süresi', '#f57f17'], ['🎯 Gelişim Planı', '#6a1b9a'],
    ['📋 8D Raporlar', '#1e3c72'], ['📊 Doküman Matrisi', '#9c27b0'],
    ['📘 Değerlendirme', '#3f51b5'], ['🔒 Yönetici', '#9e9e9e'],
    ['📋 Kalite Belge Matrisi', '#00897b'], ['🗑 Seçilenleri Sil', '#f44336']
];
const blok = k => {
    const t = T.temaCoz(k);
    return '<h3 style="font:600 15px Segoe UI;color:#1f2937;margin:22px 0 8px">' + t.ad + '</h3>'
        + '<div style="background:' + (t.ozgun ? '#e3f2fd' : T.ton(t.renk.bilgi, 0.955))
        + ';border:1px solid ' + (t.ozgun ? '#2196f3' : T.ton(t.renk.bilgi, 0.82))
        + ';border-radius:8px;padding:10px;display:flex;gap:8px;flex-wrap:wrap">'
        + dugmeler.map(([ad, oz]) => {
            const r = t.ozgun ? oz : t.renk[T.rol(oz)];
            return '<span style="background:' + r + ';color:' + T.yaziRengi(r)
                + ';border:1px solid ' + r + ';border-radius:6px;padding:7px 12px;'
                + 'font:600 13px Segoe UI">' + ad + '</span>';
        }).join('') + '</div>';
};
fs.writeFileSync('ornek_tema.html',
    '<body style="font-family:Segoe UI,Arial;background:#f4f6f9;padding:18px">'
    + Object.keys(T.TEMALAR).map(blok).join(''), 'utf8');

console.log('\nTüm senaryolar geçti.');
