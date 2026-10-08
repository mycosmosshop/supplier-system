// Kaydedilmis filtre "Velikoy Vileda Tedarikcileri <yil>": dogru donemde, dogru tedarikcilerle,
// bir kez kuruluyor mu; diger filtrelere dokunuyor mu?   node test_vileda_filtre.cjs
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/index.html', 'utf8');
const al = (bas, son) => { const i = src.indexOf(bas), j = src.indexOf(son, i); assert(i > 0 && j > i, bas); return src.slice(i, j); };
const kod = al('function normalizeName(name)', '// ========= ') + al('let VILEDA_TED = null', '// Sıralama değişkenleri');
const liste = JSON.parse(fs.readFileSync(__dirname + '/vileda_tedarikci.json', 'utf8'));

function ortam() {
  const ls = {};
  const g = {
    localStorage: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } },
    document: { querySelectorAll: () => ['Çerkezköy', 'Veliköy', 'Ankara'].map(v => ({ value: v })) },
    fetch: async () => ({ ok: true, json: async () => liste }), console, loadSavedFilters: () => { g._ciz = (g._ciz || 0) + 1; }
  };
  const api = new Function('g', 'with (g) {' + kod + '; return { _vledaAnahtar, _vledaFiltreTohumla, VLEDA_ID_TABAN }; }')(g);
  return [g, ls, api];
}
// mapKey uygulamadaki gibi normalizeName(ad)
const nn = new Function(al('function normalizeName(name)', '// ========= ') + '; return normalizeName;')();
const sonuc = ads => ads.map(a => ({ name: a, mapKey: nn(a) }));

(async () => {
  const [g, ls, api] = ortam();
  const k = api._vledaAnahtar;
  // 1) Turkce yazim farklari tek anahtar, farkli firmalar ayri
  assert.strictEqual(k('RTC KIMYA ITH.IHR.SAN. VE TIC. LTD.STI'), k('RTC KİMYA İTH. İHR. SAN. VE TİC. LTD.'), '1a');
  assert.strictEqual(k('KEMİTEKS KİMYA SAN.VE TIC.A.S.'), k('KEMİTEKS KİMYA SAN.VE TİC.A.Ş. (EUR)'), '1b');
  assert.notStrictEqual(k('AS KİMYA SANAYI VE DIS TIC. A.S'), k('AKRAPOL KİMYA SAN. VE TIC.LTD.STI.'), '1c');
  assert(!/[̀-ͯ]/.test(k('KİMYA İTH')), '1d');

  // 2) Liste yuklenmeden once tohumlama: yukler, sonra listeyi yeniden cizdirir
  const mevcut = [{ id: 1, name: 'Çerkezköy Otomotiv Tedarikçileri 2026', period: 'Sanifoam 2026', selectedSuppliers: ['x'] },
                  { id: 2, name: 'Ankara Otomotiv Onaylı Tedarikçi Listesi 2026', period: 'Sanifoam 2026', selectedSuppliers: ['y'] }];
  ls.supplierFilters = JSON.stringify(mevcut);
  ls._currentPeriodName = 'Sanifoam 2026';
  const ADLAR = ['SAFAŞ SAF PLASTIK SAN.ve TIC.A.S.', 'AFG ÇELİK YAPI VE KİMYA LTD.ŞTİ.', 'RTC KİMYA İTH. İHR. SAN. VE TİC. LTD.',
                 'KOBE POLIÜRETAN SAN. VE TIC. A.S.', 'YENI ITIMAT PLS.SAN.VE TIC.LTD.STI.', 'CORNEX TEMIZLIK ÜRÜNLERI SAN.TİC.LTD.ŞTİ.'];
  g.allResults = sonuc(ADLAR);
  api._vledaFiltreTohumla();
  await new Promise(r => setTimeout(r, 0));
  assert.strictEqual(g._ciz, 1, '2a: yükleme sonrası liste çizilmedi');
  api._vledaFiltreTohumla();   // artik liste yuklu → kurar
  const f = JSON.parse(ls.supplierFilters);
  assert.strictEqual(f.length, 3, '2b: filtre sayısı ' + f.length);
  assert.deepStrictEqual(f.slice(0, 2), mevcut, '2c: Çerkezköy/Ankara filtresi değişti');
  const v = f[2];
  assert.strictEqual(v.id, api.VLEDA_ID_TABAN + 2026, '2d id');
  assert.strictEqual(v.name, 'Veliköy Vileda Tedarikçileri 2026', '2e ad');
  assert.strictEqual(v.period, 'Sanifoam 2026', '2f dönem');
  // 2026: Safas ve AFG'nin 2026 girisi var; RTC 2024'te birakildi (2022 listesinde alternatif degil) → yok;
  // Kobe yalniz 2022 listesinde alternatif → var; Yeni Itimat Vileda tedarikcisi degil; Cornex son giris 2023
  const ad = new Set(v.selectedSuppliers);
  [ADLAR[0], ADLAR[1], ADLAR[3]].forEach(x => assert(ad.has(nn(x)), '2g yok: ' + x));
  [ADLAR[2], ADLAR[4], ADLAR[5]].forEach(x => assert(!ad.has(nn(x)), '2h olmamalı: ' + x));
  assert.deepStrictEqual(v.selectedLocations, ['Çerkezköy', 'Veliköy', 'Ankara'], '2i lokasyon kısıtı olmamalı');

  // 3) Ikinci cagri tekrar eklemez; kullanici sildiyse geri gelmez
  api._vledaFiltreTohumla();
  assert.strictEqual(JSON.parse(ls.supplierFilters).length, 3, '3a çift filtre');
  ls.supplierFilters = JSON.stringify(mevcut);
  ls._vledaSilinen = JSON.stringify([api.VLEDA_ID_TABAN + 2026]);
  api._vledaFiltreTohumla();
  assert.strictEqual(JSON.parse(ls.supplierFilters).length, 2, '3b silinen geri geldi');

  // 4) 2023 donemi: RTC'nin 2023 girisi var → filtrede; baska firma donemi → kurulmaz
  ls._vledaSilinen = '[]'; ls._currentPeriodName = 'Sanifoam 2023'; ls.supplierFilters = '[]';
  api._vledaFiltreTohumla();
  const f23 = JSON.parse(ls.supplierFilters)[0];
  assert(f23 && f23.name.endsWith('2023') && f23.selectedSuppliers.includes(nn(ADLAR[2])), '4a 2023');
  ls._currentPeriodName = 'Ultech 2026'; ls.supplierFilters = '[]';
  api._vledaFiltreTohumla();
  assert.strictEqual(JSON.parse(ls.supplierFilters).length, 0, '4b başka firma dönemi');

  // 5) Sayfa baglantilari: tohumlama loadSavedFilters'ta, silme kaydi deleteFilter'da; eski buton yok
  assert(/function loadSavedFilters\(\) \{\s*try \{ _vledaFiltreTohumla\(\);/.test(src), '5a');
  assert(src.includes("localStorage.setItem('_vledaSilinen'"), '5b');
  assert(!src.includes('vledaFiltreBtn') && !src.includes('vledaMatch'), '5c eski buton kaldı');
  console.log('TAMAM —', liste.length, 'Vileda tedarikçisi; 2026 örnek filtresi', v.selectedSuppliers.length, 'tedarikçi');
})().catch(e => { console.error(e); process.exit(1); });
