// Sertifika belgesi silinince gecerlilik tarihi ne oluyor?
// Eskiden: HICBIR SEY — silinen belgenin tarihi matriste asili kaliyor,
// "belge var" isareti de kalkmiyordu. Artik KALAN kabul edilmis
// belgelerden yeniden turetiliyor.
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync('C:/Users/User/Desktop/_erp_deploy/supplier-system/index.html', 'utf8');

function cek(ad) {
    let i = src.indexOf('function ' + ad + '(');
    assert(i > 0, ad + ' yok');
    if (src.slice(i - 6, i) === 'async ') i -= 6;
    let d = 0, b = false, k = i;
    for (; k < src.length; k++) {
        if (src[k] === '{') { d++; b = true; }
        else if (src[k] === '}') { d--; if (b && d === 0) { k++; break; } }
    }
    return src.slice(i, k);
}

const CERT = [{ key: 'iso9001', label: 'ISO 9001' }, { key: 'iatf', label: 'IATF 16949' },
              { key: 'iso14001', label: 'ISO 14001' }];
function kur(tedarikciler) {
    const bilinen = {
        allResults: tedarikciler, qualityCertTypes: CERT,
        saveSupplierCertData: () => {}, belgeTakipRozetiniGuncelle: () => {},
        console, String, Object, Array, Date, JSON, Math, isNaN, parseInt
    };
    const kapsam = new Proxy(bilinen, { has: () => true,
        get: (t, k) => (k in t ? t[k] : function () {}) });
    return new Function('__k', 'with (__k) {\n'
        + cek('_turAnahtari') + '\n' + cek('sertifikaTarihiTazele')
        + '\nreturn {sertifikaTarihiTazele,_turAnahtari};\n}')(kapsam);
}

const belge = (ad, durum, vade) => ({ name: ad, status: durum, expiryDate: vade });

// 1) Baska kabul edilmis ISO varsa -> ONCEKININ tarihine doner
{
    const su = { name: 'BASF', iso9001: true, certExpiryDates: { iso9001: '2028-05-01' } };
    const F = kur([su]);
    // 2028 tarihli belge SILINDI; geriye 2027 tarihli eski belge kaldi
    const kayit = { documents: { 'ISO9001': [belge('eski.pdf', 'approved', '2027-03-11')] } };
    const d = F.sertifikaTarihiTazele('BASF', 'ISO9001', kayit);
    assert.strictEqual(su.certExpiryDates.iso9001, '2027-03-11', '1a: önceki tarihe dönmedi');
    assert.strictEqual(su.iso9001, true, '1b: belge işareti kalkmış');
    assert.deepStrictEqual([d.onceki, d.yeni], ['2028-05-01', '2027-03-11'], '1c: bildirim');
    console.log('✓ 1  başka kabul edilmiş belge varsa ÖNCEKİ belgenin tarihine dönüyor');
}

// 2) Birden fazla kaliyorsa EN ILERI tarih
{
    const su = { name: 'BASF', iso9001: true, certExpiryDates: { iso9001: '2030-01-01' } };
    const F = kur([su]);
    const kayit = { documents: { 'ISO9001': [
        belge('a.pdf', 'approved', '2027-03-11'), belge('b.pdf', 'approved', '2029-08-02')] } };
    F.sertifikaTarihiTazele('BASF', 'ISO9001', kayit);
    assert.strictEqual(su.certExpiryDates.iso9001, '2029-08-02', '2: en ileri tarih seçilmedi');
    console.log('✓ 2  birden fazla belge kalırsa en ileri tarihli olan geçerli');
}

// 3) Hic kalmadiysa tarih VE belge isareti temizlenir
{
    const su = { name: 'BASF', iso9001: true, certExpiryDates: { iso9001: '2028-05-01' } };
    const F = kur([su]);
    const d = F.sertifikaTarihiTazele('BASF', 'ISO9001', { documents: { 'ISO9001': [] } });
    assert.strictEqual(su.certExpiryDates.iso9001, undefined, '3a: tarih asılı kaldı');
    assert.strictEqual(su.iso9001, false, '3b: "belge var" işareti kalkmadı');
    assert.strictEqual(d.yeni, '', '3c');
    console.log('✓ 3  hiç belge kalmazsa tarih ve "belge var" işareti kaldırılıyor');
}

// 4) KABUL EDILMEMIS belge tarihi devralmaz
{
    const su = { name: 'BASF', iso9001: true, certExpiryDates: { iso9001: '2028-05-01' } };
    const F = kur([su]);
    F.sertifikaTarihiTazele('BASF', 'ISO9001', { documents: { 'ISO9001': [
        belge('bekleyen.pdf', 'pending', '2031-01-01'),
        belge('red.pdf', 'rejected', '2032-01-01')] } });
    assert.strictEqual(su.certExpiryDates.iso9001, undefined,
        '4: incelenmemiş/reddedilmiş belgenin tarihi geçerli sayıldı');
    console.log('✓ 4  incelenmemiş veya reddedilmiş belgenin tarihi geçerli sayılmıyor');
}

// 5) Ayni sertifika FARKLI tur adi altindaysa da bulunur
{
    const su = { name: 'BASF', iso9001: true, certExpiryDates: { iso9001: '2028-05-01' } };
    const F = kur([su]);
    F.sertifikaTarihiTazele('BASF', 'ISO9001', { documents: {
        'ISO9001': [],
        'ISO 9001 Belgesi': [belge('yedek.pdf', 'approved', '2027-09-09')] } });
    assert.strictEqual(su.certExpiryDates.iso9001, '2027-09-09',
        '5: farklı tür adı altındaki aynı sertifika bulunamadı');
    console.log('✓ 5  aynı sertifika farklı tür adı altındaysa da bulunuyor');
}

// 6) Sertifika OLMAYAN dokuman silinince hicbir sey degismez
{
    const su = { name: 'BASF', iso9001: true, certExpiryDates: { iso9001: '2028-05-01' } };
    const F = kur([su]);
    const d = F.sertifikaTarihiTazele('BASF', 'Masraf Formu', { documents: {} });
    assert.strictEqual(d, null, '6a: sertifika olmayan tür için işlem yapılmış');
    assert.strictEqual(su.certExpiryDates.iso9001, '2028-05-01', '6b: tarih bozuldu');
    console.log('✓ 6  sertifika olmayan doküman silinince tarihlere dokunulmuyor');
}

// 7) IATF de ayni sekilde
{
    const su = { name: 'BASF', iatf: true, certExpiryDates: { iatf: '2027-01-01' } };
    const F = kur([su]);
    F.sertifikaTarihiTazele('BASF', 'IATF 16949', { documents: { 'IATF 16949': [] } });
    assert.strictEqual(su.iatf, false, '7: IATF işareti kalkmadı');
    console.log('✓ 7  IATF için de aynı şekilde çalışıyor');
}

console.log('\nTüm senaryolar geçti.');
