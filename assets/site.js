/* Shared shell behaviour: theme toggle, mobile nav, small helpers. */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------------------------------------------------------- theme */
  var t = document.getElementById('theme-toggle');
  if (t) {
    t.addEventListener('click', function () {
      var dark = root.classList.toggle('dark');
      try { localStorage.setItem('pz-theme', dark ? 'dark' : 'light'); } catch (e) {}
    });
  }
  /* follow the OS while the user has not chosen */
  try {
    if (!localStorage.getItem('pz-theme') && window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function (e) {
        root.classList.toggle('dark', e.matches);
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
    }
  } catch (e) {}

  /* ---------------------------------------------------------- mobile nav */
  var nb = document.getElementById('nav-toggle');
  var nm = document.getElementById('nav-mobile');
  if (nb && nm) {
    nb.addEventListener('click', function () {
      var open = nm.classList.toggle('hidden') === false;
      nb.setAttribute('aria-expanded', String(open));
    });
  }

  /* ---------------------------------------------------------- helpers */
  function debounce(fn, ms) {
    var h;
    return function () {
      var a = arguments, c = this;
      clearTimeout(h);
      h = setTimeout(function () { fn.apply(c, a); }, ms);
    };
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* escape then highlight, so a match can never inject markup */
  function highlight(text, terms) {
    var out = String(text == null ? '' : text);
    if (!terms || !terms.length) return out;
    var re = new RegExp('(' + terms.map(escapeRe).join('|') + ')', 'gi');
    var parts = out.split(re);
    for (var i = 0; i < parts.length; i++) {
      if (terms.some(function (t) {
        return t.length && parts[i].toLowerCase() === t.toLowerCase();
      })) {
        parts[i] = '<mark>' + parts[i] + '</mark>';
      }
    }
    return parts.join('');
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function readData() {
    var n = document.getElementById('pz-data');
    if (!n) return null;
    try { return JSON.parse(n.textContent); } catch (e) { return null; }
  }

  window.pz = { debounce: debounce, el: el, highlight: highlight, escapeRe: escapeRe, readData: readData };
})();
/* ---- floating top/bottom navigation, revealed past the header ---- */
(function () {
  'use strict';
  var box = document.getElementById('edge-nav');
  var top = document.getElementById('to-top');
  var bot = document.getElementById('to-bottom');
  if (!box || !top || !bot) return;

  var trigger = function () {
    var hero = document.getElementById('dex-hero');
    var limit = hero ? hero.getBoundingClientRect().bottom + 24 : 220;
    return window.scrollY > limit;
  };
  var paint = function () {
    var on = trigger();
    box.style.opacity = on ? '1' : '0';
    box.setAttribute('aria-hidden', on ? 'false' : 'true');
    box.style.pointerEvents = on ? 'auto' : 'none';
  };
  var raf = null;
  window.addEventListener('scroll', function () {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = null; paint(); });
  }, { passive: true });
  window.addEventListener('resize', paint);
  var calm = matchMedia('(prefers-reduced-motion: reduce)');

  /* Chromium scales smooth-scroll duration with distance, and this page is tens
     of thousands of pixels tall. Animating a full-length jump takes about four
     seconds, so glide short hops and cut long ones. */
  var LONG_JUMP = 4 * (window.innerHeight || 800);
  function jumpTo(top) {
    var far = Math.abs(top - window.scrollY) > LONG_JUMP;
    window.scrollTo({ top: top, behavior: (calm.matches || far) ? 'instant' : 'smooth' });
  }
  /* An instant jump can land before the scroll handler settles, so repaint. */
  function jumpAndPaint(top) {
    jumpTo(top);
    paint();
    setTimeout(paint, 80);
    setTimeout(paint, 700);
  }
  top.addEventListener('click', function () { jumpAndPaint(0); });
  bot.addEventListener('click', function () { jumpAndPaint(document.documentElement.scrollHeight); });
  paint();
})();
