/* =========================================================================
   popup-notice.js — UON-style "Apply Now" announcement popup
   Admin dashboard se control hota hai:  Admin ▸ Website Content ▸ Popup notice
   Visitor ❌ se band kare to dobara nahi aata (jab tak admin text na badle).
   ========================================================================= */
(function () {
  'use strict';

  var App = window.App || (window.App = {});
  var KEY_PREFIX = 'ypdc_popup_seen_';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function defaults() {
    return {
      enabled: true,
      title: 'Admissions & Registrations Open',
      text: 'Bano Shaheen, YPDC membership and team registrations are open for University of Narowal students. Apply online — it only takes two minutes.',
      ctaText: 'Apply Now',
      ctaHref: '#/induction'
    };
  }

  App.popupDefaults = defaults;

  App.popupConfig = function () {
    var S = window.YPDC && window.YPDC.state ? window.YPDC.state : null;
    var p = (S && S.site && S.site.popup) || null;
    var d = defaults();
    if (!p || typeof p !== 'object') return d;
    return {
      enabled: p.enabled === undefined ? true : !!p.enabled,
      title: String(p.title || d.title),
      text: String(p.text || d.text),
      ctaText: String(p.ctaText || d.ctaText),
      ctaHref: String(p.ctaHref || d.ctaHref)
    };
  };

  function fingerprint(cfg) {
    return btoa(unescape(encodeURIComponent(cfg.title + '|' + cfg.text + '|' + cfg.ctaText + '|' + cfg.ctaHref))).slice(0, 40);
  }

  function seen(cfg) {
    try { return localStorage.getItem(KEY_PREFIX + fingerprint(cfg)) === '1'; }
    catch (e) { return false; }
  }

  function markSeen(cfg) {
    try { localStorage.setItem(KEY_PREFIX + fingerprint(cfg), '1'); } catch (e) {}
  }

  function close(el, cfg) {
    markSeen(cfg);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    document.removeEventListener('keydown', el._esc);
  }

  var onPage = false;

  App.showPopupNotice = function (force) {
    if (onPage) return;
    var cfg = App.popupConfig();
    if (!cfg.enabled) return;
    var hash = location.hash || '#/';
    if (!force && hash.indexOf('#/portal') === 0) return;
    if (!force && seen(cfg)) return;
    if (document.querySelector('.ypdc-popup')) return;

    var el = document.createElement('div');
    el.className = 'ypdc-popup';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Announcement');
    el.innerHTML =
      '<div class="ypdc-popup-backdrop" data-popup-close></div>' +
      '<div class="ypdc-popup-card">' +
      '<button class="ypdc-popup-x" type="button" data-popup-close aria-label="Close announcement">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
      '<path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<div class="ypdc-popup-art" aria-hidden="true">' +
      '<span class="ppa-badge">YPDC</span>' +
      '<span class="ppa-uni">University of Narowal</span>' +
      '</div>' +
      '<div class="ypdc-popup-body">' +
      '<span class="ypdc-popup-tag">Announcement</span>' +
      '<h3>' + esc(cfg.title) + '</h3>' +
      '<p>' + esc(cfg.text) + '</p>' +
      '<div class="ypdc-popup-actions">' +
      '<a class="btn btn-gold" href="' + esc(cfg.ctaHref) + '" data-popup-go>' + esc(cfg.ctaText) + '</a>' +
      '<button class="btn btn-quiet" type="button" data-popup-close>Not now</button>' +
      '</div>' +
      '</div></div>';

    document.body.appendChild(el);
    onPage = true;
    requestAnimationFrame(function () { el.classList.add('is-in'); });

    el._esc = function (e) {
      if (e.key === 'Escape') { close(el, cfg); onPage = false; }
    };
    document.addEventListener('keydown', el._esc);

    el.addEventListener('click', function (e) {
      var go = e.target.closest ? e.target.closest('[data-popup-go]') : null;
      if (go) { markSeen(cfg); onPage = false; }
      var x = e.target.closest ? e.target.closest('[data-popup-close]') : null;
      if (x) { e.preventDefault(); close(el, cfg); onPage = false; }
    });

    var first = el.querySelector('.ypdc-popup-x');
    if (first) first.focus();
  };

  /* public pages par khud-ba-khud (thodi der baad) */
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () { App.showPopupNotice(); }, 900);
  });
  window.addEventListener('hashchange', function () {
    setTimeout(function () { App.showPopupNotice(); }, 700);
  });
})();
