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
  var KEYS=['selectedSuppliers','tdsData','supplierCustomerReturns','supplierCategoryMap',
            'supplierStatusMap','supplierInfoMap','supplierListForCOA','supplierCertData',
            'supplierStatusHistory','supplierEditsHistory','statusChangeHistory','activityHistory',
            'targetAgreements','documentTypes','customQualityCertTypes','supplierIatfData',
            'supplierFilters','supplierPerfOverrides','supplierComputedScores',
            'supplierPeriodIndex','supplierPeriodDeleted','_sharedCurrentPeriodName']; // Dönem (Yıl) listesi + güncel dönem etiketi tüm kullanıcılarda; PerfOverrides = elle Sevk/Hata/Termin/Tamamlanma düzeltmeleri
  var PREFIXES=['ppmTarget_','hataHedefi_'];
  function isSynced(k){ if(!k) return false; if(KEYS.indexOf(k)>=0) return true; for(var i=0;i<PREFIXES.length;i++){ if(k.indexOf(PREFIXES[i])===0) return true; } return false; }
  // "Yumuşak" anahtarlar: yalnızca dönem listesi/etiketi etkiler → değişince TAM SAYFA YENİLEME yok, sadece menü tazelenir
  var SOFT={ supplierPeriodIndex:1, supplierPeriodDeleted:1, _sharedCurrentPeriodName:1 };

  // Paylaşım/supplier modunda senkron yok (dış kullanıcı, Storj akışı)
  if(/[?&](mode=supplier|storj=|share=|shared|view=)/i.test(location.search)) return;
  if(!(window.supabase && window.supabase.createClient)) return;

  var sb=window.supabase.createClient(SUPA_URL, SUPA_KEY, {auth:{persistSession:true, autoRefreshToken:true}});
  var _applying=false, _lastEdit=0, _uid=null, _pushTimer=null;

  function snapshot(){ var o={}; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(isSynced(k)) o[k]=localStorage.getItem(k); } return o; }
  function applyRemote(data){ if(!data) return []; _applying=true; var changed=[];
    try{ Object.keys(data).forEach(function(k){ if(isSynced(k) && localStorage.getItem(k)!==data[k]){ _origSet(k, data[k]); changed.push(k); } }); }
    finally{ _applying=false; } return changed; }
  function pushNow(){ if(_applying||!_uid) return;
    sb.from('supplier_sync').upsert({ id:ROW_ID, data:snapshot(), updated_at:new Date().toISOString(), updated_by:_uid })
      .then(function(r){ if(r.error) console.warn('[sync] push', r.error.message); }); }
  function schedulePush(){ if(_applying) return; _lastEdit=Date.now(); clearTimeout(_pushTimer); _pushTimer=setTimeout(pushNow, 1200);
    // Edit olunca otomatik Drive yedeği de tetikle (kendi yazımı hariç — döngü koruması)
    try{ if(!window._driveBackupInProgress && typeof window.autoDriveBackup==='function') window.autoDriveBackup(); }catch(e){} }

  // localStorage'ı sarmala (uygulama fonksiyonlarına dokunmadan)
  var _origSet=localStorage.setItem.bind(localStorage);
  var _origRem=localStorage.removeItem.bind(localStorage);
  var _origGet=localStorage.getItem.bind(localStorage);
  // ÖNEMLİ: değer GERÇEKTEN değiştiyse push planla. Drive yedeği selectedSuppliers'ı aynı değerle
  // tekrar yazınca gereksiz push + diğer kullanıcılarda gereksiz yenileme oluyordu → titreme. Bu karşılaştırma onu keser.
  localStorage.setItem=function(k,v){ var old=isSynced(k)?_origGet(k):null; _origSet(k,v); try{ if(isSynced(k) && old!==String(v)) schedulePush(); }catch(e){} };
  localStorage.removeItem=function(k){ var had=isSynced(k)?(_origGet(k)!=null):false; _origRem(k); try{ if(isSynced(k) && had) schedulePush(); }catch(e){} };

  // Değişen anahtarları okunur açıklamaya çevir (kullanıcı NE değiştiğini görsün)
  function describeChanges(keys){
    var L={ selectedSuppliers:'tedarikçi listesi / performans verileri', supplierStatusMap:'tedarikçi onay durumları',
            supplierInfoMap:'tedarikçi bilgileri', supplierCertData:'kalite belge bilgileri', targetAgreements:'hedef anlaşmaları',
            documentTypes:'doküman türleri', supplierFilters:'kayıtlı filtreler', supplierIatfData:'IATF bilgileri',
            customQualityCertTypes:'kalite belge türleri', tdsData:'TDS verileri', supplierListForCOA:'COA tedarikçi listesi',
            supplierStatusHistory:'durum geçmişi', supplierEditsHistory:'düzenleme geçmişi', statusChangeHistory:'durum değişiklik geçmişi', activityHistory:'işlem geçmişi' };
    var names=[]; (keys||[]).forEach(function(k){
      var lab=L[k] || (k.indexOf('ppmTarget_')===0?'PPM hedefleri':(k.indexOf('hataHedefi_')===0?'hata hedefleri':null));
      if(lab && names.indexOf(lab)<0) names.push(lab);
    });
    return names.length ? names.slice(0,3).join(', ') : 'tedarikçi verileri';
  }
  function banner(desc){
    var ex=document.getElementById('erpSyncBanner'); if(ex) ex.remove(); // yeni açıklamayla tazele
    var b=document.createElement('div'); b.id='erpSyncBanner';
    b.style.cssText='position:fixed;bottom:16px;right:16px;z-index:2147483647;background:#0288d1;color:#fff;padding:12px 14px;border-radius:10px;font:600 13px sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.35);max-width:330px';
    b.innerHTML='<div style="margin-bottom:9px;line-height:1.4">📥 Başka bir kullanıcı/oturum <b>'+(desc||'verileri')+'</b> güncelledi.'+
      '<br><span style="font-weight:400;opacity:.92">Yenilersen ekrandaki görünüm en güncel veriyle değişir.</span></div>'+
      '<div style="display:flex;gap:8px;justify-content:flex-end">'+
      '<button id="erpSyncDismiss" style="background:rgba(255,255,255,.22);color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font:600 12px sans-serif">✕ Şimdilik kapat</button>'+
      '<button id="erpSyncReload" style="background:#fff;color:#0277bd;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font:700 12px sans-serif">🔄 Yenile ve gör</button>'+
      '</div>';
    (document.body||document.documentElement).appendChild(b);
    var rb=document.getElementById('erpSyncReload'); if(rb) rb.onclick=function(){ location.reload(); };
    var db2=document.getElementById('erpSyncDismiss'); if(db2) db2.onclick=function(){ b.remove(); };
  }

  function subscribe(){
    sb.channel('supplier_sync_rt')
      .on('postgres_changes', {event:'*', schema:'public', table:'supplier_sync', filter:'id=eq.'+ROW_ID}, function(p){
        var row=p.new; if(!row||!row.data||row.updated_by===_uid) return;
        var changed=applyRemote(row.data);
        if(!changed.length) return;
        // Sadece dönem listesi/etiketi değiştiyse: TAM SAYFA YENİLEME YOK (reload fırtınasını önler) — yalnızca dönem menüsünü tazele
        var hard=changed.some(function(k){ return !SOFT[k]; });
        if(!hard){ try{ if(typeof window.updateEditsVersionButton==='function') window.updateEditsVersionButton(); }catch(e){} return; }
        // Gerçek veri değişti → YERİNDE sessizce uygula (beyaz parlama/scroll sıçraması yok, banner yok).
        // SADECE kullanıcı O AN bir kutuya yazıyorsa (aktif düzenleme) banner göster — yazısı render'la kaybolmasın.
        var ae = document.activeElement;
        var typing = !!(ae && (ae.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName||'')));
        if(!typing){
          if(typeof window.applySyncedDataInPlace==='function'){ try{ window.applySyncedDataInPlace(); }catch(e){ location.reload(); } }
          else { location.reload(); }
        } else { banner(describeChanges(changed)); }
      }).subscribe();
  }

  async function init(){
    try{
      var ses=(await sb.auth.getSession()).data.session;
      if(!ses) return;            // girişsizse guard zaten portala atar
      _uid=ses.user.id;
      // ADMIN tespiti → elle performans düzeltmelerini YALNIZ admin yapabilir; diğerleri görür.
      // Sahip e-postası ANINDA admin (erp_users.is_admin boş/gecikmeli olsa bile sahip kilitlenmesin); ayrıca is_admin=true olan herkes.
      var OWNER_ADMINS=['volkanpekatik@gmail.com'];
      var _email=((ses.user && ses.user.email)||'').toLowerCase().trim();
      window.ERP_USER_EMAIL=_email;
      window.ERP_IS_ADMIN = OWNER_ADMINS.indexOf(_email)>=0;
      try{
        var ra=await sb.from('erp_users').select('is_admin,email').eq('id',_uid).maybeSingle();
        if(ra && ra.data && ra.data.is_admin) window.ERP_IS_ADMIN = true;
      }catch(e){}
      try{ if(document.body) document.body.setAttribute('data-erp-admin', window.ERP_IS_ADMIN?'1':'0'); }catch(e){}
      try{ window.dispatchEvent(new CustomEvent('erp-admin-ready',{detail:{admin:window.ERP_IS_ADMIN}})); }catch(e){}
      var r=await sb.from('supplier_sync').select('data').eq('id',ROW_ID).maybeSingle();
      var remote=(r.data && r.data.data) ? r.data.data : null;
      if(remote && Object.keys(remote).length){
        var chg=applyRemote(remote);      // yerelden farklıysa uygula
        // Yalnızca dönem listesi/etiketi farklıysa reload'a GEREK YOK (fırtına önlemi); gerçek veri farkı varsa bir kez yenile
        if(chg.some(function(k){ return !SOFT[k]; })){
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
