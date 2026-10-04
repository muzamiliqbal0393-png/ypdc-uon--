(function () {
  'use strict';
  window.App = window.App || {};
  var ASSETS = window.YPDC_ASSETS || {};
  var IMG_VER = 'R39.0';
  function imgFile(n) { return ASSETS[n] || ('assets/img/' + n + '?v=' + IMG_VER); }
  function mediaFile(n) { return 'assets/media/' + n + '?v=' + IMG_VER; }
  function storedImg(v) {
    return typeof v === 'string' && (v.indexOf('data:') === 0 || v.indexOf('assets/') === 0 || v.indexOf('/uploads/') === 0);
  }
  function brand(key, fallback) {
    var st = (window.YPDC && window.YPDC.state) || {};
    var photos = (st.site && st.site.photos) || {};
    var v = photos[key];
    return storedImg(v) ? v : imgFile(fallback);
  }
  var DEFAULT_GALLERY = ['dialogue-stage.jpg', 'event-volunteers.jpg', 'community-drive.jpg', 'workshop-lab.jpg',
    'mentorship.jpg', 'award-ceremony.jpg', 'freshers-desk.jpg', 'hero-campus.jpg'];
  function galleryList() {
    var st = (window.YPDC && window.YPDC.state) || {};
    var up = (st.site && st.site.photos && st.site.photos.gallery) || [];
    var imgs = up.filter(storedImg);
    return imgs.length ? imgs : DEFAULT_GALLERY.map(imgFile);
  }
  function logoImg(fallback) {
    var st = (window.YPDC && window.YPDC.state) || {};
    var custom = st.site && st.site.logo;
    return storedImg(custom) ? custom : imgFile(fallback || 'logo-ypdc.png');
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function fmtDate(d) {
    if (!d) return '—';
    var dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
  }
  function money(n) { return Number(n).toLocaleString('en-PK'); }
  function slugTitle(s) { return String(s).replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  function roleTitle(role) {
    return ({ student: 'Volunteer', member: 'General Member', directorate: 'Directorate', faculty: 'Faculty',
      admin: 'Admin', alumni: 'Alumni', guest: 'Guest' })[String(role || '').toLowerCase()] || slugTitle(role || 'Portal');
  }

  var I = {
    search: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>',
    bell: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    grid: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>',
    user: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>',
    logout: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>',
    chat: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-7a8 8 0 0 1 8-8h2a8 8 0 0 1 8 4Z"/></svg>',
    mail: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    phone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h4l2 5-2.5 1.5a12 12 0 0 0 6 6L15 14l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 3 5a1 1 0 0 1 1-1Z"/></svg>',
    pin: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s7-6.3 7-12A7 7 0 0 0 5 10c0 5.7 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    cal: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    facebook: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v7h3v-7h3l1-3h-4v-2c0-.6.4-1 1-1Z"/></svg>',
    instagram: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none"/></svg>',
    tiktok: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.5 3c.4 2.1 1.6 3.4 3.7 3.6v2.6c-1.4.1-2.7-.3-3.8-1v5.9c0 3.3-2.4 5.7-5.5 5.7A5.4 5.4 0 0 1 5.5 14c0-3 2.4-5.4 5.4-5.3.3 0 .7 0 1 .1v2.8c-.3-.1-.7-.2-1-.2-1.5 0-2.6 1.2-2.6 2.6s1.2 2.6 2.7 2.6c1.5 0 2.7-1.1 2.7-2.7V3h2.8Z"/></svg>',
    twitter: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.6 3h3l-6.6 7.6L22 21h-5.6l-4.4-5.8L6.9 21H3.8l7-8L2.5 3h5.7l4.1 5.4L17.6 3Zm-1.1 16h1.7L7.5 4.7H5.7L16.5 19Z"/></svg>',
    whatsapp: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2Zm5.1 14c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.7-.1-1.1-.3-2.6-1.2-3.8-2.6-.6-.7-1.1-1.4-1.4-2.2-.3-.8-.2-1.5 0-2 .2-.4.6-.8 1-.9h.7c.2 0 .4 0 .6.5l.6 1.4c.1.2 0 .4-.1.5l-.4.5c-.1.2-.2.3-.1.5.2.4.6.9 1 1.3.4.4.9.7 1.3.9.2.1.4 0 .5-.1l.5-.6c.2-.2.4-.2.6-.1l1.3.7c.3.2.4.3.4.5 0 .2 0 .6-.1.8Z"/></svg>',
    megaphone: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v3a1 1 0 0 0 1 1h2l3.5 4V6L6 10H4a1 1 0 0 0-1 1Z"/><path d="M14 8a5 5 0 0 1 0 8M17 5a9 9 0 0 1 0 14"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 19v-1.5c0-2-1.7-3.5-3.8-3.5H7.8C5.7 14 4 15.5 4 17.5V19"/><circle cx="10" cy="8" r="3.4"/><path d="M20 19v-1.4c0-1.7-1.3-3-3-3.3M16.4 5.3a3.2 3.2 0 0 1 0 6"/></svg>',
    userPlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="8" r="3.6"/><path d="M3.5 20c0-3.4 2.9-5.5 6.5-5.5 1.3 0 2.5.3 3.5.8"/><path d="M17.5 14v5M20 16.5h-5"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>',
    rocket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 4c3 0 6 3 6 6 0 4-4.5 8-6.5 9.3-.6.4-1.4.4-2 0-2-1.3-6.5-5.3-6.5-9.3 0-3 3-6 6-6Z"/><circle cx="13.5" cy="10" r="2"/><path d="M8 15.5 5.5 18M16 15.5l2.5 2.5"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 8.5 4.6L12 12.2 3.5 7.6 12 3Z"/><path d="m3.5 12 8.5 4.6L20.5 12M3.5 16.4 12 21l8.5-4.6"/></svg>',
    award: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5.5"/><path d="m8.5 14-1.5 7 5-2.6 5 2.6-1.5-7"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.4A2.4 2.4 0 0 1 6.4 3H20v14.6H6.4A2.4 2.4 0 0 0 4 20V5.4Z"/><path d="M20 17.6V21H6.4M8.2 7h8M8.2 10.6h5.2"/></svg>',
    clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4.5" width="14" height="16" rx="2.4"/><path d="M9 4.5V3.4A1.4 1.4 0 0 1 10.4 2h3.2A1.4 1.4 0 0 1 15 3.4v1.1"/><path d="M9 11h6M9 15h4"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7.5" width="18" height="12.5" rx="2.2"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3 12.5h18"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.6"/><path d="M3.6 12h16.8M12 3.4a14 14 0 0 1 0 17.2M12 3.4a14 14 0 0 0 0 17.2"/></svg>',
    trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4 16 5-4.5 4 3 7-7"/><path d="M15 7.5h5v5"/></svg>',
    shieldCheck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.2 2.8v6c0 4.3-3 7.8-7.2 9.2-4.2-1.4-7.2-4.9-7.2-9.2v-6L12 3Z"/><path d="m8.8 12.1 2.3 2.3 4.4-4.6"/></svg>',
    handshake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12 4-4 4 3 3-3 5 4v5l-4 3-4-2-4 2-4-3Z"/><path d="M8 8 4 12"/></svg>',
    sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z"/><path d="M18.5 16.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    filter: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M3 5h18l-7 8v6l-4-2v-4L3 5Z"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 5h11l-1.5 3.5L16 12H5"/></svg>',
    logo: '<svg viewBox="0 0 60 50" width="34" height="28" aria-hidden="true"><path d="M14 4h20a14 14 0 0 1 0 28H22a12 12 0 0 0-8-10Z" fill="#F5D98B"/><path d="M15 46h18a13 13 0 0 0 0-26H18a11 11 0 0 1 9 9Z" fill="#FFFFFF" opacity=".92"/><path d="M31 19.5l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6Z" fill="#003D2F"/></svg>'
  };

  /* ---------------- image fallback (no broken-image icons, ever) ----------------
     Ek hi capture-phase listener har <img> ke error ko pakadta hai aur uski jagah
     ek saaf YPDC placeholder lagata hai. Path ya error kabhi user ko nahi dikhta. */
  function svgUri(svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }

  var FB_PHOTO = svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">' +
    '<rect width="640" height="420" fill="#E8F4EC"/>' +
    '<g fill="none" stroke="#9CCEB2" stroke-width="3">' +
    '<rect x="60" y="70" width="520" height="280" rx="10"/>' +
    '<circle cx="215" cy="165" r="34"/><path d="M92 320l120-104 92 80 78-64 106 88"/>' +
    '</g>' +
    '<text x="320" y="392" text-anchor="middle" font-family="Poppins,Segoe UI,Arial,sans-serif" font-size="22" font-weight="600" fill="#4C7A60">YPDC UON</text>' +
    '</svg>');

  var FB_LOGO = svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 104">' +
    '<rect x="1" y="1" width="338" height="102" rx="12" fill="#FFFFFF" stroke="#D8E7DE" stroke-width="2"/>' +
    '<g transform="translate(18,20)">' +
    '<path d="M22 6h30a20 20 0 0 1 0 40H34a17 17 0 0 0 -12 -14Z" fill="#106934"/>' +
    '<path d="M23 62h26a19 19 0 0 0 0-38H27a16 16 0 0 1 13 13Z" fill="#157A45" opacity=".85"/>' +
    '</g>' +
    '<text x="104" y="46" font-family="Poppins,Segoe UI,Arial,sans-serif" font-size="30" font-weight="700" fill="#0B4A24" letter-spacing="1">YPDC</text>' +
    '<text x="105" y="70" font-family="Poppins,Segoe UI,Arial,sans-serif" font-size="13.5" fill="#66736B">University of Narowal</text>' +
    '</svg>');

  function fbAvatar(name) {
    var ini = initials(name || 'YPDC').slice(0, 2);
    return svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
      '<rect width="200" height="200" fill="#E8F4EC"/>' +
      '<circle cx="100" cy="100" r="88" fill="#FFFFFF" stroke="#D8E7DE" stroke-width="3"/>' +
      '<text x="100" y="122" text-anchor="middle" font-family="Poppins,Segoe UI,Arial,sans-serif" font-size="70" font-weight="700" fill="#106934">' + ini + '</text>' +
      '</svg>');
  }

  function fallbackSrc(el) {
    var kind = (el.getAttribute && el.getAttribute('data-fb')) || '';
    if (kind === 'logo') return FB_LOGO;
    if (kind === 'avatar') return fbAvatar(el.getAttribute('data-name') || el.getAttribute('alt'));
    return FB_PHOTO;
  }

  function installImageFallback() {
    document.addEventListener('error', function (e) {
      var el = e.target;
      if (!el || el.tagName !== 'IMG' || el.getAttribute('data-fb-done')) return;
      el.setAttribute('data-fb-done', '1');
      var alt = el.getAttribute('alt') || '';
      el.classList.add('img-fallback');
      el.setAttribute('src', fallbackSrc(el));
      if (alt) el.setAttribute('title', alt);
      if (el.getAttribute('data-fb') === 'logo') { el.style.height = el.style.height || '52px'; el.style.width = 'auto'; }
    }, true);
  }

  /* ek hi jagah se <img> banao — attributes consistent rehte hain */
  function imgTag(src, alt, opts) {
    opts = opts || {};
    return '<img src="' + String(src || '') + '" alt="' + esc(alt || '') + '"' +
      (opts.cls ? ' class="' + opts.cls + '"' : '') +
      ' data-fb="' + (opts.fb || 'photo') + '"' +
      (opts.name ? ' data-name="' + esc(opts.name) + '"' : '') +
      (opts.loading === false ? '' : ' loading="lazy"') +
      (opts.attr || '') + '>';
  }

  window.App.$ = $;
  window.App.$$ = $$;
  window.App.esc = esc;
  window.App.img = imgFile;
  window.App.media = mediaFile;
  window.App.brand = brand;
  window.App.storedImg = storedImg;
  window.App.gallery = galleryList;
  window.App.logoImg = logoImg;
  window.App.fmtDate = fmtDate;
  window.App.initials = initials;
  window.App.money = money;
  window.App.slugTitle = slugTitle;
  window.App.roleTitle = roleTitle;
  window.App.installImageFallback = installImageFallback;
  window.App.imgTag = imgTag;
  window.App.fbSrc = fallbackSrc;
  window.App.Icons = I;
  window.App.I = I;
  window.App.ASSETS = ASSETS;
})();
