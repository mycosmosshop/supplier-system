/***** Tedarikçi Değerlendirme — Google Drive Yedekleme Backend (Apps Script) *****
 * Bu kodu script.google.com'da yeni bir projeye yapıştır, SECRET'i değiştir,
 * Web App olarak yayınla. Detay: DRIVE-KURULUM.txt
 ********************************************************************************/

// "Tedarikçi Değerlendirme" klasörünün ID'si (zaten oluşturuldu):
var FOLDER_ID = '1bF7hH7koEtpx-OujX31fNb-Qe0z8z9b9';

// Güvenlik anahtarı — uygulamadaki "secret" ile AYNI olmalı. DEĞİŞTİR!
var SECRET = 'Sanifoam2026Drive';

function doGet(e) {
  var p = (e && e.parameter) || {};
  var cb = p.callback;
  var out;
  try {
    if (p.secret !== SECRET) {
      out = { success: false, error: 'Yetkisiz (secret hatali)' };
    } else if (p.action === 'test') {
      out = { success: true, folder: DriveApp.getFolderById(FOLDER_ID).getName() };
    } else if (p.action === 'list') {
      out = { success: true, files: listBackups() };
    } else if (p.action === 'latest') {
      out = latestBackup();
    } else if (p.action === 'getfile') {
      out = getFileByName(p.name);
    } else {
      out = { success: false, error: 'Bilinmeyen action' };
    }
  } catch (err) {
    out = { success: false, error: String(err) };
  }
  var json = JSON.stringify(out);
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var out;
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) {
      out = { success: false, error: 'Yetkisiz' };
    } else if (body.action === 'save') {
      var folder = DriveApp.getFolderById(FOLDER_ID);
      var name = body.name || ('YEDEK_' + new Date().getTime() + '.json');
      // UPSERT: ayni isimde dosya varsa uzerine yaz (cift kayit olmasin)
      var ex = folder.getFilesByName(name);
      if (ex.hasNext()) { ex.next().setContent(body.content); }
      else { folder.createFile(name, body.content, 'application/json'); }
      // Guncel yedek kaydedilince eski zaman-damgali otomatik yedekleri sil (Drive'da TEK dosya kalsin)
      if (name === 'GUNCEL_YEDEK.json') {
        var old = folder.getFiles();
        while (old.hasNext()) { var of = old.next(); if (/^YEDEK_\d/.test(of.getName())) { of.setTrashed(true); } }
      }
      out = { success: true, name: name };
    } else {
      out = { success: false, error: 'Bilinmeyen action' };
    }
  } catch (err) {
    out = { success: false, error: String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function listBackups() {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var files = [];
  var it = folder.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (f.getName().indexOf('YEDEK_') === 0 || f.getName() === 'GUNCEL_YEDEK.json') {
      files.push({
        name: f.getName(),
        id: f.getId(),
        sizeMB: (f.getSize() / 1048576).toFixed(2),
        date: f.getLastUpdated().toISOString()
      });
    }
  }
  files.sort(function (a, b) { return b.name.localeCompare(a.name); });
  return files;
}

function latestBackup() {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  // Once GUNCEL_YEDEK.json (tek guncel dosya)
  var g = folder.getFilesByName('GUNCEL_YEDEK.json');
  if (g.hasNext()) { var gf = g.next(); return { success: true, name: 'GUNCEL_YEDEK.json', content: gf.getBlob().getDataAsString() }; }
  var files = listBackups();
  if (!files.length) return { success: true, content: null };
  var f = DriveApp.getFileById(files[0].id);
  return { success: true, name: files[0].name, content: f.getBlob().getDataAsString() };
}

// Belirli bir dosyayı isimle getir (paylaşım linkleri için)
function getFileByName(name) {
  if (!name) return { success: false, error: 'Dosya adi yok' };
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var it = folder.getFilesByName(name);
  if (it.hasNext()) {
    var f = it.next();
    return { success: true, name: name, content: f.getBlob().getDataAsString() };
  }
  return { success: false, error: 'Dosya bulunamadi: ' + name };
}
