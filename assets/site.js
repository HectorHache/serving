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