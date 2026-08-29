// Paylasim modeli senaryo testi. index.html'den GERCEK fonksiyonlari cekip
// calistirir; kopya mantik yazilmaz, yoksa test yalan soyler.
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync('C:/Users/User/Desktop/_erp_deploy/supplier-system/index.html', 'utf8');

function cek(ad) {
    const i = src.indexOf('function ' + ad + '(');
    assert(i > 0, ad + ' bulunamadi');
    let d = 0, basladi = false, k = i;
    for (; k < src.length; k++) {
        if (src[k] === '{') { d++; basladi = true; }
        else if (src[k] === '}') { d--; if (basladi && d === 0) { k++; break; } }
    }
    return src.slice(i, k);
}
const kod = [
    src.match(/const _MUSTERI_ALANLARI = \[[^\]]*\];/)[0],
    src.match(/const _TEDARIKCI_ALANLARI = \[[\s\S]*?\];/)[0],
    cek('_dosyaAnahtari'), cek('silmeTasiEkle'), cek('belgeleriBirlestir'),
].join('\n');
const { _dosyaAnahtari, silmeTasiEkle, belgeleriBirlestir } =
    new Function(kod + '\nreturn {_dosyaAnahtari, silmeTasiEkle, belgeleriBirlestir};')();

const dosya = (ad, ts, ek) => Object.assign({ name: ad, timestamp: ts, data: 'DATA_' + ad, status: 'pending' }, ek || {});
const adlar = v => Object.values(v.documents).flat().map(f => f.name).sort();

// 1) ANA PC SILER -> tedarikcide dirilmez, gonderimde de geri gelmez
{
    const erp = { documents: { ISO9001: [dosya('a.pdf', 1), dosya('b.pdf', 2)] } };
    silmeTasiEkle(erp, 'ISO9001', erp.documents.ISO9001[1], 'musteri');
    erp.documents.ISO9001 = [erp.documents.ISO9001[0]];
    // paylasim dosyasina yazilan hal
    const paylasim = belgeleriBirlestir(erp, { documents: { ISO9001: [dosya('a.pdf', 1), dosya('b.pdf', 2)] } }, 'musteri');
    assert.deepStrictEqual(adlar(paylasim), ['a.pdf'], '1a: silinen paylasimda kalmis');
    // tedarikcinin ESKI kopyasi hala b.pdf iceriyor; yenileyince dusmeli
    const ted = belgeleriBirlestir({ documents: { ISO9001: [dosya('a.pdf', 1), dosya('b.pdf', 2)] } }, paylasim, 'tedarikci');
    assert.deepStrictEqual(adlar(ted), ['a.pdf'], '1b: tedarikcide dirildi');
    // tedarikci gonderince ana PC'ye geri gelmemeli
    const geri = belgeleriBirlestir(ted, paylasim, 'tedarikci');
    assert.deepStrictEqual(adlar(geri), ['a.pdf'], '1c: gonderimde dirildi');
    console.log('✓ 1  ana PC silince kalici siliniyor (iki tarafta da dirilmiyor)');
}

// 2) TEDARIKCI SILER -> ana PC senkronunda duser
{
    const ted = { documents: { ISO9001: [dosya('a.pdf', 1), dosya('c.pdf', 3)] } };
    silmeTasiEkle(ted, 'ISO9001', ted.documents.ISO9001[1], 'tedarikci');
    ted.documents.ISO9001 = [ted.documents.ISO9001[0]];
    const erp = belgeleriBirlestir({ documents: { ISO9001: [dosya('a.pdf', 1), dosya('c.pdf', 3)] } }, ted, 'musteri');
    assert.deepStrictEqual(adlar(erp), ['a.pdf'], '2: tedarikci silmesi ana PC de uygulanmadi');
    console.log('✓ 2  tedarikci silince ana PC senkronunda da düşüyor');
}

// 3) ANA PC ONAYLARKEN TEDARIKCI GONDERIRSE -> onay KAYBOLMAZ
{
    const paylasim = { documents: { ISO9001: [dosya('a.pdf', 1, { status: 'approved', reviewComment: 'evet onaylandı', expiryDate: '2027-05-01' })] } };
    const tedEski = { documents: { ISO9001: [dosya('a.pdf', 1, { status: 'pending', supplierComment: 'yeni sürüm' })] } };
    const gonderilen = belgeleriBirlestir(tedEski, paylasim, 'tedarikci');
    const f = gonderilen.documents.ISO9001[0];
    assert.strictEqual(f.status, 'approved', '3a: kabul silindi');
    assert.strictEqual(f.reviewComment, 'evet onaylandı', '3b: musteri yorumu silindi');
    assert.strictEqual(f.expiryDate, '2027-05-01', '3c: vade silindi');
    assert.strictEqual(f.supplierComment, 'yeni sürüm', '3d: tedarikci yorumu kayboldu');
    console.log('✓ 3  tedarikçi gönderince ana PC\'nin kabul/yorum/vadesi korunuyor');
}

// 4) TEDARIKCI YUKLERKEN ANA PC KARAR VERMISSE -> ikisi de durur
{
    const erp = { documents: { ISO9001: [dosya('a.pdf', 1, { status: 'approved' })] } };
    const uzak = { documents: { ISO9001: [dosya('a.pdf', 1), dosya('yeni.pdf', 9, { uploadedBySupplier: true })] } };
    const m = belgeleriBirlestir(erp, uzak, 'musteri');
    assert.deepStrictEqual(adlar(m), ['a.pdf', 'yeni.pdf'], '4a: yeni dosya gelmedi');
    assert.strictEqual(m.documents.ISO9001.find(f => f.name === 'a.pdf').status, 'approved', '4b: kabul ezildi');
    console.log('✓ 4  tedarikçinin yeni dosyası geliyor, ana PC kararı ezilmiyor');
}

// 5) SIL SONRA AYNI ADLA TEKRAR YUKLE (carry out) -> engellenmez
{
    const ted = { documents: { ISO9001: [dosya('a.pdf', 1)] } };
    silmeTasiEkle(ted, 'ISO9001', ted.documents.ISO9001[0], 'tedarikci');
    ted.documents.ISO9001 = [dosya('a.pdf', 77)];        // yeni yukleme, yeni zaman
    const m = belgeleriBirlestir(ted, { documents: {} }, 'tedarikci');
    assert.deepStrictEqual(adlar(m), ['a.pdf'], '5: tekrar yukleme silme tasina takildi');
    assert.strictEqual(m.documents.ISO9001[0].timestamp, 77);
    console.log('✓ 5  silip aynı adla tekrar yükleme (carry out) engellenmiyor');
}

// 6) BOS TUR TEMIZLENIR, ICERIK KAYBOLMAZ
{
    const m = belgeleriBirlestir(
        { documents: { ISO9001: [dosya('a.pdf', 1)], BOS: [] } },
        { documents: { ISO9001: [{ name: 'a.pdf', timestamp: 1 }] } }, 'musteri');
    assert(!('BOS' in m.documents), '6a: bos tur kaldi');
    assert.strictEqual(m.documents.ISO9001[0].data, 'DATA_a.pdf', '6b: dosya içeriği kayboldu');
    console.log('✓ 6  boş tür düşüyor, dosya içeriği korunuyor');
}

console.log('\nTüm senaryolar geçti.');
