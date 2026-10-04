/* =========================================================================
   photo-field.js — registration photo / ID-card picker
   Har registration mein: camera ya gallery se tasveer, server par upload.
   Server hi tay karta hai ke photo + ID card lazmi hain (client sirf madad).
   ========================================================================= */
(function () {
  'use strict';

  var App = window.App || (window.App = {});
  var MAX_SIDE = 1400;      /* badi tasveer chhoti kar ke bhejte hain */
  var MAX_BYTES = 6 * 1024 * 1024;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- markup ---------- */
  /* opts: { name, label, hint, idCard:false } */
  App.photoField = function (opts) {
    opts = opts || {};
    var name = opts.name || 'photo';
    var label = opts.label || 'Photograph';
    var hint = opts.hint || 'Camera se photo lein ya gallery se chunein.';
    var wide = opts.idCard ? ' is-wide' : '';
    return '<div class="pf' + wide + '" data-pf="' + esc(name) + '">' +
      '<div class="pf-head"><span class="pf-lbl">' + esc(label) + ' <b title="Required">*</b></span>' +
      '<span class="pf-state" data-pf-state>Required</span></div>' +
      '<div class="pf-body">' +
      '<div class="pf-prev' + (opts.idCard ? ' is-doc' : ' is-face') + '" data-pf-preview>' +
      '<span class="pf-empty">No image yet</span></div>' +
      '<div class="pf-acts">' +
      '<button type="button" class="btn btn-xs btn-outline" data-pf-act="camera">' +
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' +
      '<path d="M3 8.5A2 2 0 0 1 5 6.5h1.6l1.1-2h8.6l1.1 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' +
      '<circle cx="12" cy="13" r="3.4"/></svg> Camera</button>' +
      '<button type="button" class="btn btn-xs btn-outline" data-pf-act="gallery">' +
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' +
      '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 16l4.5-4.5L11 15"/><circle cx="16" cy="9" r="1.3"/></svg> Gallery</button>' +
      '<button type="button" class="btn btn-xs btn-quiet" data-pf-act="clear" hidden>Remove</button>' +
      '</div>' +
      '<p class="pf-hint mut">' + esc(hint) + '</p>' +
      '<p class="pf-err" data-pf-err hidden></p>' +
      '</div>' +
      '<input type="hidden" name="' + esc(name) + '" data-pf-value value="">' +
      '</div>';
  };

  /* registration forms ke liye dono fields ek saath */
  App.registrationDocs = function (opt) {
    opt = opt || {};
    return App.photoField({ name: 'photo', label: 'Your photograph', hint: 'Clear front-facing photo (camera ya gallery).' }) +
      App.photoField({ name: 'idCard', label: 'ID card picture', idCard: true, hint: 'University ID card ya CNIC ki saaf tasveer.' });
  };

  /* ---------- file -> chhoti JPEG ---------- */
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error('No file selected.'));
      if (!/^image\//.test(file.type || '') && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name || '')) {
        return reject(new Error('Only image files are allowed.'));
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        if (!w || !h) { URL.revokeObjectURL(url); return reject(new Error('That image could not be read.')); }
        var scale = Math.min(1, MAX_SIDE / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale));
        var ch = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cw, ch);
        try { ctx.drawImage(img, 0, 0, cw, ch); }
        catch (e) { URL.revokeObjectURL(url); return reject(new Error('That image format is not supported — please use JPG or PNG.')); }
        URL.revokeObjectURL(url);
        var out = canvas.toDataURL('image/jpeg', 0.82);
        var bin = atob(out.split(',')[1]);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        resolve(new Blob([bytes], { type: 'image/jpeg' }));
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('That image could not be opened. Please try another one.'));
      };
      img.src = url;
    });
  }

  function uploadBlob(blob) {
    var api = window.YPDC && window.YPDC.api;
    if (!(api && api.available && api.uploadPhoto)) return Promise.reject(new Error('The YPDC server is not reachable — please try again in a moment.'));
    if (blob.size > MAX_BYTES) return Promise.reject(new Error('That image is too large (maximum 6 MB).'));
    return api.uploadPhoto(blob);
  }

  /* ---------- behaviour ---------- */
  function setState(box, ok, msg) {
    var st = box.querySelector('[data-pf-state]');
    var err = box.querySelector('[data-pf-err]');
    var clr = box.querySelector('[data-pf-act="clear"]');
    if (st) {
      st.className = 'pf-state' + (ok ? ' is-ok' : (msg ? ' is-err' : ''));
      st.textContent = ok ? 'Uploaded ✓' : (msg ? 'Missing' : 'Required');
    }
    if (err) { err.hidden = !msg; err.textContent = msg || ''; }
    if (clr) clr.hidden = !ok;
  }

  function preview(box, url) {
    var prev = box.querySelector('[data-pf-preview]');
    if (!prev) return;
    if (url) {
      prev.classList.add('has-img');
      prev.innerHTML = '<img src="' + esc(url) + '" alt="Uploaded preview">';
    } else {
      prev.classList.remove('has-img');
      prev.innerHTML = '<span class="pf-empty">No image yet</span>';
    }
  }

  function busy(box, on, text) {
    var acts = box.querySelectorAll('[data-pf-act]');
    Array.prototype.forEach.call(acts, function (b) {
      b.disabled = !!on;
      if (b.getAttribute('data-pf-act') === 'gallery' && on) b.textContent = text || 'Uploading…';
      else if (b.getAttribute('data-pf-act') === 'gallery' && !on) b.innerHTML = b.getAttribute('data-html') || b.innerHTML;
    });
    box.classList.toggle('is-busy', !!on);
  }

  function pick(box, useCamera) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (useCamera) input.setAttribute('capture', 'user');
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      document.body.removeChild(input);
      if (!file) return;
      var galleryBtn = box.querySelector('[data-pf-act="gallery"]');
      if (galleryBtn && !galleryBtn.getAttribute('data-html')) galleryBtn.setAttribute('data-html', galleryBtn.innerHTML);
      busy(box, true);
      shrink(file).then(uploadBlob).then(function (r) {
        var val = box.querySelector('[data-pf-value]');
        if (val) val.value = r.url;
        preview(box, r.url);
        setState(box, true, '');
        busy(box, false);
        box.dispatchEvent(new CustomEvent('pf:done', { bubbles: true, detail: { name: box.getAttribute('data-pf'), url: r.url } }));
      }).catch(function (err) {
        busy(box, false);
        if (galleryBtn && galleryBtn.getAttribute('data-html')) galleryBtn.innerHTML = galleryBtn.getAttribute('data-html');
        setState(box, false, err.message || 'Upload failed.');
      });
    });
    input.click();
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-pf-act]') : null;
    if (!btn) return;
    var box = btn.closest('[data-pf]');
    if (!box) return;
    var act = btn.getAttribute('data-pf-act');
    e.preventDefault();
    if (act === 'camera') pick(box, true);
    else if (act === 'gallery') pick(box, false);
    else if (act === 'clear') {
      var val = box.querySelector('[data-pf-value]');
      if (val) val.value = '';
      preview(box, '');
      setState(box, false, '');
    }
  });

  /* ---------- helpers used by forms ---------- */

  /* form ke andar se photo / idCard values nikalna */
  App.docValues = function (scope, out) {
    out = out || {};
    var boxes = (scope || document).querySelectorAll('[data-pf]');
    Array.prototype.forEach.call(boxes, function (box) {
      var v = box.querySelector('[data-pf-value]');
      if (v) out[v.name] = v.value;
    });
    return out;
  };

  /* lazmi check — photo aur ID card dono chahiye */
  App.docsMissing = function (scope) {
    var miss = [];
    var boxes = (scope || document).querySelectorAll('[data-pf]');
    Array.prototype.forEach.call(boxes, function (box) {
      var v = box.querySelector('[data-pf-value]');
      var name = box.getAttribute('data-pf');
      if (!v || !v.value) {
        miss.push(name === 'idCard' ? 'ID card picture' : 'Your photograph');
        setState(box, false, 'This is required — camera ya gallery se upload karein.');
      }
    });
    return miss;
  };

  App.docsHelp = function (miss) {
    if (!miss || !miss.length) return '';
    return 'Please upload: ' + miss.join(' and ') + '.';
  };
})();
