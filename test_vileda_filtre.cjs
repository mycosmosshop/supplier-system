// Vileda tedarikci filtresi: anahtar Turkce harflere dayanikli mi, liste tam mi?  node test_vileda_filtre.cjs
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/index.html', 'utf8');
const al = (bas, son) => { const i = src.indexOf(bas), j = src.indexOf(son, i); assert(i > 0 && j > i, bas); return src.slice(i, j); };
const kod = al('function normalizeName(name)', '// ========= ') + al('function _vledaAnahtar', 'async function _vledaYukle');
const f = new Function(kod + '; return { normalizeName, _vledaAnahtar };')();
const liste = JSON.parse(fs.readFileSync(__dirname + '/vileda_tedarikci.json', 'utf8'));
// 1) Ayni firmanin LeanSys yazim farklari tek anahtara duser
const k = f._vledaAnahtar;
assert.strictEqual(k('RTC KIMYA ITH.IHR.SAN. VE TIC. LTD.STI'), k('RTC KİMYA İTH. İHR. SAN. VE TİC. LTD.'), '1a RTC');
assert.strictEqual(k('KEMİTEKS KİMYA SAN.VE TIC.A.S.'), k('KEMİTEKS KİMYA SAN.VE TİC.A.Ş. (EUR)'), '1b Kemiteks');
assert.strictEqual(k('ATEŞSAN AMBALAJ SANAYİ VE TİCARET A.Ş.'), k('Ateşsan Ambalaj San. ve Tic. A.Ş.'), '1c Ateşsan');
assert(!/[\u0300-\u036f]/.test(k('KİMYA İTH')), '1d birleşik nokta kaldı');
// 2) Farkli firmalar karismaz
assert.notStrictEqual(k('AS KİMYA SANAYI VE DIS TIC. A.S'), k('AKRAPOL KİMYA SAN. VE TIC.LTD.STI.'), '2a');
assert.notStrictEqual(k('BASF TÜRK KIMYA SAN. VE TIC. LTD. STI.'), k('BASF AKTIENGESELLSCHAFT'), '2b');
// 3) Listede her kayit bos olmayan anahtar uretir; bilinen Velikoy tedarikcileri listede
assert(liste.length >= 35 && liste.every(t => k(t.ad).length >= 3), '3a');
const anahtarlar = new Set(liste.map(t => k(t.ad)));
for (const ad of ['SAFAŞ SAF PLASTIK SAN.ve TIC.A.S.', 'KURŞUN AMBALAJ KUYUMCULUK SAN.TIC.LTD.', 'SERKA PLASTIK AMB.SAN.TIC.LTD.STI.',
                  'AFG ÇELİK YAPI VE KİMYA LTD.ŞTİ.', 'SPONCEL SP. Z.O.O.', 'NARFEN MEDYA REKLAM AMB.BASKI TEKN.SAN'])
  assert(anahtarlar.has(k(ad)), '3b eksik: ' + ad);
// 4) Filtre filterTable'a bagli, buton sayfada
assert(src.includes('const vledaMatch = !vledaFiltre || !!_vledaKayit(r.name);') && src.includes('&& vledaMatch;'), '4a');
assert(src.includes('id="vledaFiltreBtn"') && src.includes('onclick="toggleVledaFiltre()"'), '4b');
console.log('TAMAM —', liste.length, 'Vileda tedarikçisi,', anahtarlar.size, 'ayrı anahtar');
