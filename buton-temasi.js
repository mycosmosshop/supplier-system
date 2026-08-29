/* ============================================================
   Düğme teması — araç çubuğu (#controls)

   Düğmelerin rengi HTML'de tek tek gömülü (style="background:#28a745"
   gibi). Hepsini elle değiştirmek yerine, her düğmenin ÖZGÜN rengi
   bir kez saklanır, renk tonundan ROLÜ çıkarılır (onay / tehlike /
   bilgi / vurgu / uyarı / nötr) ve tema o role bir renk verir.

   Böylece bir tema yalnızca 6 renkten ibaret olur; yeni tema eklemek
   TEMALAR listesine 6 renk yazmaktır. Grup kutularının zemin ve
   çerçevesi aynı renkten otomatik türetilir (açık ton).

   "Özgün" teması saklanan ilk hâli geri yükler — mevcut görünüm
   kaybolmaz.
   ============================================================ */
(function (kok) {
    'use strict';

    var KAPSAM = '#controls';

    /* ---- renk yardımcıları ---- */
    function hexOku(t) {
        var m = String(t || '').trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (!m) {
            m = String(t || '').match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
            return m ? [+m[1], +m[2], +m[3]] : null;
        }
        var h = m[1];
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    function hsl(t) {
        var r = hexOku(t);
        if (!r) return null;
        var a = r[0] / 255, b = r[1] / 255, c = r[2] / 255;
        var mx = Math.max(a, b, c), mn = Math.min(a, b, c), d = mx - mn;
        var h = 0, s = 0, l = (mx + mn) / 2;
        if (d) {
            s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
            if (mx === a) h = ((b - c) / d + (b < c ? 6 : 0));
            else if (mx === b) h = (c - a) / d + 2;
            else h = (a - b) / d + 4;
            h *= 60;
        }
        return { h: h, s: s, l: l };
    }
    function hslHex(h, s, l) {
        function f(n) {
            var k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
            var v = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
            return Math.round(v * 255).toString(16).padStart(2, '0');
        }
        return '#' + f(0) + f(8) + f(4);
    }
    /* Aynı renkten açık/koyu ton üret (grup zemini, çerçeve) */
    function ton(renk, l) {
        var x = hsl(renk);
        if (!x) return renk;
        return hslHex(x.h, Math.min(x.s, 0.55), l);
    }
    /* Zemin koyuysa beyaz, açıksa koyu yazı */
    function yaziRengi(zemin) {
        var r = hexOku(zemin);
        if (!r) return '#fff';
        var l = (0.299 * r[0] + 0.587 * r[1] + 0.114 * r[2]) / 255;
        return l > 0.62 ? '#1f2937' : '#ffffff';
    }

    /* ---- rol çıkarımı: özgün rengin tonundan ---- */
    var ROLLER = ['onay', 'tehlike', 'uyari', 'vurgu', 'bilgi', 'notr'];
    function rol(renk) {
        var x = hsl(renk);
        if (!x) return 'notr';
        if (x.s < 0.16) return 'notr';                 // gri
        var h = x.h;
        // Sınırlar sayfadaki gerçek renklere göre ayarlandı:
        // #00897b turkuaz yeşil sayılır, #6d4c41 kahve nötr sayılır.
        if (h >= 90 && h < 185) return 'onay';         // yeşil + turkuaz
        if (h >= 345 || h < 12) return 'tehlike';      // kırmızı
        if (h >= 12 && h < 45) {
            return x.l < 0.42 ? 'notr' : 'uyari';      // koyu kahve -> nötr, turuncu -> uyarı
        }
        if (h >= 45 && h < 90) return 'uyari';         // sarı/amber
        if (h >= 185 && h < 260) return 'bilgi';       // mavi
        return 'vurgu';                                 // mor/pembe
    }

    /* ---- temalar: her biri 6 renk ---- */
    var TEMALAR = {
        ozgun: { ad: 'Özgün (renkli)', ozgun: true },
        kurumsal: {
            ad: 'Kurumsal', renk: {
                onay: '#2f5d50', tehlike: '#8c3b3b', uyari: '#8a6320',
                vurgu: '#4a4470', bilgi: '#26456e', notr: '#5b6472'
            }
        },
        lacivert: {
            ad: 'Lacivert', renk: {
                onay: '#1f4e5f', tehlike: '#7a3550', uyari: '#5d5382',
                vurgu: '#3c3f78', bilgi: '#1f3251', notr: '#57606f'
            }
        },
        sade: {
            ad: 'Sade gri', renk: {
                onay: '#4b5563', tehlike: '#7f1d1d', uyari: '#6b7280',
                vurgu: '#52525b', bilgi: '#374151', notr: '#6b7280'
            }
        },
        koyu: {
            ad: 'Koyu', renk: {
                onay: '#14532d', tehlike: '#7f1d1d', uyari: '#78350f',
                vurgu: '#3b0764', bilgi: '#172554', notr: '#27272a'
            }
        }
    };
    function ozelPalet() {
        try { return JSON.parse(localStorage.getItem('butonTemasiOzel') || 'null'); } catch (e) { return null; }
    }
    function temaCoz(ad) {
        if (ad === 'ozel') {
            var p = ozelPalet();
            return p ? { ad: 'Kendi renklerim', renk: p } : TEMALAR.ozgun;
        }
        return TEMALAR[ad] || TEMALAR.ozgun;
    }

    /* ---- uygulama ---- */
    function ogeler() {
        var k = document.querySelector(KAPSAM);
        if (!k) return { dugmeler: [], kutular: [] };
        var hepsi = Array.prototype.slice.call(k.querySelectorAll('button, .btn'));
        var kutular = Array.prototype.slice.call(k.querySelectorAll('div[style*="background"]'))
            .filter(function (d) { return !d.matches('button, .btn'); });
        return { dugmeler: hepsi, kutular: kutular };
    }
    /* Özgün hâli BİR KEZ sakla; "Özgün" teması buradan geri yükler */
    function ozgunuSakla(e) {
        if (e.dataset.tOzgun) return;
        e.dataset.tOzgun = '1';
        e.dataset.tBg = e.style.background || '';
        e.dataset.tBc = e.style.borderColor || '';
        e.dataset.tFg = e.style.color || '';
    }
    function ozgunuGeriYukle(e) {
        if (!e.dataset.tOzgun) return;
        e.style.background = e.dataset.tBg;
        e.style.borderColor = e.dataset.tBc;
        e.style.color = e.dataset.tFg;
    }

    function uygula(ad) {
        var tema = temaCoz(ad);
        var o = ogeler();
        o.dugmeler.forEach(function (d) {
            ozgunuSakla(d);
            if (tema.ozgun) { ozgunuGeriYukle(d); return; }
            var kaynak = d.dataset.tBg || getComputedStyle(d).backgroundColor;
            var r = tema.renk[rol(kaynak)] || tema.renk.notr;
            d.style.background = r;
            d.style.borderColor = r;
            d.style.color = yaziRengi(r);
        });
        o.kutular.forEach(function (kt) {
            ozgunuSakla(kt);
            if (tema.ozgun) { ozgunuGeriYukle(kt); return; }
            var r = tema.renk[rol(kt.dataset.tBg || '')] || tema.renk.notr;
            kt.style.background = ton(r, 0.955);
            kt.style.borderColor = ton(r, 0.82);
        });
        try { localStorage.setItem('butonTemasi', ad); } catch (e) {}
        kok.__butonTemasi = ad;
    }

    function secili() {
        try { return localStorage.getItem('butonTemasi') || 'ozgun'; } catch (e) { return 'ozgun'; }
    }

    /* ---- seçim penceresi ---- */
    function panel() {
        var v = document.getElementById('temaPaneli');
        if (v) v.remove();
        var simdiki = secili();
        var p = document.createElement('div');
        p.id = 'temaPaneli';
        p.style.cssText = 'position:fixed;inset:0;background:rgba(20,28,42,.55);z-index:30000;'
            + 'display:flex;align-items:center;justify-content:center;padding:20px;'
            + 'font-family:Segoe UI,system-ui,sans-serif';
        var kartlar = Object.keys(TEMALAR).concat(ozelPalet() ? ['ozel'] : []).map(function (k) {
            var t = temaCoz(k);
            var ornek = t.ozgun
                ? ['#28a745', '#dc3545', '#f57f17', '#9c27b0', '#1e3c72', '#6b7280']
                : ROLLER.map(function (r) { return t.renk[r]; });
            return '<div onclick="ButonTemasi.uygula(\'' + k + '\');ButonTemasi.panel()" '
                + 'style="cursor:pointer;border:2px solid ' + (k === simdiki ? '#1f3251' : '#e2e8f0')
                + ';border-radius:9px;padding:10px 12px;display:flex;align-items:center;gap:10px;'
                + 'margin-bottom:8px;background:' + (k === simdiki ? '#f1f5f9' : '#fff') + '">'
                + '<div style="display:flex;gap:3px">' + ornek.map(function (c) {
                    return '<span style="width:16px;height:16px;border-radius:3px;background:' + c
                        + ';display:inline-block"></span>';
                }).join('') + '</div>'
                + '<b style="font-size:.92em;color:#1f2937">' + t.ad + '</b>'
                + (k === simdiki ? '<span style="margin-left:auto;font-size:.8em;color:#1f3251">seçili</span>' : '')
                + '</div>';
        }).join('');
        var oz = ozelPalet() || TEMALAR.kurumsal.renk;
        var etiket = { onay: 'Onay / olumlu', tehlike: 'Silme / tehlike', uyari: 'Uyarı',
            vurgu: 'Vurgu', bilgi: 'Bilgi / rapor', notr: 'Nötr' };
        p.innerHTML = '<div style="background:#fff;border-radius:12px;max-width:520px;width:100%;'
            + 'padding:22px 24px;max-height:88vh;overflow:auto">'
            + '<div style="font-size:1.1em;font-weight:700;color:#1f3251;margin-bottom:4px">'
            + 'Düğme teması</div>'
            + '<div style="font-size:.85em;color:#64748b;margin-bottom:14px">'
            + 'Renkler düğmenin işine göre atanır. Özgün seçeneği ilk hâline döndürür.</div>'
            + kartlar
            + '<div style="border-top:1px solid #e2e8f0;margin:14px 0 10px;padding-top:12px">'
            + '<b style="font-size:.9em;color:#1f2937">Kendi renklerim</b>'
            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">'
            + ROLLER.map(function (r) {
                return '<label style="font-size:.82em;color:#475569;display:flex;align-items:center;'
                    + 'gap:7px"><input type="color" data-rol="' + r + '" value="' + (oz[r] || '#334155')
                    + '" style="width:34px;height:26px;border:1px solid #cbd5e1;border-radius:5px;'
                    + 'padding:0;cursor:pointer">' + etiket[r] + '</label>';
            }).join('')
            + '</div>'
            + '<button id="temaOzelKaydet" style="margin-top:12px;padding:9px 14px;background:#1f3251;'
            + 'color:#fff;border:0;border-radius:6px;cursor:pointer;font-weight:600">'
            + 'Kendi temamı uygula</button></div>'
            + '<div style="text-align:right;margin-top:8px">'
            + '<button id="temaKapat" style="padding:8px 14px;background:none;border:0;color:#64748b;'
            + 'cursor:pointer">Kapat</button></div></div>';
        document.body.appendChild(p);
        p.addEventListener('click', function (e) { if (e.target === p) p.remove(); });
        p.querySelector('#temaKapat').onclick = function () { p.remove(); };
        p.querySelector('#temaOzelKaydet').onclick = function () {
            var yeni = {};
            p.querySelectorAll('input[data-rol]').forEach(function (i) { yeni[i.dataset.rol] = i.value; });
            try { localStorage.setItem('butonTemasiOzel', JSON.stringify(yeni)); } catch (e) {}
            uygula('ozel');
            p.remove();
            panel();
        };
    }

    /* ---- araç çubuğuna "Tema" düğmesi ---- */
    function dugmeEkle() {
        if (document.getElementById('temaSecBtn')) return;
        var k = document.querySelector(KAPSAM);
        if (!k) return;
        var b = document.createElement('button');
        b.id = 'temaSecBtn';
        b.className = 'btn btn-secondary';
        b.textContent = '🎨 Tema';
        b.title = 'Düğme renklerini temaya göre değiştir';
        b.onclick = panel;
        var son = k.querySelector('#fullscreenBtn');
        if (son && son.parentNode) son.parentNode.insertBefore(b, son);
        else k.appendChild(b);
    }

    function baslat() {
        dugmeEkle();
        uygula(secili());
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(baslat, 300); });
    } else {
        setTimeout(baslat, 300);
    }

    kok.ButonTemasi = {
        TEMALAR: TEMALAR, ROLLER: ROLLER,
        hsl: hsl, ton: ton, rol: rol, yaziRengi: yaziRengi,
        temaCoz: temaCoz, uygula: uygula, panel: panel, secili: secili, baslat: baslat
    };
})(typeof window !== 'undefined' ? window : this);
