/* ============================================================
   Sanifoam — tedarikçi mail şablonu (sade, kurumsal)

   İki sayfa da bunu kullanır: 8D talebi (8d-rapor.html) ve doküman /
   belge talebi (index.html). Aynı şablonu iki yere kopyalamamak için
   ayrı dosya; ölçülü renk, emoji yok.

   Çıktı iki biçimde verilir:
     · .eml  → Outlook DÜZENLENEBİLİR taslak olarak açar (X-Unsent: 1).
               Görseller cid: ile GÖMÜLÜ gider — Outlook data: URL'li
               görseli göstermez.
     · mailto → düz metin, her istemcide çalışan yedek.
   Hiçbir mail kendiliğinden gönderilmez; taslak açılır.
   ============================================================ */
(function (kok) {
    'use strict';

    var R = {                       // ölçülü palet
        lacivert: '#1f3251',
        metin: '#233044',
        soluk: '#5a6b82',
        cizgi: '#dde3ec',
        zemin: '#f4f6f9',
        satir: '#f8fafc',
        vurgu: '#8a3b3b'            // yalnız uyarı başlığı
    };

    function esc(t) {
        return String(t == null ? '' : t)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function b64(t) {
        var b = new TextEncoder().encode(t), s = '';
        b.forEach(function (x) { s += String.fromCharCode(x); });
        return btoa(s);
    }

    function bolumBasligi(t, renk) {
        return '<div style="font-size:11px;font-weight:700;letter-spacing:1px;'
            + 'text-transform:uppercase;color:' + (renk || R.soluk) + ';margin:0 0 9px">'
            + esc(t) + '</div>';
    }

    /* Satır tablosu: [['Etiket','Değer'], ...] — boş değerler atlanır */
    function tablo(satirlar) {
        var dolu = (satirlar || []).filter(function (a) {
            return String(a[1] == null ? '' : a[1]).trim();
        });
        if (!dolu.length) return '';
        return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            + 'style="border-collapse:collapse;border:1px solid ' + R.cizgi + ';margin:0 0 22px">'
            + dolu.map(function (a) {
                return '<tr>'
                    + '<td style="padding:8px 14px;background:' + R.satir + ';border-bottom:1px solid '
                    + R.cizgi + ';font-size:13px;color:' + R.soluk + ';width:170px;'
                    + 'white-space:nowrap">' + esc(a[0]) + '</td>'
                    + '<td style="padding:8px 14px;border-bottom:1px solid ' + R.cizgi
                    + ';font-size:13px;color:' + R.metin + ';font-weight:600">'
                    + esc(a[1]) + '</td></tr>';
            }).join('') + '</table>';
    }

    /* Liste kutusu: madde madde bilgi */
    function kutu(baslik, maddeler) {
        if (!maddeler || !maddeler.length) return '';
        return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            + 'style="border-collapse:collapse;margin:0 0 20px"><tr>'
            + '<td style="border-left:3px solid ' + R.cizgi + ';background:' + R.satir
            + ';padding:12px 16px">' + bolumBasligi(baslik)
            + '<div style="font-size:13px;color:' + R.metin + ';line-height:1.8">'
            + maddeler.join('<br>') + '</div></td></tr></table>';
    }

    /* Görsel şeridi. kaynak(i, dosya) -> src (cid: ya da data URL) */
    function gorselSeridi(baslik, gorseller, digerleri, kaynak) {
        if ((!gorseller || !gorseller.length) && (!digerleri || !digerleri.length)) return '';
        var f = kaynak || function (i, d) { return d.data; };
        return bolumBasligi(baslik, R.vurgu)
            + (gorseller && gorseller.length
                ? '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px"><tr>'
                + gorseller.map(function (d, i) {
                    return '<td style="padding:0 10px 10px 0;vertical-align:top">'
                        + '<img src="' + f(i, d) + '" alt="' + esc(d.name) + '" '
                        + 'style="display:block;max-width:240px;width:100%;border:1px solid '
                        + R.cizgi + '">'
                        + '<div style="font-size:11px;color:' + R.soluk + ';margin-top:4px;'
                        + 'max-width:240px">' + esc(d.name) + '</div></td>';
                }).join('') + '</tr></table>'
                : '')
            + (digerleri && digerleri.length
                ? '<p style="margin:0 0 20px;font-size:12px;color:' + R.soluk + '">Ekler: '
                + digerleri.map(function (d) { return esc(d.name); }).join(', ') + '</p>'
                : '<div style="height:6px"></div>');
    }

    /* Tam sayfa. p: {baslik, altbaslik, giris[], govde[], cta:{metin,link},
       kapanis[], imza} */
    function sayfa(p) {
        return '<!doctype html><html><head><meta charset="utf-8"></head>'
            + '<body style="margin:0;padding:0;background:' + R.zemin + '">'
            + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            + 'style="background:' + R.zemin + ';padding:22px 12px"><tr><td align="center">'
            + '<table role="presentation" width="640" cellpadding="0" cellspacing="0" '
            + 'style="max-width:640px;background:#fff;border:1px solid ' + R.cizgi + ';'
            + 'font-family:Segoe UI,Arial,sans-serif">'

            + '<tr><td style="background:' + R.lacivert + ';padding:18px 26px">'
            + '<div style="color:#fff;font-size:17px;font-weight:600;letter-spacing:.2px">'
            + esc(p.baslik) + '</div>'
            + (p.altbaslik ? '<div style="color:#aebdd4;font-size:13px;margin-top:3px">'
                + esc(p.altbaslik) + '</div>' : '')
            + '</td></tr>'

            + '<tr><td style="padding:24px 26px">'
            + (p.giris || []).map(function (t) {
                return '<p style="margin:0 0 14px;font-size:14px;color:' + R.metin
                    + ';line-height:1.65">' + t + '</p>';
            }).join('')
            + (p.govde || []).join('')
            + (p.cta ? '<table role="presentation" cellpadding="0" cellspacing="0" '
                + 'style="margin:4px auto 8px"><tr><td style="background:' + R.lacivert + '">'
                + '<a href="' + esc(p.cta.link) + '" style="display:inline-block;padding:13px 30px;'
                + 'color:#fff;font-size:14px;font-weight:600;text-decoration:none">'
                + esc(p.cta.metin) + '</a></td></tr></table>'
                + '<p style="margin:0 0 20px;text-align:center;font-size:11px;color:' + R.soluk
                + ';word-break:break-all">' + esc(p.cta.link) + '</p>' : '')
            + (p.ctaSonrasi || []).join('')
            + (p.kapanis || []).map(function (t) {
                return '<p style="margin:0 0 10px;font-size:12px;color:' + R.soluk
                    + ';line-height:1.6">' + t + '</p>';
            }).join('')
            + '</td></tr>'

            + '<tr><td style="background:' + R.satir + ';padding:14px 26px;font-size:12px;color:'
            + R.soluk + ';border-top:1px solid ' + R.cizgi + '">Saygılarımızla,<br>'
            + '<span style="color:' + R.lacivert + ';font-weight:600">'
            + esc(p.imza || 'Kalite Ekibi') + '</span></td></tr>'
            + '</table></td></tr></table></body></html>';
    }

    /* data: URL taşıyan ekleri görsel / diğer diye ayırır */
    function ekleriAyir(liste) {
        var hepsi = (liste || []).filter(function (d) {
            return d && d.data && /^data:/.test(String(d.data));
        });
        return {
            gorseller: hepsi.filter(function (d) { return /^image\//i.test(d.type || ''); }),
            digerleri: hepsi.filter(function (d) { return !/^image\//i.test(d.type || ''); })
        };
    }

    /* .eml üret. gorseller verilirse multipart/related + cid olur. */
    function eml(p) {
        var gorseller = p.gorseller || [];
        var kimlik = function (i) { return 'ek' + (i + 1) + '@sanifoam'; };
        var html = p.html(gorseller.length
            ? function (i) { return 'cid:' + kimlik(i); }
            : null);
        var govde = b64(html).replace(/(.{76})/g, '$1\r\n');
        var satir = [
            'To: ' + String(p.alici || '').trim(),
            'Subject: =?UTF-8?B?' + b64(p.konu) + '?=',
            'X-Unsent: 1',                       // Outlook: düzenlenebilir taslak
            'MIME-Version: 1.0'
        ];
        if (!gorseller.length) {
            satir = satir.concat(['Content-Type: text/html; charset=utf-8',
                'Content-Transfer-Encoding: base64', '', govde]);
        } else {
            var sinir = '----SF_' + (p.damga || 'x');
            satir = satir.concat([
                'Content-Type: multipart/related; type="text/html"; boundary="' + sinir + '"', '',
                '--' + sinir, 'Content-Type: text/html; charset=utf-8',
                'Content-Transfer-Encoding: base64', '', govde, '']);
            gorseller.forEach(function (d, i) {
                var nv = d.data.indexOf(';'), v = d.data.indexOf(',');
                var tur = d.data.slice(5, nv > 0 ? nv : v) || 'image/jpeg';
                var veri = d.data.slice(v + 1).replace(/\s+/g, '').replace(/(.{76})/g, '$1\r\n');
                var ad = String(d.name || ('ek' + (i + 1))).replace(/"/g, '');
                satir = satir.concat([
                    '--' + sinir,
                    'Content-Type: ' + tur + '; name="' + ad + '"',
                    'Content-Transfer-Encoding: base64',
                    'Content-ID: <' + kimlik(i) + '>',
                    'Content-Disposition: inline; filename="' + ad + '"',
                    '', veri, '']);
            });
            satir.push('--' + sinir + '--');
        }
        return satir.join('\r\n');
    }

    function indir(dosyaAdi, icerik) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([icerik], { type: 'message/rfc822' }));
        a.download = dosyaAdi;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    }

    /* Düz metin yardımcıları (mailto yedeği) */
    function duzTablo(satirlar) {
        var dolu = (satirlar || []).filter(function (a) {
            return String(a[1] == null ? '' : a[1]).trim();
        });
        if (!dolu.length) return [];
        var en = Math.max.apply(null, dolu.map(function (a) { return a[0].length; }));
        return dolu.map(function (a) {
            return a[0] + new Array(en - a[0].length + 1).join(' ') + ' : ' + a[1];
        });
    }
    function duzBaslik(t) {
        return ['', new Array(39).join('-'), t.toUpperCase(), new Array(39).join('-'), ''];
    }
    function mailto(alici, konu, metin) {
        window.location.href = 'mailto:' + encodeURIComponent(String(alici || '').trim())
            + '?subject=' + encodeURIComponent(konu)
            + '&body=' + encodeURIComponent(metin);
    }

    /* Gönderim sonrası küçük seçim penceresi */
    function secimPenceresi(p) {
        var v = document.getElementById('mailSecim');
        if (v) v.remove();
        kok.__mailSecim = p;
        var d = document.createElement('div');
        d.id = 'mailSecim';
        d.style.cssText = 'position:fixed;inset:0;background:rgba(20,28,42,.55);z-index:99999;'
            + 'display:flex;align-items:center;justify-content:center;padding:20px;'
            + 'font-family:Segoe UI,system-ui,sans-serif';
        var kapat = "document.getElementById('mailSecim').remove()";
        d.innerHTML = '<div style="background:#fff;max-width:560px;width:100%;padding:24px 26px;'
            + 'border-radius:10px">'
            + '<div style="font-size:1.1em;font-weight:700;color:' + R.lacivert + '">'
            + esc(p.baslik || 'Mail hazır') + '</div>'
            + '<div style="font-size:.86em;color:' + R.soluk + ';margin:4px 0 16px">'
            + (p.alici ? 'Alıcı: <b>' + esc(p.alici) + '</b>'
                : 'Kayıtlı e-posta yok — alıcıyı elle girin') + '</div>'
            + (p.link ? '<label style="font-size:.78em;font-weight:600;color:' + R.soluk + '">'
                + 'Bağlantı</label><input readonly value="' + esc(p.link) + '" '
                + 'onclick="this.select()" style="width:100%;padding:9px;margin:4px 0 16px;'
                + 'border:1px solid ' + R.cizgi + ';border-radius:5px;font-size:.82em;background:'
                + R.satir + '">' : '')
            + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
            + '<button onclick="window.__mailSecim.zengin();' + kapat + '" '
            + 'style="flex:1;min-width:200px;padding:12px;background:' + R.lacivert + ';color:#fff;'
            + 'border:0;border-radius:5px;cursor:pointer;font-weight:600">'
            + 'Outlook taslağı (biçimli)</button>'
            + '<button onclick="window.__mailSecim.duz();' + kapat + '" '
            + 'style="padding:12px 14px;background:#fff;border:1px solid ' + R.cizgi + ';'
            + 'border-radius:5px;cursor:pointer">Basit mail</button>'
            + (p.link ? '<button onclick="navigator.clipboard.writeText(window.__mailSecim.link);'
                + 'this.textContent=\'Kopyalandı\'" style="padding:12px 14px;background:#fff;'
                + 'border:1px solid ' + R.cizgi + ';border-radius:5px;cursor:pointer">'
                + 'Linki kopyala</button>' : '')
            + '</div>'
            + '<div style="font-size:.76em;color:' + R.soluk + ';margin-top:12px;line-height:1.5">'
            + 'Biçimli seçenek bir <b>.eml</b> dosyası indirir; çift tıklayınca Outlook '
            + '<b>düzenlenebilir taslak</b> olarak açar. Hiçbir mail kendiliğinden gönderilmez.'
            + '</div>'
            + '<div style="text-align:right;margin-top:14px"><button onclick="' + kapat + '" '
            + 'style="padding:8px 14px;background:none;border:0;color:' + R.soluk + ';'
            + 'cursor:pointer">Kapat</button></div></div>';
        document.body.appendChild(d);
    }

    kok.MailSablon = {
        renk: R, esc: esc, b64: b64,
        bolumBasligi: bolumBasligi, tablo: tablo, kutu: kutu,
        gorselSeridi: gorselSeridi, sayfa: sayfa, ekleriAyir: ekleriAyir,
        eml: eml, indir: indir,
        duzTablo: duzTablo, duzBaslik: duzBaslik, mailto: mailto,
        secimPenceresi: secimPenceresi
    };
})(typeof window !== 'undefined' ? window : this);
