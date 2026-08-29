// Kendi 8D kaydimizda PDF ve FR13 Excel.
// Yerel raporun sekli LeanSys payload'i ile ayni oldugu icin mevcut
// _docToFr13 dogrudan kullanilabiliyor — bunu GERCEKTEN dogruluyoruz.
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync('C:/Users/User/Desktop/_erp_deploy/supplier-system/8d-rapor.html', 'utf8');

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

const F = new Function([cek('_isoToTr'), cek('_docToFr13')].join('\n')
    + '\nreturn {_docToFr13};')();

// Gercek bir yerel 8D kaydi (8d-rapor.html form8DVerisi ciktisi seklinde)
const yerel = {
    id: 7, supplierName: 'BASF', source: 'Tedarikçi',
    head: { reportNumber: '8D-26-001', title: 'Yüzey kabarcığı',
        startDate: '2026-07-01', partNumber: 'SF-4471', partName: 'Ön Panel',
        customer: 'Sanifoam', defectDescription: 'Kabarcık', defectQuantity: '12' },
    d1: { teamMembers: [{ name: 'Ali Vural' }, { name: 'Ayşe Kaya' }, { name: '' }] },
    d3: { actions: [{ description: 'Stok ayıklandı', responsible: 'Üretim', date: '2026-07-03' }] },
    d4: { rootCauses: [
        { type: 'Makine', description: 'Rezistans yanmış' },
        { type: 'Metot', description: 'Sıcaklık kontrolü yok' }] },
    d5: { actions: [{ description: 'Kalıp revizyonu', responsible: 'Kalıphane', date: '2026-07-20' }] },
    d7: { preventions: [{ description: 'PFMEA güncellendi', responsible: 'Kalite', planned: '2026-08-01' }] },
    d8: { assessmentBy: 'V.Pekatik', finalMeetingDate: '2026-08-15' }
};

// 1) FR13 alanlari yerel kayittan dogru doluyor
{
    const r = F._docToFr13(yerel);
    assert.strictEqual(r.rapNo, '8D-26-001', '1a: rapor no');
    assert.strictEqual(r.stokKodu, 'SF-4471', '1b: stok kodu');
    assert.strictEqual(r.stokAdi, 'Ön Panel', '1c: stok adı');
    assert.strictEqual(r.tarif, 'Kabarcık', '1d: hata tarifi');
    assert.strictEqual(r.hatali, '12', '1e: hatalı adet');
    assert.strictEqual(r.baslik, 'Yüzey kabarcığı', '1f: başlık');
    console.log('✓ 1  FR13 baş alanları yerel kayıttan doğru doluyor');
}

// 2) Ekip listesi bos adlari atarak birlesiyor
{
    const r = F._docToFr13(yerel);
    assert.strictEqual(r.uyeler, 'Ali Vural, Ayşe Kaya', '2: ekip: ' + r.uyeler);
    console.log('✓ 2  D1 ekibi birleşiyor, boş ad atılıyor');
}

// 3) Kok nedenler TURUNE gore dogru hucreye
{
    const r = F._docToFr13(yerel);
    assert.strictEqual(r.rMakine, 'Rezistans yanmış', '3a: makine');
    assert.strictEqual(r.rMethod, 'Sıcaklık kontrolü yok', '3b: metot');
    assert.strictEqual(r.rInsan, undefined, '3c: boş tür doldurulmuş');
    console.log('✓ 3  D4 kök nedenleri türüne göre doğru hücreye gidiyor');
}

// 4) Acil onlem / kalici aksiyon / onleyici
{
    const r = F._docToFr13(yerel);
    assert.strictEqual(r.acilOnlem, 'Stok ayıklandı', '4a: D3');
    assert.strictEqual(r.planlanan, 'Kalıp revizyonu', '4b: D5');
    assert.strictEqual(r.onleyici, 'PFMEA güncellendi', '4c: D7');
    assert.strictEqual(r.ilgili, 'V.Pekatik', '4d: D8 değerlendiren');
    console.log('✓ 4  D3/D5/D7 aksiyonları ve D8 değerlendireni yerinde');
}

// 5) Tarihler gg.aa.yyyy bicimine ceviriliyor
{
    const r = F._docToFr13(yerel);
    assert(/^\d{2}\.\d{2}\.\d{4}$/.test(r.acma), '5a: açma tarihi: ' + r.acma);
    assert(/^\d{2}\.\d{2}\.\d{4}$/.test(r.acilHedef), '5b: acil hedef: ' + r.acilHedef);
    console.log('✓ 5  tarihler gg.aa.yyyy biçimine çevriliyor');
}

// 6) Yarim dolu rapor cokmez
{
    const r = F._docToFr13({ head: { reportNumber: 'X-1' } });
    assert.strictEqual(r.rapNo, 'X-1', '6a');
    assert.strictEqual(r.uyeler, '', '6b: boş ekip');
    console.log('✓ 6  yarım doldurulmuş raporda çökmüyor');
}

// 7) Dugmeler satirda ve kartta var, dogru fonksiyona bagli
{
    ['_yerelSb8dSatir', '_yerelSb8dKart'].forEach(fn => {
        const g = cek(fn);
        assert(/_yerelPdf\(/.test(g), '7a: ' + fn + ' PDF düğmesi yok');
        assert(/_yerelFr13\(/.test(g), '7b: ' + fn + ' Excel düğmesi yok');
        assert(/openReportForEdit\(/.test(g) && /deleteReportFromList\(/.test(g),
            '7c: ' + fn + ' eski düğmeler kaybolmuş');
    });
    // LeanSys ile ayni sayida dugme
    const y = (cek('_yerelSb8dSatir').match(/class="card-btn"/g) || []).length;
    assert.strictEqual(y, 4, '7d: satırda ' + y + ' düğme (LeanSys gibi 4 olmalı)');
    console.log('✓ 7  satır ve kartta 4 düğme: Aç / PDF / Excel / Sil');
}

// 8) Yardimcilar mevcut fonksiyonlari yeniden kullaniyor (kopya yok)
{
    const pdf = cek('_yerelPdf'), fr = cek('_yerelFr13');
    assert(/export8DReportPDF\(\)/.test(pdf), '8a: PDF kendi kodunu yazmış');
    assert(/_docToFr13\(/.test(fr) && /_downloadFr13\(/.test(fr), '8b: FR13 kendi kodunu yazmış');
    assert(pdf.split('\n').length < 15 && fr.split('\n').length < 20, '8c: gereksiz büyümüş');
    console.log('✓ 8  mevcut PDF/FR13 fonksiyonları yeniden kullanılıyor, kopya yok');
}

console.log('\nTüm senaryolar geçti.');
