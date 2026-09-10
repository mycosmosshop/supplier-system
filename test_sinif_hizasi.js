/* Sinif rozetleri hizali mi?  node _sinif_hiza_test.js
 *
 * Canli dosyadan GERCEK fonksiyonu ve GERCEK CSS'i cikarip bir olcum
 * sayfasi uretir. Tarayicida acilinca ikonlu ve ikonsuz satirlarin
 * rozet sol kenarlari karsilastirilir — esitse zigzag yok.
 */
const fs = require('fs');
const K = fs.readFileSync(
    __dirname + '/index.html', 'utf8');

/* 1) Fonksiyonu cikar */
const fbas = K.indexOf('function sinifHucresiHtml');
const fson = K.indexOf('\n        }', fbas) + '\n        }'.length;
const fn = K.slice(fbas, fson);

/* 2) Ilgili CSS bloklarini cikar */
function cssAl(sec) {
    const i = K.indexOf(sec + ' {');
    if (i < 0) throw new Error('CSS yok: ' + sec);
    return K.slice(i, K.indexOf('}', i) + 1);
}
const css = ['.sinif-kutu', '.sinif-kutu .sinif-uyari',
             '.supplier-class-badge'].map(cssAl).join('\n');

/* 3) Yapi kontrolu (tarayicisiz) */
let hata = 0;
const ol = (ad, k, ek) => {
    if (k) console.log('  ✓ ' + ad + (ek ? '  ' + ek : ''));
    else { console.log('  ✗ ' + ad + (ek ? ' — ' + ek : '')); hata++; }
};

const uret = new Function('sinifTavaniSebep',
    fn + '\nreturn sinifHucresiHtml;');
const ikonlu = uret(() => 'PR06 sınıf tavanı: IATF yok')(
    { name: 'ALFA' }, 'B', 'supplier-class-badge');
const ikonsuz = uret(() => '')(
    { name: 'BETA' }, 'A', 'supplier-class-badge');

const sayac = (h, s) => (h.match(new RegExp(s, 'g')) || []).length;
ol('ikonlu ve ikonsuz AYNI yapida',
   sayac(ikonlu, '<span') === sayac(ikonsuz, '<span'),
   sayac(ikonlu, '<span') + ' vs ' + sayac(ikonsuz, '<span') + ' span');
ol('ikon alani ikonsuz satirda da var',
   /sinif-uyari/.test(ikonsuz));
ol('ikonsuz satirda uyari isareti YOK', !/⚠/.test(ikonsuz));
ol('ikonlu satirda uyari isareti VAR', /⚠/.test(ikonlu));
ol('rozet sinifi korunuyor',
   /supplier-class-badge class-b/.test(ikonlu)
   && /supplier-class-badge class-a/.test(ikonsuz));
ol('puan dokumu tikligi korunuyor',
   /puanDokumuAc/.test(ikonlu) && /puanDokumuAc/.test(ikonsuz));

/* 4) Tarayicida olculecek sayfa */
const sayfa = `<title>Sınıf hizası ölçümü</title>
<style>
body{font:14px system-ui;padding:20px;background:#f4f7fb}
table{border-collapse:collapse;background:#fff}
td{border:1px solid #d5dde8;padding:6px 14px}
.text-center{text-align:center}
.class-a{background:#92D050}.class-b{background:#FFFF00}
.class-c{background:#FFC000}.class-d{background:#FF0000;color:#fff}
${css}
#sonuc{margin-top:16px;font:600 15px system-ui}
</style>
<table><tbody id="g"></tbody></table>
<div id="sonuc">ölçülüyor…</div>
<script>
${fn.replace(/^\s*function/, 'function')}
let _tavan = true;
function sinifTavaniSebep(){ return _tavan ? 'PR06 sınıf tavanı: IATF yok' : ''; }
const satirlar = [['B',1],['A',0],['B',1],['B',1],['A',0],['C',1],['A',0],['D',1]];
document.getElementById('g').innerHTML = satirlar.map(function(r){
  _tavan = !!r[1];
  return '<tr><td>%98,4</td><td class="text-center">'
    + sinifHucresiHtml({name:'X'}, r[0], 'supplier-class-badge') + '</td></tr>';
}).join('');
const roz = [...document.querySelectorAll('.supplier-class-badge')]
  .map(function(e){ return Math.round(e.getBoundingClientRect().left); });
const enk = Math.min(...roz), enb = Math.max(...roz);
document.getElementById('sonuc').textContent =
  (enb - enk === 0 ? '✓ HİZALI' : '✗ ZİGZAG — ' + (enb - enk) + 'px kayma')
  + '  ·  sol kenarlar: ' + roz.join(', ');
document.title = (enb - enk === 0 ? 'HIZALI' : 'ZIGZAG-' + (enb - enk));
</script>`;
fs.writeFileSync('D:/Yazılım/_sinif_hiza_test.html', sayfa, 'utf8');
console.log('\nölçüm sayfası: D:/Yazılım/_sinif_hiza_test.html');
console.log(hata ? hata + ' yapı kontrolü BAŞARISIZ' : 'yapı kontrolleri geçti');
process.exit(hata ? 1 : 0);
