/* Tedarikçi CANLI SENKRON (additive) — localStorage'ı Supabase'e yansıtır + Realtime.
   - Uygulamanın kendi fonksiyonlarına DOKUNMAZ (localStorage API'sini sarmalar).
   - Büyük dosyalar Storj'da kalır (bu katman onlara karışmaz).
   - Paylaşım/supplier modunda (dış tedarikçi) ÇALIŞMAZ.
   - Yalnızca onaylı ERP oturumu varsa çalışır (RLS de korur).
*/
(function(){
  var SUPA_URL='https://chchaielttnimuuezazb.supabase.co';
  var SUPA_KEY='sb_publishable_S2ywbq7TkgcZKiVif3td-A_oAuQL3QT';
  var ROW_ID='tedarikci';

  // Paylaşılan İŞ verisi anahtarları (UI seçimleri ve SIRLAR hariç)
  var KEYS=['selectedSuppliers','tdsData',
            'supplierStatusMap','supplierInfoMap','supplierListForCOA','supplierCertData',
            'supplierStatusHistory','supplierEditsHistory','statusChangeHistory','activityHistory',
            'targetAgreements','documentTypes','customQualityCertTypes'];
  var PREFIXES=['ppmTarget_','hataHedefi_'];
  function isSynced(k){ if(!k) return false; if(KEYS.indexOf(k)>=0) return true; for(var i=0;i<PREFIXES.length;i++){ if(k.indexOf(PREFIXES[i])===0) return true; } return false; }

  // Paylaşım/supplier modunda senkron yok (dış kullanıcı, Storj akışı)
  if(/[?&](mode=supplier|storj=|share=|shared|view=)/i.test(location.search)) return;
  if(!(window.supabase && window.supabase.createClient)) return;

  var sb=window.supabase.createClient(SUPA_URL, SUPA_KEY, {auth:{persistSession:true, autoRefreshToken:true}});
  var _applying=false, _lastEdit=0, _uid=null, _pushTimer=null;

  function snapshot(){ var o={}; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(isSynced(k)) o[k]=localStorage.getItem(k); } return o; }
  function applyRemote(data){ if(!data) return false; _applying=true; var ch=false;
    try{ Object.keys(data).forEach(function(k){ if(isSynced(k) && localStorage.getItem(k)!==data[k]){ _origSet(k, data[k]); ch=true; } }); }
    finally{ _applying=false; } return ch; }
  function pushNow(){ if(_applying||!_uid) return;
    sb.from('supplier_sync').upsert({ id:ROW_ID, data:snapshot(), updated_at:new Date().toISOString(), updated_by:_uid })
      .then(function(r){ if(r.error) console.warn('[sync] push', r.error.message); }); }
  function schedulePush(){ if(_applying) return; _lastEdit=Date.now(); clearTimeout(_pushTimer); _pushTimer=setTimeout(pushNow, 1200);
    // Edit olunca otomatik Drive yedeği de tetikle (kendi yazımı hariç — döngü koruması)
    try{ if(!window._driveBackupInProgress && typeof window.autoDriveBackup==='function') window.autoDriveBackup(); }catch(e){} }

  // localStorage'ı sarmala (uygulama fonksiyonlarına dokunmadan)
  var _origSet=localStorage.setItem.bind(localStorage);
  var _origRem=localStorage.removeItem.bind(localStorage);
  localStorage.setItem=function(k,v){ _origSet(k,v); try{ if(isSynced(k)) schedulePush(); }catch(e){} };
  localStorage.removeItem=function(k){ _origRem(k); try{ if(isSynced(k)) schedulePush(); }catch(e){} };

  function banner(){ if(document.getElementById('erpSyncBanner')) return;
    var b=document.createElement('div'); b.id='erpSyncBanner';
    b.style.cssText='position:fixed;bottom:16px;right:16px;z-index:2147483647;background:#0288d1;color:#fff;padding:10px 14px;border-radius:10px;font:600 14px sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.35);cursor:pointer';
    b.textContent='🔄 Yeni veriler geldi — görmek için tıkla';
    b.onclick=function(){ location.reload(); };
    (document.body||document.documentElement).appendChild(b);
  }

  function subscribe(){
    sb.channel('supplier_sync_rt')
      .on('postgres_changes', {event:'*', schema:'public', table:'supplier_sync', filter:'id=eq.'+ROW_ID}, function(p){
        var row=p.new; if(!row||!row.data||row.updated_by===_uid) return;
        applyRemote(row.data);
        // Kullanıcı son 8 sn'de düzenlemediyse otomatik yenile (canlı); düzenliyorsa banner göster
        if(Date.now()-_lastEdit > 8000){ location.reload(); } else { banner(); }
      }).subscribe();
  }

  async function init(){
    try{
      var ses=(await sb.auth.getSession()).data.session;
      if(!ses) return;            // girişsizse guard zaten portala atar
      _uid=ses.user.id;
      var r=await sb.from('supplier_sync').select('data').eq('id',ROW_ID).maybeSingle();
      var remote=(r.data && r.data.data) ? r.data.data : null;
      if(remote && Object.keys(remote).length){
        if(applyRemote(remote)){          // yerelden farklıysa uygula + bir kez yenile (uygulama taze okusun)
          if(!sessionStorage.getItem('_syncReloaded')){ sessionStorage.setItem('_syncReloaded','1'); location.reload(); return; }
        }
      } else {
        pushNow();                        // uzak boş → mevcut yerel veriyi ilk kez yükle (migration)
      }
      sessionStorage.removeItem('_syncReloaded');
      subscribe();
      console.log('[sync] Tedarikçi canlı senkron aktif.');
    }catch(e){ console.warn('[sync] init', e); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
