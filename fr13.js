/* FR13 "8D Report" — Excel çıktısı (firmanın 8D formatı).
 * Şablon 8d-fr13-template.xlsx; ExcelJS ile yalnız değer hücreleri yazılır, biçim/birleşik hücreler aynen kalır.
 * Ortak kullanılır:
 *   - 8d-rapor.html : LeanSys 8D satırları (düz alan nesnesi r) ve paylaşımlı kayıtlar (docToFr13)
 *   - index.html    : Onaylı Tedarikçi Listesi → DÖF / 8D penceresi (docToFr13, aynı head/d1…d8 yapısı)
 *
 * Şablon satırları: 18 başlık (Target Date / Responsible) → 19 değer · 29 başlık → 30 değer ·
 * 32 başlık (Completion Date) → 33 değer · 35 başlık → 36 değer · 37 = "8 D Takımın Kutlanması" BAŞLIĞI (yazılmaz).
 */
(function () {
  'use strict';
  var EXCELJS = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
  var SABLON = '8d-fr13-template.xlsx';
  // birleşik alanların yaklaşık karakter genişliği (9 punto) — satır yüksekliği tahmini için
  var GENIS = { A: 22.8, B: 18.8, C: 17.8, D: 13, E: 13, F: 13, G: 13, H: 13 };

  function isoToTr(s) {
    var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[3] + '.' + m[2] + '.' + m[1] : (s || '');
  }
  function bos(v) { return v == null || String(v).trim() === ''; }
  // ['a','b'] → "1) a\n2) b"; tek öğe numarasız
  function numarali(liste) {
    liste = (liste || []).map(function (x) { return String(x == null ? '' : x).trim(); }).filter(Boolean);
    return liste.length > 1 ? liste.map(function (x, i) { return (i + 1) + ') ' + x; }).join('\n') : (liste[0] || '');
  }
  function tekil(liste) {
    var g = {};
    return (liste || []).map(function (x) { return String(x == null ? '' : x).trim(); })
      .filter(function (x) { return x && !g[x] && (g[x] = 1); }).join(', ');
  }

  function satirYuksekligi(ws, satir, metin, sutunlar) {
    if (bos(metin)) return;
    var en = sutunlar.split('').reduce(function (t, c) { return t + (GENIS[c] || 13); }, 0) * 1.15;
    var satirSay = String(metin).split('\n').reduce(function (t, p) { return t + Math.max(1, Math.ceil(p.length / en)); }, 0);
    var r = ws.getRow(satir), gerek = Math.min(400, satirSay * 12 + 6);
    if (!r.height || r.height < gerek) r.height = gerek;
  }

  // FR13 şablonunu düz alan nesnesi (r) ile doldurur → rapor no döner
  function fill(ws, r) {
    var yy = (r.seri || '').replace(/\D/g, '').slice(-2) || String(r.acma || '').slice(-2);
    var sira3 = String(r.sira || '').padStart(3, '0');
    var rapNo = r.rapNo || ('8D-' + yy + '-' + sira3);
    var ncr = r.ncr || (r.seri || r.sira ? 'NCR-' + yy + '-' + sira3 : '');
    var set = function (ref, val) { try { ws.getCell(ref).value = (val == null ? '' : String(val)); } catch (e) {} };
    // ── Başlık / D1 (Team Formation) ──
    set('A5', 'Report No: ' + rapNo + (ncr ? '     ·     NCR: ' + ncr : ''));
    set('B7', r.lider);            set('F7', r.tahminiKap);
    set('B8', r.sikayet);          set('F8', r.uyeler);
    set('B9', r.acma);             set('F9', r.cins);
    set('B10', r.tip);
    // ── D2 (Problem Description) ── A15 şablonun "Problem Description" başlığı, metin A16'ya
    set('B12', r.stokKodu);        set('F12', r.acma);
    set('B13', r.stokAdi);         set('F13', rapNo);
    set('B14', r.cari);            set('F14', r.waybill);
    var tarif = [r.tarif, bos(r.hatali) ? '' : 'Hatalı Miktar: ' + r.hatali].filter(function (x) { return !bos(x); }).join('\n');
    set('A16', tarif);                                       satirYuksekligi(ws, 16, tarif, 'ABCDEFGH');
    // ── D3 (Acil Önlem / Containment) ── 18: eylem (G18/H18 başlık) · 19: sonuç + hedef tarih + sorumlu
    set('B18', r.acilOnlem);                                 satirYuksekligi(ws, 18, r.acilOnlem, 'BCDEF');
    set('B19', r.acilSonuc);       set('G19', r.acilHedef);   set('H19', r.acilSorumlu);
    satirYuksekligi(ws, 19, r.acilSonuc, 'BCDEF');
    // ── D4 (Ana Sebep / Root Cause) ── 6M kutuları + sağdaki ana sebep kutusu
    set('A22', r.rYonetim);  set('C22', r.rMethod);  set('E22', r.rMakine);
    set('A26', r.rInsan);    set('C26', r.rMalzeme); set('E26', r.rOlcum);
    set('G21', bos(r.anaSebep) ? r.baslik : 'ANA SEBEP\n\n' + r.anaSebep);
    // ── D5 (Düzeltici) ── 30: metin + hedef tarih + sorumlu
    set('A30', r.planlanan); set('G30', r.planHedef); set('H30', r.planSorumlu);
    satirYuksekligi(ws, 30, r.planlanan, 'ABCDEF');
    // ── D6 (Geçerli kılma) ── 33: metin + tamamlanma tarihi + sorumlu
    set('A33', r.planSonuc); set('G33', r.gecerliTarih); set('H33', r.gecerliSorumlu);
    satirYuksekligi(ws, 33, r.planSonuc, 'ABCDEF');
    // ── D7 (Önleyici) ── 36: eylem (+ yapılan sonuç) + hedef tarih + sorumlu. 37 başlıktır, yazılmaz.
    var onl = [r.onleyici, r.onlSonuc].filter(function (x) { return !bos(x); }).join('\n');
    set('A36', onl);         set('G36', r.onlHedef);  set('H36', r.onlSorumlu);
    satirYuksekligi(ws, 36, onl, 'ABCDEF');
    // ── D8 (Kapanış) ──
    set('B38', r.kapatma);   set('F38', r.kapatildi ? 'Kapalı' : 'Açık');
    set('B39', r.bildirimTrh); set('B40', r.bildirimYontemi);
    set('B41', r.fiiliKapatma); set('B42', r.ilgili);
    set('B43', r.sonuc);     set('B44', r.etkinlikTrh || r.fiiliKapatma || ''); set('B45', r.kapatan);
    satirYuksekligi(ws, 43, r.sonuc, 'BCD');
    set('A46', '8 D Raporu KAPALI / AÇIK  →  ' + (r.kapatildi ? 'KAPALI' : 'AÇIK'));
    return rapNo;
  }

  function exceljsYukle() {
    if (window.ExcelJS) return Promise.resolve();
    return new Promise(function (ok, red) {
      var s = document.createElement('script'); s.src = EXCELJS;
      s.onload = ok; s.onerror = function () { red(new Error('ExcelJS yüklenemedi')); };
      document.head.appendChild(s);
    });
  }

  async function download(r, dosyaAdi) {
    await exceljsYukle();
    var yanit = await fetch(SABLON + '?v=' + Date.now());
    if (!yanit.ok) throw new Error('FR13 şablonu yüklenemedi (' + yanit.status + ')');
    var wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await yanit.arrayBuffer());
    var rapNo = fill(wb.worksheets[0], r);
    var out = await wb.xlsx.writeBuffer();
    var blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (dosyaAdi || (rapNo + ' (' + (r.stokKodu || r.seri || '8D') + ')')).replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.xlsx';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    return rapNo;
  }

  // 8D kaydı (head, d1…d8 — index.html'deki 8D penceresi ve paylaşımlı arşiv aynı yapıda) → FR13 alanları
  var ALTI_M = { 'Yönetim': 'rYonetim', 'Metot': 'rMethod', 'Makine': 'rMakine', 'İnsan': 'rInsan', 'Malzeme': 'rMalzeme', 'Ölçüm': 'rOlcum' };
  var VDA_KOK = { tco: 'TCO (teknik — oluşum)', tcn: 'TCN (teknik — tespit edilememe)', sco: 'SCO (sistemik — oluşum)', scn: 'SCN (sistemik — tespit edilememe)' };
  function docToFr13(doc) {
    if (doc && doc._raw) return doc._raw;                     // ham LeanSys satırı: tam sadakat
    var h = doc.head || {}, d1 = doc.d1 || {}, d2 = doc.d2 || {}, d3 = doc.d3 || {}, d4 = doc.d4 || {},
        d5 = doc.d5 || {}, d6 = doc.d6 || {}, d7 = doc.d7 || {}, d8 = doc.d8 || {};
    var ekip = (d1.teamMembers || []).filter(function (m) { return m && !bos(m.name); });
    var r3 = d3.actions || [], r5 = d5.actions || [], r6 = d6.implementations || [], r7 = d7.preventions || [];
    var kok = {}, anaSebep = [];
    (d4.rootCauses || []).forEach(function (c) {
      if (!c) return;
      var metin = [c.title, c.description].filter(function (x) { return !bos(x); }).join(': ');
      if (ALTI_M[c.type]) kok[ALTI_M[c.type]] = metin;            // 6M sınıflaması varsa balık kılçığına
      else if (!bos(metin)) anaSebep.push((VDA_KOK[c.type] || c.type || 'Kök neden') + ' — ' + metin
        + (bos(c.verification) ? '' : ' · Doğrulama: ' + c.verification) + (bos(c.results) ? '' : ' · Sonuç: ' + c.results));
    });
    var tarihler = function (l, f) { return tekil(l.map(function (x) { return isoToTr(f(x)); })); };
    var durum = String(h.status || '').toLowerCase();
    var r = {
      rapNo: h.reportNumber || '', seri: '', sira: '', ncr: '',
      lider: ekip[0] ? ekip[0].name + (bos(ekip[0].position) ? '' : ' (' + ekip[0].position + ')') : '',
      tahminiKap: tarihler(r5, function (a) { return a.planDate || a.date; }).split(', ').pop() || '',
      sikayet: isoToTr(h.startDate), uyeler: tekil(ekip.map(function (m) { return m.name; })),
      acma: isoToTr(h.startDate), cins: d2.errorType || '', tip: h.subject || h.title || '',
      stokKodu: h.partNumber, stokAdi: h.partName, cari: h.customer, waybill: '',
      tarif: [h.defectDescription, d2.problem && d2.problem !== h.defectDescription ? d2.problem : '', d2.symptom]
        .filter(function (x) { return !bos(x); }).join('\n')
        + (bos(h.totalCheckedQuantity) ? '' : '\nKontrol edilen: ' + h.totalCheckedQuantity + (bos(h.defectRate) ? '' : ' · Hata oranı: %' + h.defectRate))
        + (bos(h.detectionPoint) ? '' : '\nTespit yeri: ' + h.detectionPoint),
      hatali: h.defectQuantity,
      acilOnlem: numarali(r3.map(function (a) { return a.description; })),
      acilSorumlu: tekil(r3.map(function (a) { return a.responsible; })),
      acilHedef: tarihler(r3, function (a) { return a.date; }), acilSonuc: '',
      rYonetim: kok.rYonetim, rMethod: kok.rMethod, rMakine: kok.rMakine, rInsan: kok.rInsan, rMalzeme: kok.rMalzeme, rOlcum: kok.rOlcum,
      anaSebep: anaSebep.join('\n'),
      planlanan: numarali(r5.map(function (a) { return a.action || a.description; })),
      planHedef: tarihler(r5, function (a) { return a.planDate || a.date; }),
      planSorumlu: tekil(r5.map(function (a) { return a.responsible; })),
      planSonuc: numarali(r6.map(function (a) { return a.action; })),
      gecerliTarih: tarihler(r6, function (a) { return a.validatedOn || a.effectiveFrom || a.launchDate; }),
      gecerliSorumlu: tekil(r6.map(function (a) { return a.responsible; })),
      onleyici: numarali(r7.map(function (a) { return a.description; })),
      onlHedef: tarihler(r7, function (a) { return a.planned || a.date; }),
      onlSorumlu: tekil(r7.map(function (a) { return a.responsible; })),
      onlSonuc: numarali(r7.map(function (a) { return a.assessment; })),
      baslik: h.title,
      kapatma: isoToTr(d8.closeDate || d8.finalMeetingDate),
      kapatildi: doc._kapatildi || durum === 'closed' || durum.indexOf('kapal') === 0 ? 1 : 0,
      bildirimTrh: isoToTr(d8.bildirimTrh || d8.finalMeetingDate), bildirimYontemi: '',
      fiiliKapatma: isoToTr(d8.performedOn),
      ilgili: tekil((d8.participants || []).map(function (p) { return p && p.name; })) || d8.assessmentBy || '',
      sonuc: [d8.result, d8.finalDiscussion].filter(function (x) { return !bos(x); }).join('\n'),
      etkinlikTrh: isoToTr(d8.performedOn), kapatan: d8.assessmentBy || ''
    };
    return r;
  }

  window.FR13 = { fill: fill, download: download, docToFr13: docToFr13, isoToTr: isoToTr };
})();
