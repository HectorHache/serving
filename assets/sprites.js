/* Boss sprite gallery: filter by identification status, search, open a detail dialog. */
(function () {
  'use strict';
  var pz = window.pz;
  var data = pz.readData();
  var grid = document.getElementById('sp-grid');
  if (!data || !grid) return;
  var cards = data.cards || [];

  var q = document.getElementById('sp-search');
  var count = document.getElementById('sp-count');
  var filter = 'all';

  function chipFor(sp) {
    if (!sp.unk) return '<span class="type-chip bg-ink-600">identified</span>';
    if (sp.alt) return '<span class="type-chip bg-ember-600">competing</span>';
    return '<span class="type-chip bg-ink-400">open</span>';
  }

  function card(c) {
    var a = document.createElement('button');
    a.type = 'button';
    a.className = 'flex flex-col items-center rounded-xl border border-ink-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-kalos-400 hover:shadow-md dark:border-ink-800 dark:bg-ink-900 dark:hover:border-kalos-600';
    a.innerHTML =
      '<img src="' + c.img + '" alt="Boss sprite on guide page ' + c.p + '" loading="lazy" decoding="async" ' +
      'class="h-20 w-20 object-contain">' +
      '<div class="mt-2 w-full truncate text-center font-sans text-xs font-semibold text-ink-900 dark:text-white">' +
      (c.unk ? '<span class="text-ink-400 dark:text-ink-500">UNKNOWN</span>' : c.sp) + '</div>' +
      '<div class="mt-0.5 font-mono text-[10px] text-ink-400 dark:text-ink-500">L' + (c.lvl || '?') + ' · p' + c.p + '</div>' +
      '<div class="mt-1.5">' + chipFor(c) + '</div>';
    a.addEventListener('click', function () { detail(c); });
    return a;
  }

  function detail(c) {
    var d = document.createElement('dialog');
    d.className = 'm-auto w-[min(30rem,92vw)] rounded-2xl border border-ink-200 bg-white p-0 text-ink-900 shadow-2xl backdrop:bg-ink-950/60 backdrop:backdrop-blur-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100';
    var rows = [
      ['Species', c.unk ? 'UNKNOWN' : c.sp],
      ['Competing ID', c.alt || 'none'],
      ['Confidence', c.conf || ''],
      ['Level', c.lvl],
      ['Held item', c.item],
      ['Ability', c.ab],
      ['Nature', c.nat],
      ['Moves', c.mv],
      ['Guide page', c.p],
    ];
    var html = '<div class="flex items-center justify-between border-b border-ink-200 px-4 py-3 dark:border-ink-700">' +
      '<h2 class="font-sans text-sm font-semibold">Boss roster entry, guide page ' + c.p + '</h2>' +
      '<button type="button" data-close class="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="Close">' +
      '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="flex flex-col items-center gap-3 px-4 py-5">' +
      '<img src="' + c.img + '" alt="Boss sprite" class="h-32 w-32 object-contain">' +
      '<div>' + chipFor(c) + '</div></div>' +
      '<dl class="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 border-t border-ink-200 px-4 py-4 font-sans text-sm dark:border-ink-700">';
    rows.forEach(function (r) {
      if (!r[1]) return;
      html += '<dt class="font-semibold text-ink-500 dark:text-ink-400">' + r[0] + '</dt>' +
        '<dd class="min-w-0 break-words text-ink-900 dark:text-ink-100">' + String(r[1]).replace(/</g, '&lt;') + '</dd>';
    });
    d.innerHTML = html + '</dl>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-close]')) d.remove();
    });
    d.showModal();
  }

  function apply() {
    var terms = query_().toLowerCase().split(/\s+/).filter(Boolean);
    var res = cards.filter(function (c) {
      if (filter === 'identified' && c.unk) return false;
      if (filter === 'unknown' && !c.unk) return false;
      if (!terms.length) return true;
      var hay = [c.sp, c.alt, c.lvl, c.item, c.ab, c.nat, c.mv, c.p, c.conf].join(' ').toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) >= 0; });
    });
    count.textContent = res.length.toLocaleString() + ' of ' + cards.length.toLocaleString() + ' entries';
    var frag = document.createDocumentFragment();
    for (var i = 0; i < res.length; i++) frag.appendChild(card(res[i]));
    grid.innerHTML = '';
    grid.appendChild(frag);
  }

  function query_() { return q.value.trim(); }

  q.addEventListener('input', pz.debounce(apply, 150));
  Array.prototype.forEach.call(document.querySelectorAll('.sp-filter'), function (b) {
    b.addEventListener('click', function () {
      filter = b.getAttribute('data-sp-filter');
      Array.prototype.forEach.call(document.querySelectorAll('.sp-filter'), function (x) {
        x.setAttribute('aria-pressed', String(x === b));
      });
      apply();
    });
  });
  apply();
})();