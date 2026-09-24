// Tedarikci Degerlendirme Puani (TDP) — PR06 Rev04 Tablo 6 ile birebir.
// Kirilan hal: calculateTedarikcipuani'nin denetimli dalinda Termin %30
// (dogrusu %20) → agirlik toplami %110; VDA 88 girilince puan 105,1.
// index.html'deki GERCEK fonksiyonlar calistirilir.
//   node test_tdp_formul.js
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
const F = new Function(
    'loadPPMTargetFromStorage', 'loadHataHedefiFromStorage', 'sinifTavaniUygula',
    [cek('altPuanlariTazele'), cek('recalculateSupplierScore'), cek('calculateTedarikcipuani'), cek('calculateTedarikcisınıfı')].join('\n')
    + '\nreturn { recalculateSupplierScore, calculateTedarikcipuani, calculateTedarikcisınıfı };'
)(() => null, () => null, c => c);

const yuzde = x => Math.round(x * 1000) / 10;

// Kullanicinin vakasi: VDA 88, kalite 80, digerleri tam puan
const vaka = { kalitePuan: 80, vdaPuan: 88, donusOrani8D: 100, terminPuan: 100, tamamlanmaPuan: 100, ppmPuan: 1, hataPuan: 1, ppmTarget: 0 };
const p1 = yuzde(F.calculateTedarikcipuani(vaka));
console.log('VDA 88 → TDP %' + p1);
assert.strictEqual(p1, 96.6, 'PR06: 88*0,20 + 80*0,05 + 100*(0,30+0,05+0,20+0,10+0,10) = 96,6');
assert(p1 <= 100, 'puan 100\'u asamaz');

// Iki hesap yolu (elle giris / LeanSys yenileme) AYNI sonucu vermeli
const r = { ...vaka }; F.recalculateSupplierScore(r);
assert.strictEqual(yuzde(r.tedarikcipuani), p1, 'calculateTedarikcipuani ≠ recalculateSupplierScore');

// Agirlik toplami: her kalem 100 iken sonuc tam 100 (denetimli ve denetimsiz)
for (const vda of [100, 0]) {
    const tam = { kalitePuan: 100, vdaPuan: vda, donusOrani8D: 100, terminPuan: 100, tamamlanmaPuan: 100, ppmPuan: 1, hataPuan: 1, ppmTarget: 0 };
    assert.strictEqual(yuzde(F.calculateTedarikcipuani(tam)), 100, 'agirlik toplami %100 degil (vda=' + vda + ')');
}

// PR06 Rev04 6.1 Ornek 1 (denetimli, VDA 88): PPM 60 · TP 89,6 · STP 88,4 · HP 33,3 · KBP 80 · 8DP 100 → 74,7 → C
const orn = { kalitePuan: 80, vdaPuan: 88, donusOrani8D: 100, terminPuan: 89.6, tamamlanmaPuan: 88.4, ppmPuan: 0.60, hataPuan: 0.333, ppmTarget: 0 };
const p2 = F.calculateTedarikcipuani(orn);
assert.strictEqual(yuzde(p2), 74.7, 'PR06 Ornek 1: 74,7 vermeli (eski kopyayla 83,7 cikiyordu)');
assert.strictEqual(F.calculateTedarikcisınıfı(p2), 'C');
console.log('✔ TDP formulu PR06 Rev04 ile birebir (denetimli %20 termin, toplam %100)');
