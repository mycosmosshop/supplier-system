// Supabase -> uygulama tablosu hattinda Temmuz/Agustos kayboluyor mu?
// Uygulamanin KENDI ptBuildPpmAoa kodu, gercek supplier_monthly verisiyle calistirilir.
//   calistir:  node test_pt_aylar.js
const fs = require('fs'), assert = require('assert'), https = require('https');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

function blok(bas, son) {
  const i = html.indexOf(bas); assert(i > 0, bas + ' bulunamadi');
  const j = html.indexOf(son, i); assert(j > i, son + ' bulunamadi');
  return html.slice(i, j);
}
const ptBuildPpmAoa = new Function(
  blok('function ptBuildPpmAoa(', '\n        function ptBuildTerminAoa') + 'return ptBuildPpmAoa;')();

const KEY = html.match(/const PT_ANON = "([^"]+)"/)[1];
const URL0 = html.match(/const PT_SUPA = "([^"]+)"/)[1];

function get(url) {
  return new Promise((ok, hata) => {
    https.get(url, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } }, r => {
      let b = ''; r.on('data', d => b += d); r.on('end', () => { try { ok(JSON.parse(b)); } catch (e) { hata(new Error(b.slice(0, 200))); } });
    }).on('error', hata);
  });
}
// ptFetchMonthly ile AYNI sayfalama
async function ptFetchMonthly(firma, year) {
  let all = [];
  for (let off = 0; off < 60000; off += 1000) {
    const d = await get(URL0 + '/rest/v1/supplier_monthly?firma=eq.' + encodeURIComponent(firma) +
      '&year=eq.' + year + '&select=*&order=supplier_norm,month&offset=' + off + '&limit=1000');
    all = all.concat(d);
    if (!d.length || d.length < 1000) break;
  }
  return all;
}

(async () => {
  const rows = await ptFetchMonthly('SANIFOAM', 2026);
  console.log('supplier_monthly satir:', rows.length);
  const ayAdet = {};
  rows.forEach(r => { ayAdet[r.month] = (ayAdet[r.month] || 0) + 1; });
  console.log('ham veri ay dagilimi:', JSON.stringify(ayAdet));

  const aoa = ptBuildPpmAoa(rows);
  const basliklar = aoa[0], aySatiri = aoa[1];
  // "Sevk" sutunlarinin ay numaralari
  const sevkSutun = {};
  for (let c = 1; c < basliklar.length; c++) {
    if (basliklar[c] === 'Sevk') {
      // ay numarasi ayni bloktaki ilk hucrede (Iade sutunu)
      sevkSutun[aySatiri[c - 1]] = c;
    }
  }
  console.log('AoA Sevk sutunlari (ay -> sutun):', JSON.stringify(sevkSutun));

  const ayToplam = {};
  for (let ay = 1; ay <= 12; ay++) {
    const c = sevkSutun[ay];
    if (c == null) { ayToplam[ay] = 'SUTUN YOK'; continue; }
    let t = 0;
    for (let i = 2; i < aoa.length; i++) t += (parseFloat(aoa[i][c]) || 0);
    ayToplam[ay] = Math.round(t);
  }
  console.log('\nAoA ay bazinda TOPLAM SEVK:');
  Object.keys(ayToplam).forEach(a => console.log('  ay ' + a.padStart(2) + ' : ' + ayToplam[a]));

  const ornek = ['AVS AMBALAJ', 'ALTERNATIF', 'DURFOM', 'BERKOSAN'];
  console.log('\nOrnek firmalar (ay 6/7/8 sevk):');
  for (let i = 2; i < aoa.length; i++) {
    const ad = String(aoa[i][0] || '');
    if (!ornek.some(o => ad.toUpperCase().includes(o))) continue;
    console.log('  ' + ad.slice(0, 42).padEnd(42) +
      ' 6=' + aoa[i][sevkSutun[6]] + '  7=' + aoa[i][sevkSutun[7]] + '  8=' + aoa[i][sevkSutun[8]]);
  }

  assert.ok(ayToplam[7] > 0, 'Temmuz sevki AoA icinde SIFIR — hat bozuk');
  assert.ok(ayToplam[8] > 0, 'Agustos sevki AoA icinde SIFIR — hat bozuk');
  console.log('\nOK Temmuz ve Agustos verisi Supabase -> AoA hattinda EKSIKSIZ geliyor.');
})().catch(e => { console.error('HATA:', e.message); process.exit(1); });
