// 8D tedarikci portali: bolum sahipligi ve tam tur (gonder -> doldur ->
// geri al). 8d-rapor.html'deki GERCEK fonksiyonlar calistirilir.
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync('C:/Users/User/Desktop/_erp_deploy/supplier-system/8d-rapor.html', 'utf8');

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
const kod = [
    src.match(/const _MUSTERI_BOLUM = \[[^\]]*\];/)[0],
    src.match(/const _TEDARIKCI_BOLUM = \[[^\]]*\];/)[0],
    cek('birlestir8D'), cek('_bolumDoluMu'), cek('paylasimAnahtari8D'),
].join('\n');
const F = new Function(kod +
    '\nreturn {birlestir8D,_bolumDoluMu,paylasimAnahtari8D,_MUSTERI_BOLUM,_TEDARIKCI_BOLUM};')();

// ── 1) TAM TUR: biz aciyoruz -> tedarikci dolduruyor -> geri aliyoruz
{
    // Ana PC: sikayeti yazip gonderiyor
    const bizim = {
        id: 7, supplierName: 'BASF',
        head: { reportNumber: '8D-001', defectDescription: 'Yüzey kabarcığı', email: 'k@basf.com' },
        d1: { teamMembers: [] }, d2: { symptom: '' }, d4: { rootCauses: [] },
        d8: { result: '', assessmentBy: '' }
    };
    const paylasilan = F.birlestir8D(bizim, null, 'musteri');
    assert.strictEqual(paylasilan.head.reportNumber, '8D-001', '1a');

    // Tedarikci D1/D2/D4'u dolduruyor, Head'i degistiremez (form kilitli)
    const tedarikciTarafi = JSON.parse(JSON.stringify(paylasilan));
    tedarikciTarafi.d1 = { teamMembers: [{ name: 'Ali Vural', department: 'Kalite' }] };
    tedarikciTarafi.d2 = { symptom: 'Kabarcık', problem: 'Kalıp sıcaklığı düşük' };
    tedarikciTarafi.d4 = { rootCauses: [{ title: 'Isıtıcı arızası', description: 'Rezistans yanmış' }] };
    const gonderilen = F.birlestir8D(tedarikciTarafi, paylasilan, 'tedarikci');

    // Ana PC arada D8'i doldurdu ve Head'i duzeltti
    const bizimGuncel = Object.assign({}, bizim, {
        head: Object.assign({}, bizim.head, { defectQuantity: '12' }),
        d8: { result: 'Kapatıldı', assessmentBy: 'V.Pekatik' }
    });
    const geriAlinan = F.birlestir8D(bizimGuncel, gonderilen, 'musteri');

    assert.strictEqual(geriAlinan.d1.teamMembers[0].name, 'Ali Vural', '1b: D1 gelmedi');
    assert.strictEqual(geriAlinan.d4.rootCauses[0].title, 'Isıtıcı arızası', '1c: D4 kök neden gelmedi');
    assert.strictEqual(geriAlinan.head.defectQuantity, '12', '1d: bizim Head düzeltmemiz ezildi');
    assert.strictEqual(geriAlinan.d8.result, 'Kapatıldı', '1e: D8 değerlendirmemiz ezildi');
    assert.strictEqual(geriAlinan.id, 7, '1f: yerel kayıt kimliği bozuldu');
    console.log('✓ 1  tam tur: D1–D7 tedarikçiden geliyor, Head/D8 bizde kalıyor');
}

// ── 2) Tedarikci gonderirken bizim Head/D8 degisikligimizi EZMEZ
{
    const uzak = {   // ana PC arada guncelledi
        head: { reportNumber: '8D-001', defectQuantity: '12' },
        d8: { result: 'Devam ediyor' },
        d1: { teamMembers: [] }
    };
    const tedYerel = {  // tedarikcinin sayfasi ESKI Head ile acilmisti
        head: { reportNumber: '8D-001' },
        d8: {},
        d1: { teamMembers: [{ name: 'Ali Vural' }] }
    };
    const g = F.birlestir8D(tedYerel, uzak, 'tedarikci');
    assert.strictEqual(g.head.defectQuantity, '12', '2a: tedarikçi gönderimi Head\'i ezdi');
    assert.strictEqual(g.d8.result, 'Devam ediyor', '2b: tedarikçi gönderimi D8\'i ezdi');
    assert.strictEqual(g.d1.teamMembers[0].name, 'Ali Vural', '2c: tedarikçinin D1\'i kayboldu');
    console.log('✓ 2  tedarikçi gönderimi bizim Head/D8 değişikliğimizi ezmiyor');
}

// ── 3) Biz cekerken tedarikcinin D1-D7'sini EZMEYIZ (bos formla bile)
{
    const uzak = { d1: { teamMembers: [{ name: 'Ali' }] }, d5: { actions: [{ action: 'Kalıp revizyonu' }] } };
    const bizimBos = { id: 7, head: { reportNumber: '8D-001' }, d1: undefined, d5: undefined };
    const r = F.birlestir8D(bizimBos, uzak, 'musteri');
    assert.strictEqual(r.d1.teamMembers[0].name, 'Ali', '3a');
    assert.strictEqual(r.d5.actions[0].action, 'Kalıp revizyonu', '3b');
    console.log('✓ 3  geri alma tedarikçinin D1–D7\'sini eziyor değil, alıyor');
}

// ── 4) Dolu bolum tespiti: bos dizi / bos metin DOLU sayilmaz
{
    assert.strictEqual(F._bolumDoluMu({ teamMembers: [] }), false, '4a');
    assert.strictEqual(F._bolumDoluMu({ symptom: '', problem: '   ' }), false, '4b');
    assert.strictEqual(F._bolumDoluMu({ teamMembers: [{ name: '', department: '' }] }), false, '4c');
    assert.strictEqual(F._bolumDoluMu({ teamMembers: [{ name: 'Ali' }] }), true, '4d');
    assert.strictEqual(F._bolumDoluMu({ symptom: 'Kabarcık' }), true, '4e');
    assert.strictEqual(F._bolumDoluMu(null), false, '4f');
    console.log('✓ 4  "dolduruldu mu" kontrolü boş dizi/boş metni dolu saymıyor');
}

// ── 5) Paylasim anahtari: Turkce/bosluklu firma adi guvenli dosya adi
{
    const k = F.paylasimAnahtari8D({ supplierName: 'BASF TÜRK KİMYA SAN. VE TİC. LTD. ŞTİ.', id: 12 });
    assert(/^8D_[A-Za-z0-9_]+_12\.json$/.test(k), '5a: dosya adı güvensiz: ' + k);
    assert(!/[^\x20-\x7E]/.test(k), '5b: dosya adında ASCII dışı karakter var');
    console.log('✓ 5  paylaşım dosyası adı güvenli: ' + k);
}

// ── 6) Bolum sahipligi listeleri ortusmemeli
{
    const kesisim = F._MUSTERI_BOLUM.filter(x => F._TEDARIKCI_BOLUM.includes(x));
    assert.strictEqual(kesisim.length, 0, '6: iki tarafın da sahiplendiği bölüm var: ' + kesisim);
    assert.deepStrictEqual(F._TEDARIKCI_BOLUM, ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'], '6b');
    console.log('✓ 6  bölüm sahipliği çakışmıyor (Head+D8 bizde, D1–D7 tedarikçide)');
}

console.log('\nTüm senaryolar geçti.');
