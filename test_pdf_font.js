// PDF'lerde Turkce: jsPDF'in gomulu Helvetica'si ı İ ş Ş ğ Ğ icermez. Cozum,
// index.html'deki PDF_FONT adreslerinden Unicode TTF indirmek. Bu test o
// adreslerin ERISILEBILIR oldugunu ve fontun Turkce harfleri GERCEKTEN
// icerdigini dogrular (CDN kaybolursa / yanlis font konursa burada patlar).
//   calistir:  node test_pdf_font.js
const fs = require('fs'), assert = require('assert'), https = require('https');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

// Adresleri HTML'den al (kopya degil)
const blok = html.slice(html.indexOf('const PDF_FONT = {'), html.indexOf('async function pdfTurkceFont'));
const urls = [...blok.matchAll(/https:\/\/[^\s']+\.ttf/g)].map(m => m[0]);
assert.strictEqual(urls.length, 2, 'normal ve bold olmak uzere 2 font adresi bekleniyor, bulunan: ' + urls.length);

function indir(u, yonlendirme = 0) {
  return new Promise((ok, hata) => {
    https.get(u, r => {
      if ([301, 302, 307, 308].includes(r.statusCode) && r.headers.location && yonlendirme < 5) {
        r.resume(); return indir(r.headers.location, yonlendirme + 1).then(ok, hata);
      }
      if (r.statusCode !== 200) { r.resume(); return hata(new Error('HTTP ' + r.statusCode + ' → ' + u)); }
      const p = []; r.on('data', d => p.push(d)); r.on('end', () => ok(Buffer.concat(p)));
    }).on('error', hata);
  });
}

// TTF cmap (format 4) icinde kod noktasi var mi?
function kapsar(buf, kodlar) {
  const tabloSayisi = buf.readUInt16BE(4), tablo = {};
  for (let i = 0; i < tabloSayisi; i++) {
    const o = 12 + 16 * i;
    tablo[buf.toString('latin1', o, o + 4)] = { off: buf.readUInt32BE(o + 8) };
  }
  assert(tablo['cmap'], 'cmap tablosu yok — bu bir TTF degil');
  const c = buf.subarray(tablo['cmap'].off);
  const alt = c.readUInt16BE(2);
  let sec = null;
  for (let i = 0; i < alt; i++) {
    const pid = c.readUInt16BE(4 + 8 * i), eid = c.readUInt16BE(6 + 8 * i), off = c.readUInt32BE(8 + 8 * i);
    if ((pid === 3 && (eid === 1 || eid === 10)) || (pid === 0)) sec = off;
  }
  assert(sec != null, 'Unicode cmap alt tablosu yok');
  const s = c.subarray(sec);
  assert.strictEqual(s.readUInt16BE(0), 4, 'cmap format 4 bekleniyor');
  const segX2 = s.readUInt16BE(6), seg = segX2 / 2;
  const son = [], bas = [];
  for (let i = 0; i < seg; i++) son.push(s.readUInt16BE(14 + 2 * i));
  for (let i = 0; i < seg; i++) bas.push(s.readUInt16BE(16 + segX2 + 2 * i));
  return kodlar.filter(cp => !bas.some((b, i) => b <= cp && cp <= son[i]));
}

const TR = { 'ı': 0x0131, 'İ': 0x0130, 'ş': 0x015F, 'Ş': 0x015E, 'ğ': 0x011F, 'Ğ': 0x011E,
             'ü': 0x00FC, 'Ü': 0x00DC, 'ö': 0x00F6, 'Ö': 0x00D6, 'ç': 0x00E7, 'Ç': 0x00C7 };

(async () => {
  for (const u of urls) {
    const buf = await indir(u);
    assert.ok(buf.length > 50000, 'font dosyasi kucuk/bozuk: ' + buf.length + ' bayt → ' + u);
    const eksik = kapsar(buf, Object.values(TR));
    const eksikAd = Object.keys(TR).filter(k => eksik.includes(TR[k]));
    assert.strictEqual(eksik.length, 0,
      'Turkce harf(ler) fontta YOK: ' + eksikAd.join(' ') + ' → ' + u);
    console.log('OK ' + (buf.length / 1024).toFixed(0).padStart(4) + ' KB · tum Turkce harfler var · ' + u.split('/').pop());
  }
  console.log('\nOK PDF fontu Turkce uyumlu (ı İ ş Ş ğ Ğ ü Ü ö Ö ç Ç)');
})().catch(e => { console.error('HATA:', e.message); process.exit(1); });
