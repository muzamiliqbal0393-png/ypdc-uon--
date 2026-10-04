(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = typeof IntersectionObserver === 'function';
  function finalText(el) {
    var to = parseFloat(el.getAttribute('data-count'));
    if (!isFinite(to)) return;
    el.textContent = (el.getAttribute('data-prefix') || '') +
      String(to).padStart(parseInt(el.getAttribute('data-pad'), 10) || 1, '0') +
      (el.getAttribute('data-suffix') || '');
    el.setAttribute('data-count-run', '1');
  }
  function revealNow(el, instant) {
    el.classList.add('in');
    if (el.hasAttribute('data-count')) {
      if (instant) finalText(el); else countUp(el, seqDelay(el));
    }
    if (el.classList.contains('ring') && el.hasAttribute('data-p')) {
      el.style.setProperty('--ringp', parseFloat(el.getAttribute('data-p')));
    }
  }
  var SKIP = '.modal, .modal-mask, .drawer, .drawer-mask, .toast-wrap, .search-results, #toasts';

  function decorate(root) {
    root = root || document;

    var sel = [
      '.pbody > .section', '.pbody > .grid', '.pbody > .panel', '.pbody > .phero',
      '.pbody > .stat', '.pbody > .card', '.pbody > .table-wrap',
      'main .section .grid > *', 'main .section > .wrap > .flex-between',
      'main .grid > .card', 'main .grid > .panel', 'main .stat',
      'main .pe-grid > *', 'main .pe-rail > *', 'main .pe-steps > *',
      'main .banner-strip', 'main .media-frame',
      'main .quote-card', 'main .gallery img', 'main .feature-row',
      '.auth-right .auth-card > *', '.auth-left > *',
      '.quick-card', '.welcome-box'
    ].join(',');

    var nodes = [];
    if (root.matches && root.matches(sel)) nodes.push(root);
    Array.prototype.forEach.call(root.querySelectorAll(sel), function (el) {
      if (!el.closest(SKIP)) nodes.push(el);
    });

    nodes.forEach(function (el) {
      if (el.hasAttribute('data-anim')) return;
      var kind = 'up';
      if (el.classList.contains('media-frame') || el.classList.contains('quote-card') || el.closest('.gallery')) kind = 'zoom';
      else if (el.classList.contains('quick-card') || el.classList.contains('welcome-box')) kind = 'right';
      else if (el.classList.contains('phero') || el.classList.contains('banner-strip')) kind = 'fade';
      var i = Array.prototype.indexOf.call(el.parentNode ? el.parentNode.children : [], el);
      el.setAttribute('data-anim', kind);
      el.style.setProperty('--d', Math.min(i, 8) * 70 + 'ms');
    });

    Array.prototype.forEach.call((root.querySelectorAll ? root.querySelectorAll('.bar') : []), function (bar) {
      if (bar.hasAttribute('data-anim')) return;
      var fill = bar.querySelector(':scope > span, :scope > i');
      if (!fill) return;
      var inline = fill.getAttribute('style') || '';
      var m = inline.match(/width\s*:\s*([\d.]+)%/);
      var w = m ? m[1] : (fill.style.width || '0').replace('%', '');
      if (!w) return;
      bar.style.setProperty('--w', w + '%');
      fill.removeAttribute('style');
      bar.setAttribute('data-anim', 'fade');
    });

    Array.prototype.forEach.call((root.querySelectorAll ? root.querySelectorAll('.ring') : []), function (ring) {
      var p = ring.style.getPropertyValue('--p') || ring.getAttribute('data-p');
      if (!p) return;
      p = parseFloat(p);
      ring.style.setProperty('--ringp', 0);
      ring.setAttribute('data-p', p);
      ring.removeAttribute('style');
      ring.style.setProperty('--ringp', 0);
      ring.setAttribute('data-anim', 'zoom');
    });

    Array.prototype.forEach.call((root.querySelectorAll ? root.querySelectorAll('.stat-value, .hero-stats .num, .stat .stat-value') : []), function (el) {
      if (el.hasAttribute('data-count-done')) return;
      var raw = el.textContent.trim();
      var m = raw.match(/^(\D*?)(\d[\d,]*)(\D*)$/);
      if (!m) return;
      var digits = m[2].replace(/,/g, '');
      if (digits.length > 6) return;
      el.setAttribute('data-count-done', '1');
      el.setAttribute('data-count', digits);
      el.setAttribute('data-prefix', m[1]);
      el.setAttribute('data-suffix', m[3]);
      el.setAttribute('data-pad', /^0/.test(m[2]) ? digits.length : 1);
      el.classList.add('count');
      if (!el.hasAttribute('data-anim') && !el.closest(SKIP)) {
        el.setAttribute('data-anim', 'fade');
        el.style.setProperty('--d', '0ms');
      }
    });
  }

  var io = null;
  function observer() {
    if (io) return io;
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.classList.add('in');
        if (el.classList.contains('bar')) el.classList.add('in');
        if (el.classList.contains('ring') && el.hasAttribute('data-p')) {
          el.style.setProperty('--ringp', parseFloat(el.getAttribute('data-p')));
        }
        if (el.hasAttribute('data-count')) countUp(el, seqDelay(el));
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    return io;
  }

  function countUp(el, delay) {
    if (el.getAttribute('data-count-run')) return;
    el.setAttribute('data-count-run', '1');
    var to = parseFloat(el.getAttribute('data-count'));
    var pre = el.getAttribute('data-prefix') || '';
    var suf = el.getAttribute('data-suffix') || '';
    var pad = parseInt(el.getAttribute('data-pad'), 10) || 1;
    function show(v) { el.textContent = pre + String(v).padStart(pad, '0') + suf; }
    if (reduce || !isFinite(to) || to <= 1) { show(to); return; }
    var from = 1;
    var dur = parseInt(el.getAttribute('data-dur'), 10) || (1000 + Math.min(to, 900));
    var t0 = 0;
    function target() {
      var v = parseFloat(el.getAttribute('data-count'));
      return isFinite(v) ? v : to;
    }
    function frame(now) {
      var t2 = target();
      if (!t0) t0 = now;
      var t = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - t, 3);
      show(Math.round(from + (t2 - from) * e));
      if (t < 1) requestAnimationFrame(frame); else show(t2);
    }
    function start() { requestAnimationFrame(frame); }
    if (delay > 0) { show(from); setTimeout(start, delay); } else start();
  }

  var STAGGER = 520, MAXD = 2600, GROUP = '.hero-stats, .grid, .panel, .card, .stats-strip, .pbody > .section';
  function seqDelay(el) {
    var host = (el.closest && el.closest(GROUP)) || document.body;
    var now = performance.now();
    if (!host.__seqT || now - host.__seqT > 1500) host.__seq = 0;
    var n = host.__seq || 0;
    host.__seq = n + 1; host.__seqT = now;
    return Math.min(n * STAGGER, MAXD);
  }

  function sweep() {
    if (!hasIO || reduce) return;
    var nodes = document.querySelectorAll('[data-anim]:not(.in)');
    var vh = window.innerHeight;
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.closest(SKIP)) { el.classList.add('in'); return; }
      var r = el.getBoundingClientRect();
      if (r.top < vh * 1.2) revealNow(el, r.bottom <= 0);
    });
  }

  function observeAll(root) {
    decorate(root || document);
    var nodes = (root || document).querySelectorAll ? (root || document).querySelectorAll('[data-anim]') : [];
    if (!hasIO || reduce) {
      Array.prototype.forEach.call(nodes, function (el) { if (!el.classList.contains('in')) revealNow(el, true); });
      return;
    }
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.classList.contains('in')) return;
      observer().observe(el);
    });
    clearTimeout(observeAll._t);
    observeAll._t = setTimeout(sweep, 700);
    Array.prototype.forEach.call(nodes, function (el) {
      var r = el.getBoundingClientRect();
      if (r.top >= window.innerHeight * 0.92 || r.bottom <= 0) return;
      if (!el.classList.contains('in')) {
        el.classList.add('in');
        if (el.hasAttribute('data-count')) countUp(el, seqDelay(el));
      }
      if (el.classList.contains('ring') && el.hasAttribute('data-p')) {
        el.style.setProperty('--ringp', parseFloat(el.getAttribute('data-p')));
      }
    });
  }

  function initChrome() {
    var app = document.getElementById('app');

    var prog = document.createElement('div');
    prog.className = 'scroll-progress';
    document.body.appendChild(prog);

    var top = document.createElement('button');
    top.className = 'to-top';
    top.setAttribute('aria-label', 'Back to top');
    top.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
    document.body.appendChild(top);

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var h = document.documentElement;
        var max = h.scrollHeight - window.innerHeight;
        var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
        prog.style.width = pct + '%';
        top.classList.toggle('show', h.scrollTop > 700);
        var hdr = document.querySelector('.site-header') || document.querySelector('.ptop');
        if (hdr) hdr.classList.toggle('scrolled', h.scrollTop > 12);
        sweep();
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    window.addEventListener('hashchange', function () { setTimeout(function () { observeAll(document); sweep(); onScroll(); }, 30); });

    if (window.MutationObserver && app) {
      var mo = new MutationObserver(function (muts) {
        var added = false;
        muts.forEach(function (m) { if (m.addedNodes && m.addedNodes.length) added = true; });
        if (added) { observeAll(document); sweep(); }
      });
      mo.observe(app, { childList: true, subtree: true });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    observeAll(document);
    initChrome();
  });
  if (document.readyState !== 'loading') {
    observeAll(document);
    initChrome();
  }

  window.Anim = { observe: observeAll, sweep: sweep, reduce: reduce };
})();
