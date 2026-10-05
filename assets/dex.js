/* Pokedex explorer: search, generation and type filters, live count, lazy render. */
(function () {
  'use strict';
  var pz = window.pz;
  var data = pz.readData();
  var grid = document.getElementById('dex-grid');
  if (!data || !grid) return;
  var dex = data.dex || [];

  var q = document.getElementById('dex-search');
  var gen = document.getElementById('dex-gen');
  var type = document.getElementById('dex-type');
  var legend = document.getElementById('dex-legend');
  var reset = document.getElementById('dex-reset');
  var count = document.getElementById('dex-count');
  var chips = document.getElementById('dex-chips');
  var empty = document.getElementById('dex-empty');

  var TYPES = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
    'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
  var GENS = [['I', 'Gen 1'], ['II', 'Gen 2'], ['III', 'Gen 3'], ['IV', 'Gen 4'], ['V', 'Gen 5'],
    ['VI', 'Gen 6'], ['VII', 'Gen 7'], ['VIII', 'Gen 8'], ['IX', 'Gen 9']];

  /* filter controls */
  gen.innerHTML = '<option value="">All generations</option>' + GENS.map(function (g) {
    return '<option value="' + g[0] + '">' + g[1] + '</option>';
  }).join('');
  type.innerHTML = '<option value="">All types</option>' + TYPES.map(function (t) {
    return '<option value="' + t + '">' + t.charAt(0).toUpperCase() + t.slice(1) + '</option>';
  }).join('');

  function typeChip(t) {
    return '<span class="type-chip t-' + t + '">' + t + '</span>';
  }

  function card(p) {
    var a = document.createElement('a');
    a.href = '#' + p.id;
    a.className = 'group relative flex flex-col overflow-hidden rounded-xl border border-ink-200 bg-white p-3 no-underline transition-all hover:-translate-y-0.5 hover:border-kalos-400 hover:shadow-md dark:border-ink-800 dark:bg-ink-900 dark:hover:border-kalos-600';
    var art = p.art
      ? '<img src="assets/dex/' + p.name + '.png" alt="' + p.display + '" loading="lazy" decoding="async" width="96" height="96" class="mx-auto h-24 w-24 object-contain">'
      : '<div class="mx-auto grid h-24 w-24 place-items-center rounded-full bg-ink-100 text-[10px] font-semibold text-ink-400 dark:bg-ink-800 dark:text-ink-600">no art</div>';
    var badge = (p.legend || p.myth)
      ? '<span class="absolute right-2 top-2 rounded bg-ember-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">'
        + (p.myth ? 'mythical' : 'legend') + '</span>' : '';
    a.innerHTML = badge + art +
      '<div class="mt-2 text-center"><div class="font-mono text-[10px] text-ink-400 dark:text-ink-500">#' +
      String(p.id).padStart(4, '0') + '</div>' +
      '<div class="font-sans text-sm font-semibold capitalize leading-tight text-ink-900 dark:text-white">' +
      p.display + '</div>' +
      '<div class="mt-1.5 flex flex-wrap justify-center gap-1">' +
      p.types.map(typeChip).join('') + '</div>' +
      '<div class="mt-2 flex items-center justify-center gap-2 font-mono text-[10px] text-ink-400 dark:text-ink-500">' +
      '<span title="base stat total">' + p.bst + ' BST</span>' +
      '<span aria-hidden="true">·</span>' +
      '<span title="base stats">HP ' + p.hp + ' / Atk ' + p.atk + ' / Def ' + p.def +
      ' / SpA ' + p.spa + ' / SpD ' + p.spd + ' / Spe ' + p.spe + '</span>' +
      '</div></div>';
    return a;
  }

  var state = { q: '', gen: '', type: '', legend: false };
  var lastSig = '';

  function apply() {
    var terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    var res = dex.filter(function (p) {
      if (state.gen && p.gen !== state.gen) return false;
      if (state.type && p.types.indexOf(state.type) < 0) return false;
      if (state.legend && !p.legend && !p.myth) return false;
      if (!terms.length) return true;
      var hay = p.name + ' ' + p.display + ' ' + p.genus + ' ' + p.types.join(' ') + ' ' +
        p.abilities.join(' ') + ' ' + p.id;
      return terms.every(function (t) { return hay.toLowerCase().indexOf(t) >= 0; });
    });

    count.textContent = res.length.toLocaleString() + ' of ' + dex.length.toLocaleString() + ' species';
    empty.classList.toggle('hidden', res.length > 0);
    grid.classList.toggle('hidden', res.length === 0);

    /* active filter chips */
    var cl = '';
    if (state.q) cl += chip('q', '"' + state.q + '"');
    if (state.gen) cl += chip('gen', GENS.filter(function (g) { return g[0] === state.gen; })[0][1]);
    if (state.type) cl += chip('type', state.type);
    if (state.legend) cl += chip('legend', 'legendary only');
    chips.innerHTML = cl;

    /* re-render only when the visible set actually changed */
    var sig = res.length + ':' + (res[0] ? res[0].id : 0) + ':' + (res[res.length - 1] ? res[res.length - 1].id : 0);
    if (sig === lastSig) return;
    lastSig = sig;

    var frag = document.createDocumentFragment();
    for (var i = 0; i < res.length; i++) frag.appendChild(card(res[i]));
    grid.textContent = '';
    grid.appendChild(frag);
  }

  function chip(key, label) {
    return '<button type="button" data-clear="' + key + '" class="flex items-center gap-1 rounded-full border border-ink-300 px-2 py-0.5 text-[11px] text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800">' +
      label + ' <span aria-hidden="true">×</span></button>';
  }

  var onInput = pz.debounce(function () { state.q = q.value.trim(); apply(); }, 150);
  q.addEventListener('input', onInput);
  gen.addEventListener('change', function () { state.gen = gen.value; apply(); });
  type.addEventListener('change', function () { state.type = type.value; apply(); });
  legend.addEventListener('change', function () { state.legend = legend.checked; apply(); });

  function doReset() {
    state = { q: '', gen: '', type: '', legend: false };
    q.value = ''; gen.value = ''; type.value = ''; legend.checked = false;
    lastSig = '';
    apply();
  }
  reset.addEventListener('click', doReset);
  var er = document.getElementById('dex-empty-reset');
  if (er) er.addEventListener('click', doReset);

  chips.addEventListener('click', function (e) {
    var b = e.target.closest('[data-clear]');
    if (!b) return;
    var k = b.getAttribute('data-clear');
    state[k] = k === 'legend' ? false : '';
    q.value = k === 'q' ? '' : q.value;
    gen.value = k === 'gen' ? '' : gen.value;
    type.value = k === 'type' ? '' : type.value;
    legend.checked = k === 'legend' ? false : legend.checked;
    lastSig = '';
    apply();
  });

  apply();
})();