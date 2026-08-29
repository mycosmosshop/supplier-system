// LeanSys 8D bolumu liste tazelenince kayboluyordu.
//
// SEBEP: renderList, reportListContainer'in icerigini KOMPLE yeniden
// yaziyor; LeanSys bolumu de ayni kapta duruyor. Zil taramasi bitince
// listeyi tazeliyor ve LeanSys satirlari siliniyordu.
//
// Ayrica: 'let' ile tanimli bir degisken window uzerinde DEGILDIR;
// window._sb8dRows diye bakan bir kontrol her zaman false doner ve
// duzeltme sessizce hicbir sey yapmaz. Bu test onu da yakalar.
const fs = require('fs'), assert = require('assert');
const D = 'C:/Users/User/Desktop/_erp_deploy/supplier-system/';
const src = fs.readFileSync(D + '8d-rapor.html', 'utf8');

function govde(ad) {
    const i = src.indexOf('function ' + ad + '(');
    assert(i > 0, ad + ' yok');
    let d = 0, b = false, k = i;
    for (; k < src.length; k++) {
        if (src[k] === '{') { d++; b = true; }
        else if (src[k] === '}') { d--; if (b && d === 0) { k++; break; } }
    }
    return src.slice(i, k);
}

// 1) renderList tek listeyi cizdirmeli; kabi yazan yol varsa da
//    LeanSys bolumu geri boyanmali
{
    const rl = govde('renderList');
    assert(/_paintSb8d\(\)/.test(rl), '1a: birlesik liste cizilmiyor');
    const silme = (rl.match(/\.innerHTML\s*=/g) || []).length;
    const bosEkran = (rl.match(/empty-state/g) || []).length;
    assert.strictEqual(silme, bosEkran,
        '1b: kabi ' + silme + ' yerde yaziyor ama yalniz ' + bosEkran
        + ' tanesi bos-ekran dali (digeri listeyi siler)');
    console.log('✓ 1  renderList tek listeyi cizdiriyor; kabi yalniz bos-ekran dalinda yaziyor');
}

// 2) Geri boyama AGA GITMEZ (_renderSb8dGroup her cagrida Supabase'e gider)
{
    const rl = govde('renderList');
    assert(!/_renderSb8dGroup\(/.test(rl),
        '2: renderList içinden _renderSb8dGroup çağrılıyor — her tazelemede ağa gider');
    console.log('✓ 2  geri boyama önbellekten (ağa gitmiyor)');
}

// 3) 'let' degiskenine window uzerinden bakilmiyor
{
    const letler = [...src.matchAll(/^\s*let\s+([A-Za-z_$][\w$]*)\s*=/gm)].map(m => m[1]);
    const hatali = letler.filter(ad =>
        new RegExp('window\\.' + ad.replace(/\$/g, '\\$') + '\\b').test(src));
    assert.strictEqual(hatali.length, 0,
        '3: let ile tanımlı ama window üzerinden okunuyor (hep undefined): ' + hatali.join(', '));
    console.log('✓ 3  hiçbir "let" değişkeni window üzerinden okunmuyor ('
        + letler.length + ' değişken tarandı)');
}

// 4) Zil taramasi listeyi tazeliyorsa ayni yoldan gecmeli
{
    const t = govde('tedarikci8DTara');
    assert(/renderList\(/.test(t), '4a: tarama listeyi tazelemiyor');
    console.log('✓ 4  zil taraması listeyi renderList üzerinden tazeliyor');
}

console.log('\nTüm senaryolar geçti.');
