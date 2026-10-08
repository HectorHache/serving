/* Pokedex explorer.
   - search, generation / type / legendary filters
   - sorting by any stat in either direction, applied after filtering
   - a caught tracker persisted in localStorage
   - a badge tracker persisted in localStorage
   - a per-species detail sheet built from the parsed developer guide, so the
     "where do I get this" note cites the guide page it came from */
(function () {
  'use strict';
  var pz = window.pz;
  var data = pz.readData();
  var grid = document.getElementById('dex-grid');
  if (!data || !grid) return;
  var dex = data.dex || [];
  var catchIndex = {};
  (data.catch || []).forEach(function (r) { catchIndex[r.species] = r; });
  var evos = data.evos || {};
  var badges = data.badges || [];

  var q = document.getElementById('dex-search');
  var gen = document.getElementById('dex-gen');
  var type = document.getElementById('dex-type');
  var sort = document.getElementById('dex-sort');
  var dirBtn = document.getElementById('dex-dir');
  var dirLabel = document.getElementById('dex-dir-label');
  var dirArrow = document.getElementById('dex-dir-arrow');
  var chipBtns = {};
  document.querySelectorAll('[data-chip]').forEach(function (b) { chipBtns[b.dataset.chip] = b; });
  var reset = document.getElementById('dex-reset');
  var count = document.getElementById('dex-count');
  var chips = document.getElementById('dex-chips');
  var empty = document.getElementById('dex-empty');
  var caughtToggle = document.getElementById('caught-toggle');
  var caughtCount = document.getElementById('caught-count');
  var caughtBar = document.getElementById('caught-bar');
  var badgeBox = document.getElementById('badge-tracker');
  var badgeCount = document.getElementById('badge-count');

  /* the first screenful gets priority; the rest of 1025 stay lazy */
  var PRIORITY_N = 24;

  var TYPES = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
    'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
  var GENS = [['I', 'Gen 1'], ['II', 'Gen 2'], ['III', 'Gen 3'], ['IV', 'Gen 4'], ['V', 'Gen 5'],
    ['VI', 'Gen 6'], ['VII', 'Gen 7'], ['VIII', 'Gen 8'], ['IX', 'Gen 9']];
  var SORTS = [
    ['bst', 'Overall strength (BST)', true, 'Strongest', 'Weakest'],
    
    ['hp', 'HP', true, 'Most HP', 'Least HP'],
    ['atk', 'Attack', true, 'Most Attack', 'Least Attack'],
    ['def', 'Defense', true, 'Most Defense', 'Least Defense'],
    ['spa', 'Sp. Attack', true, 'Most Sp. Atk', 'Least Sp. Atk'],
    ['spd', 'Sp. Defense', true, 'Most Sp. Def', 'Least Sp. Def'],
    ['spe', 'Speed', true, 'Fastest', 'Slowest'],
    ['name', 'Name (A-Z)', false, 'Z-A', 'A-Z'],
    ['id', 'Dex number', false, 'Highest #', 'Lowest #']
  ];

  /* ---------------------------------------------------- persistence */
  var K_CAUGHT = 'pz-caught';
  var K_BADGES = 'pz-badges';
  var K_HIDE = 'pz-hide-caught';
  var K_FORMS = 'pz-forms';
  var K_SQUIRTLE_SHADES = 'pz-squirtle-shades';

  function isSquirtleShadesActive() {
    return !!load(K_SQUIRTLE_SHADES, false);
  }
  function setSquirtleShadesActive(val) {
    save(K_SQUIRTLE_SHADES, !!val);
  }

  function squirtleShadesSvg(isGrid, isVisible) {
    var idAttr = isGrid ? '' : ' id="squirtle-shades"';
    var displayStyle = (isVisible === false) ? 'display:none;' : 'display:block;';
    return '<svg' + idAttr + ' class="pointer-events-none absolute filter drop-shadow-md" style="top:18px;left:18px;width:58px;height:26px;z-index:30;pointer-events:none;transform:rotate(-3deg);transform-origin:center center;' + displayStyle + '" viewBox="0 0 100 45">' +
      '<polygon points="0,4 46,12 38,40 14,36" fill="#111827" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<polygon points="54,12 100,4 86,36 62,40" fill="#111827" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<line x1="45" y1="12" x2="55" y2="12" stroke="#111827" stroke-width="4.5" stroke-linecap="round"/>' +
      '<polygon points="8,10 24,13 16,30 6,24" fill="#38bdf8" opacity="0.6"/>' +
      '<polygon points="62,14 78,11 88,24 74,29" fill="#38bdf8" opacity="0.6"/>' +
      '<polygon points="12,12 20,13 14,24 8,20" fill="#ffffff" opacity="0.85"/>' +
      '<polygon points="66,13 74,12 82,21 72,25" fill="#ffffff" opacity="0.85"/>' +
    '</svg>';
  }

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  var caught = load(K_CAUGHT, {});
  if (Array.isArray(caught)) {
    var tmp = {};
    caught.forEach(function (n) { tmp[n] = 1; });
    caught = tmp;
  }
  var badgeState = load(K_BADGES, {});
  var formCaught = load(K_FORMS, {});
  var hideCaught = load(K_HIDE, false) === true;

  function isCaught(name) { return !!caught[name]; }
  function formKey(base, form) { return base + '\u0001' + form; }
  function isFormCaught(base, form) { return !!formCaught[formKey(base, form)]; }
  function formPillClass(kind, on) {
    var BASE = 'rounded-full border px-1.5 py-0.5 font-sans text-[9px] font-semibold leading-none transition-colors';
    if (on) {
      return BASE + ' border-ember-500 bg-ember-500 text-white font-semibold';
    }
    var TONE = {
      Z: 'border-kalos-400 text-kalos-700 dark:border-kalos-600 dark:text-kalos-300 bg-transparent',
      Mega: 'border-ember-400 text-ember-700 dark:border-ember-600 dark:text-ember-400 bg-transparent',
      other: 'border-ink-300 text-ink-500 dark:border-ink-700 dark:text-ink-400 bg-transparent'
    }[kind] || 'border-ink-300 text-ink-500 dark:border-ink-700 dark:text-ink-400 bg-transparent';
    return BASE + ' ' + TONE;
  }

  function toggleForm(base, form) {
    var k = formKey(base, form);
    if (formCaught[k]) delete formCaught[k]; else formCaught[k] = 1;
    save(K_FORMS, formCaught);
    paintFormsCount();
    refreshCard(base);
  }
  function formsDone(name) {
    var e = dexByName[name];
    if (!e || !e.forms) return 0;
    return e.forms.filter(function (f) { return isFormCaught(name, f.name); }).length;
  }
  function paintFormsCount() {
    var n = Object.keys(formCaught).length;
    if (caughtCount) {
      var total = Object.keys(caught).length;
      caughtCount.textContent = total.toLocaleString() + ' / ' + dex.length.toLocaleString() + ' caught' +
        (n ? ' \u00b7 ' + n + ' forms' : '');
    }
  }
  /* Two name helpers with two jobs: species names come from the payload's
     pre-built label, type names come from the chart's Spanish names. */
  function speciesLabel(p) {
    if (typeof p === 'string') {
      var e = dexByName[p];
      return e ? (e.label || e.display || p) : p;
    }
    return (p && (p.label || p.display || p.name)) || '';
  }

  var dexByName = {};
  dex.forEach(function (d) { dexByName[d.name] = d; });

  /* ---------------------------------------------------- detail sheet */
  var sheet = document.createElement('dialog');
  sheet.id = 'dex-sheet';
  sheet.className = 'w-[min(46rem,92vw)] rounded-2xl border border-ink-200 bg-parchment p-0 text-ink-900 backdrop:bg-ink-950/60 backdrop:backdrop-blur-sm dark:border-ink-800 dark:bg-ink-900 dark:text-ink-100';
  sheet.addEventListener('click', function (e) { if (e.target === sheet) sheet.close(); });
  document.body.appendChild(sheet);

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  
  /* ---------------------------------------------------- evolutions */
  function renderEvolutions(p) {
    var fam = evos[p.name];
    if (!fam || !fam.tree || fam.tree.length <= 1) {
      return '<div class="mt-2 rounded-xl border border-ink-200/80 bg-ink-50/50 p-3 text-xs text-ink-500 dark:border-ink-800/80 dark:bg-ink-900/50">This species does not evolve.</div>';
    }

    var stages = {};
    var maxStage = 1;
    fam.tree.forEach(function (node) {
      var st = node.stage || 1;
      if (st > maxStage) maxStage = st;
      stages[st] = stages[st] || [];
      stages[st].push(node);
    });

    var html = ['<div class="mt-2.5 flex flex-wrap items-center gap-2 overflow-x-auto pb-1 text-sm">'];

    for (var s = 1; s <= maxStage; s++) {
      var list = stages[s] || [];
      if (!list.length) continue;

      if (s > 1) {
        html.push('<div class="flex items-center justify-center px-0.5 text-ink-300 dark:text-ink-600 font-bold text-base select-none">→</div>');
      }

      html.push('<div class="flex flex-col gap-2">');
      list.forEach(function (node) {
        var isCurrent = (node.name === p.name);
        var targetSp = dexByName[node.name];
        var imgId = node.id ? node.id : (targetSp ? targetSp.id : null);
        var imgPath = imgId ? ('assets/dex/' + imgId + '.png') : 'assets/brand/z-logo.png';
        var numLabel = node.id ? ('#' + String(node.id).padStart(4, '0')) : (node.custom ? 'Ancient Kalos (Z)' : '');
        var methodBadge = node.method
          ? '<div class="mt-1 inline-block rounded-md bg-kalos-100 px-2 py-0.5 text-[10.5px] font-semibold text-kalos-800 dark:bg-kalos-950 dark:text-kalos-300 max-w-[140px] truncate text-center" title="' + esc(node.method) + '">' + esc(node.method) + '</div>'
          : '';

        var activeClass = isCurrent
          ? 'ring-2 ring-kalos-500 bg-kalos-50/80 dark:bg-kalos-950/60 border border-kalos-400 font-bold'
          : 'border border-ink-200/80 bg-white hover:bg-ink-100 hover:border-ink-300 dark:border-ink-800/80 dark:bg-ink-900 dark:hover:bg-ink-800';

        html.push(
          '<button type="button" data-openevo="' + esc(node.name) + '" ' +
            'class="group flex flex-col items-center rounded-xl p-2 transition-all text-center min-w-[95px] ' + activeClass + '">' +
            '<img src="' + imgPath + '" alt="' + esc(node.label) + '" width="44" height="44" class="h-11 w-11 object-contain transition-transform group-hover:scale-105" onerror="this.style.opacity=0.3">' +
            '<div class="mt-1 text-xs font-semibold leading-tight text-ink-900 dark:text-ink-100">' + esc(node.label) + '</div>' +
            (numLabel ? '<div class="font-mono text-[10px] text-ink-400">' + esc(numLabel) + '</div>' : '') +
            methodBadge +
          '</button>'
        );
      });
      html.push('</div>');
    }

    html.push('</div>');
    return html.join('');
  }

  function getMaxStat(p, stat) {
    var val = Number(p[stat]) || 0;
    var maxVal = (stat === 'hp') ? 255 : 250;
    var evo = evos[p.name];
    if (evo && evo.tree && evo.tree.length) {
      var peak = val;
      evo.tree.forEach(function (node) {
        var rel = dexByName[node.name];
        if (rel && rel[stat] != null) {
          var rVal = Number(rel[stat]) || 0;
          if (rVal > peak) peak = rVal;
        }
      });
      if (peak > val) return peak;
    }
    return maxVal;
  }

  function statBar(label, val, maxVal, barColorCls) {
    var pct = Math.min(100, Math.max(6, Math.round((val / 250) * 100)));
    return '<div class="flex items-center gap-2 text-xs font-mono">' +
      '<span class="w-24 shrink-0 font-sans text-xs font-semibold text-ink-700 dark:text-ink-300">' + label + '</span>' +
      '<span class="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-ink-900 dark:text-white font-bold">' +
        val + '<span class="text-ink-400 dark:text-ink-500 font-normal">/' + maxVal + '</span></span>' +
      '<div class="h-2 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">' +
        '<div class="h-full rounded-full ' + barColorCls + '" style="width:' + pct + '%"></div>' +
      '</div>' +
    '</div>';
  }

  function statPanel(p) {
    return '<div class="mb-5 rounded-xl border border-ink-200 bg-ink-50/70 p-3.5 dark:border-ink-800 dark:bg-ink-950/60">' +
      '<div class="mb-2.5 flex items-center justify-between font-sans text-xs">' +
        '<span class="font-bold uppercase tracking-wide text-ink-500 dark:text-ink-400">Base stats distribution</span>' +
        '<span class="rounded-full bg-ink-200 px-2.5 py-0.5 font-mono text-[11px] font-bold text-ink-900 dark:bg-ink-800 dark:text-ink-100">' + p.bst + ' BST</span>' +
      '</div>' +
      '<div class="grid gap-2 sm:grid-cols-2 sm:gap-x-4">' +
        statBar('HP', p.hp, getMaxStat(p, 'hp'), 'stat-bar-hp') +
        statBar('Attack', p.atk, getMaxStat(p, 'atk'), 'stat-bar-atk') +
        statBar('Defense', p.def, getMaxStat(p, 'def'), 'stat-bar-def') +
        statBar('Sp. Attack', p.spa, getMaxStat(p, 'spa'), 'stat-bar-spa') +
        statBar('Sp. Defense', p.spd, getMaxStat(p, 'spd'), 'stat-bar-spd') +
        statBar('Speed', p.spe, getMaxStat(p, 'spe'), 'stat-bar-spe') +
      '</div>' +
    '</div>';
  }
  function openSheet(p) {
    var rec = catchIndex[p.name];
    var where = '';
    if (rec && rec.where && rec.where.length) {
      var rows = rec.where.slice(0, 40).map(function (w) {
        return '<tr><td class="font-medium">' + esc(w.location) + '</td>' +
          '<td>' + (w.method === 'fish' ? 'Fishing' : 'Grass') + (w.zone != null ? ' zone ' + w.zone : '') + '</td>' +
          '<td class="font-mono text-xs tabular-nums">' + (w.pct != null ? w.pct + '%' : '&#8212;') + '</td>' +
          '<td>' + (w.drop ? esc(w.drop) : '<span class="text-ink-400">no drop listed</span>') +
            (w.rare ? '<div class="mt-0.5 text-[11px] text-ink-400">rarely ' + esc(w.rare) + '</div>' : '') + '</td>' +
          '<td class="font-mono text-xs text-ink-400">p' + w.page + '</td></tr>';
      }).join('');
      where = '<div class="table-shell not-prose mt-3" role="region" tabindex="0">' +
        '<table class="doc-table"><thead><tr><th>Where</th><th>How</th><th>Rate</th><th>Drops</th><th>Guide</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>' +
        (rec.where.length > 40 ? '<p class="mt-1.5 font-sans text-xs text-ink-400">' + (rec.where.length - 40) + ' more locations in the guide.</p>' : '');
    } else {
      where = '<p class="mt-3 font-sans text-sm text-ink-500 dark:text-ink-400">' +
        'The guide does not list a wild encounter for this species. It is either a gift, a trade, an evolution, ' +
        'or it only appears in a postgame or legendary table.</p>';
    }

    var shadesActive = isSquirtleShadesActive();
    var shadesBtnHtml = (p.name === 'squirtle')
      ? '<button type="button" id="squirtle-shades-btn" title="Squirtle Squad Leader Shades!" class="rounded-full border ' +
        (shadesActive
          ? 'border-kalos-500 bg-kalos-600 text-white shadow-sm hover:bg-kalos-700'
          : 'border-kalos-400 bg-kalos-50 text-kalos-700 hover:bg-kalos-100 dark:border-kalos-600 dark:bg-kalos-950 dark:text-kalos-300') +
        ' px-2 py-0.5 text-[10px] font-bold">' +
        (shadesActive ? '\u2728 Squad Active \u2713' : '\u2728 Squad Shades') + '</button>'
      : '';

    sheet.innerHTML =
      '<div class="flex items-start gap-4 border-b border-ink-200 p-5 dark:border-ink-800">' +
        '<div class="relative shrink-0"><img id="sheet-p-img" src="assets/dex/' + (p.img || p.id) + '.png" alt="" width="96" height="96" class="h-24 w-24 object-contain">' +
          (p.name === 'squirtle' ? squirtleShadesSvg(false, shadesActive) : '') +
        '</div>' +
        '<div class="min-w-0">' +
          '<div class="font-mono text-xs text-ink-400">#' + String(p.id).padStart(4, '0') + ' \u00b7 ' + esc(p.genus || '') + '</div>' +
          '<div class="flex items-center gap-2">' +
            '<h2 class="mt-0.5 font-sans text-xl font-bold">' + esc(speciesLabel(p)) + '</h2>' +
            shadesBtnHtml +
          '</div>' +
          '<div class="mt-1.5 flex flex-wrap gap-1">' + p.types.map(typeChip).join('') + '</div>' +
          '<button id="sheet-caught" type="button" class="mt-3 rounded-lg px-3.5 py-2 font-sans text-sm font-medium ' +
            (isCaught(p.name)
              ? 'bg-ember-500 text-white hover:bg-ember-600'
              : 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-200') + '">' +
            (isCaught(p.name) ? 'Caught \u2713 \u00b7 Click to release' : 'Mark as caught') + '</button>' +
        '</div>' +
        '<button type="button" data-close class="ml-auto shrink-0 rounded-lg border border-ink-200 px-2 py-1 font-sans text-sm text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800">&times;</button>' +
      '</div>' +
      '<div class="p-5">' +
        statPanel(p) +
        '<h3 class="font-sans text-xs font-bold uppercase tracking-[0.12em] text-ink-400">Evolution line</h3>' + renderEvolutions(p) + '<h3 class="mt-5 font-sans text-xs font-bold uppercase tracking-[0.12em] text-ink-400">Where to get it</h3>' +
        where +
        (p.abilities && p.abilities.length && p.abilities[0]
          ? '<p class="mt-4 font-sans text-sm text-ink-600 dark:text-ink-300">Abilities: ' + esc(p.abilities.filter(Boolean).join(', ')) + '</p>'
          : '') +
        (p.forms && p.forms.length
          ? '<h3 class="mt-5 font-sans text-xs font-bold uppercase tracking-[0.12em] text-ink-400">Other forms in this game</h3>' +
            '<p class="mt-1 font-sans text-xs text-ink-500 dark:text-ink-400">Mark each form as caught separately. This game has no standalone Gigantamax: the creator turned those forms into Mega Stones, so they are listed here as Mega.</p>' +
            '<ul class="mt-2 space-y-1.5">'.concat(p.forms.map(function (f) {
              var on = isFormCaught(p.name, f.name);
              return '<li class="flex items-start gap-2 rounded-lg border border-ink-200 p-2 dark:border-ink-800">' +
                '<button type="button" data-sheetform="' + esc(p.name + '\u0001' + f.name) + '" aria-pressed="' + on + '" ' +
                'class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] leading-none ' +
                (on ? 'border-ember-400 bg-ember-500 text-white'
                    : 'border-ink-300 text-transparent dark:border-ink-700') + '">\u2713</button>' +
                '<div class="min-w-0">' +
                  '<div class="font-sans text-sm font-semibold">' + esc(f.name) + '</div>' +
                  '<div class="font-sans text-[11px] text-ink-400">' + esc(f.label || '') +
                    (f.bst ? ' \u00b7 ' + f.bst + ' BST' : '') +
                    (f.types && f.types.length ? ' \u00b7 ' + esc(f.types.join('/')) : '') + '</div>' +
                  (f.notes ? '<div class="mt-0.5 font-sans text-[11px] text-ink-500 dark:text-ink-400">' + esc(f.notes) + '</div>' : '') +
                '</div></li>';
            }).join('')).concat('</ul>')
          : '') +
      '</div>';

    sheet.querySelector('[data-close]').addEventListener('click', function () { sheet.close(); });
    sheet.querySelectorAll('[data-sheetform]').forEach(function (b) {
      b.addEventListener('click', function () {
        var raw = b.getAttribute('data-sheetform').split('\u0001');
        toggleForm(raw[0], raw[1]);
        openSheet(p);
      });
    });
    sheet.querySelectorAll('[data-openevo]').forEach(function (b) {
      b.addEventListener('click', function () {
        var name = b.getAttribute('data-openevo');
        if (dexByName[name]) {
          openSheet(dexByName[name]);
        }
      });
    });
    var sBtn = sheet.querySelector('#squirtle-shades-btn');
    if (sBtn) {
      sBtn.addEventListener('click', function () {
        var next = !isSquirtleShadesActive();
        setSquirtleShadesActive(next);
        var shades = sheet.querySelector('#squirtle-shades');
        if (shades) {
          shades.style.display = next ? 'block' : 'none';
        }
        sBtn.textContent = next ? '\u2728 Squad Active \u2713' : '\u2728 Squad Shades';
        sBtn.className = 'rounded-full border px-2 py-0.5 text-[10px] font-bold ' +
          (next
            ? 'border-kalos-500 bg-kalos-600 text-white shadow-sm hover:bg-kalos-700'
            : 'border-kalos-400 bg-kalos-50 text-kalos-700 hover:bg-kalos-100 dark:border-kalos-600 dark:bg-kalos-950 dark:text-kalos-300');
        refreshCard('squirtle');
      });
    }
    sheet.querySelector('#sheet-caught').addEventListener('click', function () {
      toggleCaught(p.name);
      openSheet(p);
    });
    sheet.showModal();
  }

  function paintCatchBtn(btn, name) {
    var on = isCaught(name);
    btn.setAttribute('aria-pressed', String(on));
    btn.className = 'absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full border text-[11px] leading-none transition-colors ' +
      (on ? 'border-ember-400 bg-ember-500 text-white'
          : 'border-ink-200 bg-white/80 text-transparent hover:border-ember-400 hover:text-ink-300 dark:border-ink-700 dark:bg-ink-900/80');
    var img = btn.parentElement && btn.parentElement.querySelector('img');
    if (img) img.className = img.className.replace(/\s*(opacity-45|saturate-50)/g, '') + (on ? '' : ' opacity-45 saturate-50');
  }

  /* Re-rendering 1025 cards on every tick is both slow and jumpy, so update
     just the touched card in place. */
  function paintCaughtMark(name) {
    var el = grid.querySelector('[data-caught-mark="' + (window.CSS && CSS.escape ? CSS.escape(name) : name) + '"]');
    if (!el) return;
    var on = isCaught(name);
    el.setAttribute('aria-hidden', String(!on));
    el.setAttribute('title', on ? 'Caught' : 'Not caught');
    el.className = el.className.replace(
      / (border-ember-4|bg-ember-500|text-white|border-ink-200|bg-white\/85|text-transparent|border-ink-700|dark:bg-ink-900\/85)\S*/g, '');
    el.className = 'pointer-events-none absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full border text-[11px] font-bold leading-none transition-colors ' +
      (on ? 'border-ember-400 bg-ember-500 text-white'
          : 'border-ink-200 bg-white/85 text-transparent dark:border-ink-700 dark:bg-ink-900/85');
    var img = el.parentElement && el.parentElement.querySelector('img');
    if (img) img.className = img.className.replace(/\s*(opacity-45|saturate-50)/g, '') + (on ? '' : ' opacity-45 saturate-50');
  }

  function refreshCard(name) {
    var key = window.CSS && CSS.escape ? CSS.escape(name) : name;
    var anchor = grid.querySelector('[data-name="' + key + '"]');
    if (!anchor) return;
    /* "show not caught" means a newly ticked species has to leave the grid */
    if (hideCaught && isCaught(name)) { lastSig = ''; apply(); return; }
    var p = dexByName[name];
    if (!p) return;
    var rank = anchor.getAttribute('data-rank');
    anchor.replaceWith(card(p, rank === '' || rank == null ? null : Number(rank)));
  }

  function toggleCaught(name) {
    if (caught[name]) delete caught[name];
    else caught[name] = 1;
    save(K_CAUGHT, caught);
    paintCaught();
    refreshCard(name);
  }

  /* ---------------------------------------------------- hero counters */
  function paintCaught() {
    var n = Object.keys(caught).length;
    var f = Object.keys(formCaught).length;
    if (caughtCount) caughtCount.textContent = n.toLocaleString() + ' / ' + dex.length.toLocaleString() +
      ' caught' + (f ? ' \u00b7 ' + f + ' forms' : '');
    if (caughtBar) caughtBar.style.width = (n / dex.length * 100).toFixed(1) + '%';
    if (caughtToggle) caughtToggle.textContent = hideCaught ? 'Show all species' : 'Show not caught';
  }

  function paintBadges() {
    if (!badgeBox) return;
    var medals = badges.filter(function (b) { return b.isMedal; });
    var fights = badges.filter(function (b) { return !b.isMedal; });

    function tile(b, isMedal) {
      var on = !!badgeState[b.key];
      var t = (b.type || '').split('/').map(function (x) { return x.trim(); }).filter(Boolean);
      var mark = isMedal ? (on ? '\u2713' : b.no) : '\u2694';
      return '<button type="button" data-badge="' + esc(b.key) + '" aria-pressed="' + on + '" ' +
        'title="' + esc(b.site + ' \u00b7 ' + b.levels + ' \u00b7 ' + b.page) + '" ' +
        'class="rounded-lg border p-2 text-left transition-colors ' +
        (on ? 'border-ember-400 bg-ember-50 dark:border-ember-600 dark:bg-ember-950/50'
            : 'border-ink-200 bg-white hover:border-kalos-400 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-kalos-600') + '">' +
        '<div class="flex items-center gap-1.5">' +
          '<span class="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ' +
            (on ? 'bg-ember-500 text-white' : 'bg-ink-200 text-ink-500 dark:bg-ink-800 dark:text-ink-400') + '">' +
            mark + '</span>' +
          '<span class="truncate font-sans text-xs font-semibold">' +
            esc(String(b.leader).replace(/^Regente /, '').replace(/^Alto Mando: /, '')) + '</span>' +
        '</div>' +
        '<div class="mt-1 flex flex-wrap gap-0.5">' +
          t.map(function (x) {
            var k = norm(x);
            /* the gym sheet writes "-" when a site has no type affinity, and
               that produced a chip with an empty type class */
            if (TYPES.indexOf(k) < 0) return '';
            return '<span class="type-chip t-' + k + '">' + esc(x) + '</span>';
          }).join('') +
        '</div>' +
        '<div class="mt-1 truncate font-sans text-[10px] text-ink-400">' +
          esc(isMedal ? b.badge : 'Optional fight, no medal') + '</div>' +
      '</button>';
    }

    var gotMedals = medals.filter(function (b) { return badgeState[b.key]; }).length;
    var html = '';
    if (medals.length) {
      html += '<h3 class="col-span-full mt-1 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">The 12 medals</h3>';
      html += medals.map(function (b) { return tile(b, true); }).join('');
    }
    if (fights.length) {
      html += '<h3 class="col-span-full mt-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">Optional fights, no badge</h3>';
      html += fights.map(function (b) { return tile(b, false); }).join('');
    }
    badgeBox.innerHTML = html;

    badgeBox.querySelectorAll('[data-badge]').forEach(function (el) {
      el.addEventListener('click', function () {
        var k = el.getAttribute('data-badge');
        if (badgeState[k]) delete badgeState[k]; else badgeState[k] = 1;
        save(K_BADGES, badgeState);
        paintBadges();
      });
    });
    if (badgeCount) badgeCount.textContent = gotMedals + ' of ' + medals.length + ' medals, ' +
      fights.filter(function (b) { return badgeState[b.key]; }).length + ' of ' + fights.length + ' fights';
  }

  var TYPE_ES = { Normal: 'normal', Neutro: 'normal', Veneno: 'poison', Fantasma: 'ghost',
    Fuego: 'fire', Electrico: 'electric', Acero: 'steel', Hada: 'fairy', Agua: 'water',
    Volador: 'flying', Planta: 'grass', Psiquico: 'psychic', Lucha: 'fighting', Hielo: 'ice',
    Dragon: 'dragon', Siniestro: 'dark', Roca: 'rock', Tierra: 'ground', Bicho: 'bug' };
  /* The sources disagree on casing: the Pokedex sheet says "Fuego", the gym
     sheet says "FUEGO", and the game calls the Normal type "Neutro". Looking the
     raw string up missed all of them, so the badge chips lost their colours.
     Try the string as given, then title case, then fall back to lower case. */
  function norm(x) {
    var k = String(x == null ? '' : x).trim();
    if (TYPE_ES[k]) return TYPE_ES[k];
    var t = k.charAt(0).toUpperCase() + k.slice(1).toLowerCase();
    return TYPE_ES[t] || k.toLowerCase();
  }

  /* ---------------------------------------------------- controls */
  gen.innerHTML = '<option value="">All generations</option>' + GENS.map(function (g) {
    return '<option value="' + g[0] + '">' + g[1] + '</option>';
  }).join('');
  type.innerHTML = '<option value="">All types</option>' + TYPES.map(function (t) {
    return '<option value="' + t + '">' + t.charAt(0).toUpperCase() + t.slice(1) + '</option>';
  }).join('');
  sort.innerHTML = SORTS.map(function (s) {
    return '<option value="' + s[0] + '"' + (s[0] === 'id' ? ' selected' : '') + '>' + s[1] + '</option>';
  }).join('');

  function typeChip(t) {
    return '<span class="type-chip t-' + t + '">' + t + '</span>';
  }

  function card(p, rank) {
    var a = document.createElement('a');
    a.href = '#';
    a.setAttribute('data-name', p.name);
    a.setAttribute('data-rank', rank == null ? '' : String(rank));
    a.className = 'group relative flex flex-col overflow-hidden rounded-xl border border-ink-200 bg-white p-3 text-left no-underline transition-all hover:-translate-y-0.5 hover:border-kalos-400 hover:shadow-md dark:border-ink-800 dark:bg-ink-900 dark:hover:border-kalos-600';
    var shadesOverlay = (p.name === 'squirtle' && isSquirtleShadesActive())
      ? squirtleShadesSvg(true, true)
      : '';
    var art = p.art
      ? '<div class="relative mx-auto h-24 w-24">' +
          '<img src="assets/dex/' + (p.img || p.id) + '.png" alt="' + esc(speciesLabel(p)) + '" decoding="async" width="96" height="96" ' +
          (rank != null && rank < PRIORITY_N
            ? 'loading="eager" fetchpriority="high"'
            : 'loading="lazy" fetchpriority="low"') +
          ' class="h-24 w-24 object-contain' + (isCaught(p.name) ? '' : ' opacity-45 saturate-50') + '">' +
          shadesOverlay +
        '</div>'
      : '';
    /* The grid card carried no caught state of its own. The only signal was the
       art losing its opacity, and refreshCard looked for a [data-catch] button
       that the grid never rendered, so ticking a species from its card left
       the card looking untouched. */
    var on = isCaught(p.name);
    var caughtMark = '<span data-caught-mark="' + esc(p.name) + '" aria-hidden="' + (!on) + '" ' +
      'title="' + (on ? 'Caught' : 'Not caught') + '" ' +
      'class="pointer-events-none absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full border text-[11px] font-bold leading-none transition-colors ' +
      (on ? 'border-ember-400 bg-ember-500 text-white'
          : 'border-ink-200 bg-white/85 text-transparent dark:border-ink-700 dark:bg-ink-900/85') +
      '">\u2713</span>';
    var badge = (p.legend || p.myth)
      ? '<span class="absolute right-2 top-2 rounded bg-ember-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">'
        + (p.myth ? 'mythical' : 'legend') + '</span>' : '';
    a.innerHTML = caughtMark + badge + art +
      '<div class="mt-2 text-center"><div class="font-mono text-[10px] text-ink-400 dark:text-ink-500">#' +
      String(p.id).padStart(4, '0') + '</div>' +
      '<div class="font-sans text-sm font-semibold leading-tight text-ink-900 dark:text-white">' +
      esc(speciesLabel(p)) + '</div>' +
      '<div class="mt-1.5 flex flex-wrap justify-center gap-1">' +
      p.types.map(typeChip).join('') + '</div>' +
      '<div class="mt-2 flex items-center justify-center gap-2 font-mono text-[10px] text-ink-400 dark:text-ink-500">' +
      '<span title="base stat total">' + p.bst + ' BST</span>' +
      '<span aria-hidden="true">&#183;</span>' +
      '<span title="base stats">HP ' + p.hp + ' / Atk ' + p.atk + ' / Def ' + p.def +
      ' / SpA ' + p.spa + ' / SpD ' + p.spd + ' / Spe ' + p.spe + '</span>' +
      '</div></div>' +
      (p.forms && p.forms.length ? '<div class="mt-2 flex flex-wrap justify-center gap-1">' +
        p.forms.map(function (f) {
          var on = isFormCaught(p.name, f.name);
          return '<button type="button" data-form="' + esc(p.name) + '\u0001' + esc(f.name) + '" ' +
            'data-kind="' + esc(f.kind) + '" ' +
            'aria-pressed="' + on + '" title="' + esc(f.name + (f.label ? ' (' + f.label + ')' : '')) + '" ' +
            'class="' + formPillClass(f.kind, on) + '">' +
            esc(f.kind) + '</button>';
        }).join('') + '</div>' : '') +
      '<button type="button" data-catch="' + esc(p.name) + '" aria-pressed="' + isCaught(p.name) + '" ' +
        'title="Mark as caught" class="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full border text-[11px] leading-none transition-colors ' +
        (isCaught(p.name)
          ? 'border-ember-400 bg-ember-500 text-white'
          : 'border-ink-200 bg-white/80 text-transparent hover:border-ember-400 hover:text-ink-300 dark:border-ink-700 dark:bg-ink-900/80') + '">\u2713</button>';
    return a;
  }

  /* ---------------------------------------------------- collapsible panels */
  var K_PANEL = 'pz-panels';
  var panels = load(K_PANEL, {});
  ['badges-panel', 'forms-tracker', 'matrix-panel'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (panels[id] === true) el.open = true;
    else if (panels[id] === false) el.open = false;
    el.addEventListener('toggle', function () { panels[id] = el.open; save(K_PANEL, panels); });
  });

  /* ---------------------------------------------------- compact type matrix */
  var mini = document.getElementById('t-mini');
  if (mini && data.chart) {
    var MT = data.chart.types, MR = data.chart.rows, MS = data.chart.spanish;
    /* Both axes show the full name, set vertically, so the two read
       identically and neither cell is left with a lot of empty colour. */
    var mcap = function (t) { return MS[t]; };
    var mh = ['<thead><tr><th class="tm-corner"><span class="tm-axes">' +
      '<span>Defending \u2192</span><span>Attacking \u2193</span></span></th>'];
    MT.forEach(function (d, j) {
      mh.push('<th class="tm-hd tm-v tm-mc-' + j + '" data-j="' + j + '" scope="col"><span class="t-' + d +
        '">' + mcap(d) + '</span></th>');
    });
    mh.push('</tr></thead><tbody>');
    MT.forEach(function (a, i) {
      mh.push('<tr><th class="tm-hd tm-h tm-mr-' + i + '" data-i="' + i + '" scope="row"' +
        ' title="' + MS[a] + ' \u00b7 ' + (data.counts[a] || 0) + ' species">' +
        '<span class="t-' + a + '">' + mcap(a) + '</span></th>');
      for (var j = 0; j < MT.length; j++) {
        var v = MR[i][j];
        var b = v === 2 ? '2' : v === 0.5 ? '05' : v === 0 ? '0' : '1';
        mh.push('<td class="tm-cell tm-x' + b + ' tm-m' + i + '-' + j + '" title="' +
          MS[a] + ' into ' + MS[MT[j]] + ' \u00d7' + v + '"></td>');
      }
      mh.push('</tr>');
    });
    mini.innerHTML = mh.join('') + '</tbody>';
    var mtds = mini.querySelectorAll('td');
    var mcount = document.getElementById('matrix-count');
    var mpick = null;          /* index into MT, so cells can compare directly */
    function mpaint() {
      mtds.forEach(function (td) {
        var m = td.className.match(/tm-m(\d+)-(\d+)/);
        var ri = +m[1], ci = +m[2];
        var on = mpick !== null && (ri === mpick || ci === mpick);
        td.classList.toggle('tm-on', on);
        td.classList.toggle('tm-row-off', mpick !== null && !on);
      });
      mini.querySelectorAll('th').forEach(function (h) {
        var k = h.dataset.i !== undefined ? +h.dataset.i : +h.dataset.j;
        h.classList.toggle('on', mpick !== null && k === mpick);
      });
      if (mcount) mcount.textContent = mpick === null ? '18 types'
        : MS[MT[mpick]] + ' \u00b7 ' + (data.counts[MT[mpick]] || 0) + ' species';
    }
    mini.addEventListener('click', function (e) {
      var h = e.target.closest('th[data-i],th[data-j]');
      if (!h) return;
      var k = +(h.dataset.i !== undefined ? h.dataset.i : h.dataset.j);
      mpick = (mpick === k) ? null : k;
      mpaint();
    });
    mpaint();
  }

  /* ---------------------------------------------------- forms tracker */
  var formsGrid = document.getElementById('forms-grid');
  function paintForms() {
    if (!formsGrid) return;
    var term = (document.getElementById('forms-q').value || '').trim().toLowerCase();
    var rows = withForms.filter(function (d) {
      if (term && d.name.toLowerCase().indexOf(term) < 0) return false;
      if (fkind.Z && !isZ(d)) return false;
      if (fkind.Mega && !isMega(d)) return false;
      return true;
    });
    /* Each species gets its own tile: name on top, then its forms two per line.
       A lone form takes the whole row rather than leaving a hole. */
    formsGrid.innerHTML = rows.map(function (d) {
      var one = d.forms.length === 1;
      return '<div class="form-tile">' +
        '<span class="form-name">' + esc(speciesLabel(d)) + '</span>' +
        '<div class="form-picks">' +
        d.forms.map(function (f) {
          return '<button type="button" class="form-btn' + (one ? ' wide' : '') +
            (isFormCaught(d.name, f.name) ? ' on' : '') +
            '" data-base="' + esc(d.name) + '" data-form="' + esc(f.name) +
            '" title="' + esc(f.label || f.kind) + '">' + esc(f.name) + '</button>';
        }).join('') + '</div></div>';
    }).join('') || '<p class="font-sans text-xs text-ink-500">No species match.</p>';
    var nf = rows.reduce(function (n, d) { return n + d.forms.length; }, 0);
    document.getElementById('forms-shown').textContent =
      rows.length + ' of ' + withForms.length + ' species \u00b7 ' + nf + ' forms';
  }
  if (formsGrid) {
    var withForms = dex.filter(function (d) { return (d.forms || []).length; })
      .sort(function (a, b) { return a.id - b.id; });
    var fkind = {};
    document.querySelectorAll('[data-fkind]').forEach(function (b) {
      fkind[b.dataset.fkind] = false;
      b.addEventListener('click', function () {
        fkind[b.dataset.fkind] = !fkind[b.dataset.fkind];
        b.classList.toggle('on', fkind[b.dataset.fkind]);
        paintForms();
      });
    });
    formsGrid.addEventListener('click', function (e) {
      var b = e.target.closest('.form-btn');
      if (!b) return;
      toggleForm(b.dataset.base, b.dataset.form);
      paintForms();
      document.getElementById('forms-count').textContent =
        Object.keys(formCaught).length + ' caught';
      paintCaught();
      lastSig = '';
      apply();
    });
    document.getElementById('forms-q').addEventListener('input', pz.debounce(paintForms, 140));
    document.getElementById('forms-count').textContent = Object.keys(formCaught).length + ' caught';
    paintForms();
  }

  /* ---------------------------------------------------- reset all progress */
  var rcDlg = document.getElementById('reset-confirm');
  if (rcDlg) {
    document.getElementById('progress-reset').addEventListener('click', function () {
      document.getElementById('rc-caught').textContent = Object.keys(caught).length;
      document.getElementById('rc-forms').textContent = Object.keys(formCaught).length;
      document.getElementById('rc-badges').textContent =
        Object.keys(badgeState).filter(function (k) { return badgeState[k]; }).length;
      rcDlg.showModal();
    });
    document.getElementById('rc-cancel').addEventListener('click', function () { rcDlg.close(); });
    document.getElementById('rc-go').addEventListener('click', function () {
      [K_CAUGHT, K_BADGES, K_FORMS, K_HIDE].forEach(function (k) {
        try { localStorage.removeItem(k); } catch (e) {}
      });
      caught = {}; badgeState = {}; formCaught = {}; hideCaught = false;
      rcDlg.close();
      paintBadges(); paintFormsCount(); paintForms();
      reset.click();
    });
  }

  /* ---------------------------------------------------- filters */
  var state = { q: '', gen: '', type: '', legend: false, mega: false, z: false,
                hide: hideCaught, sort: 'id', desc: false };
  /* a species counts as "has a Mega" if any of its forms is a Mega form, and the
     same for Z. The two overlap, so each chip stands on its own. */
  function hasKind(p, re) {
    return (p.forms || []).some(function (f) { return re.test(f.kind); });
  }
  function isMega(p) { return hasKind(p, /Mega/i); }
  function isZ(p) { return hasKind(p, /^Z$/); }
  var lastSig = '';

  function sortMeta(key) {
    for (var i = 0; i < SORTS.length; i++) if (SORTS[i][0] === key) return SORTS[i];
    return SORTS[0];
  }

  function paintDir() {
    var m = sortMeta(state.sort);
    dirLabel.textContent = state.desc ? m[3] : m[4];
    dirArrow.innerHTML = state.desc ? '&#8595;' : '&#8593;';
    dirBtn.setAttribute('aria-label', 'Order: ' + dirLabel.textContent + '. Activate to reverse.');
  }

  function apply() {
    var terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    var res = dex.filter(function (p) {
      if (state.gen && p.gen !== state.gen) return false;
      if (state.type && p.types.indexOf(state.type) < 0) return false;
      if (state.legend && !p.legend && !p.myth) return false;
      if (state.mega && !isMega(p)) return false;
      if (state.z && !isZ(p)) return false;
      if (state.hide && isCaught(p.name)) return false;
      if (hideCaught && isCaught(p.name)) return false;
      if (!terms.length) return true;
      var hay = p.name + ' ' + p.display + ' ' + (p.label || '') + ' ' + p.genus + ' ' + p.types.join(' ') + ' ' +
        p.abilities.join(' ') + ' ' + p.id;
      return terms.every(function (t) { return hay.toLowerCase().indexOf(t) >= 0; });
    });

    /* sort after filter, so any filtered subset can still be ranked */
    if (state.sort === 'name') {
      res.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : a.id - b.id; });
    } else {
      res.sort(function (a, b) { return a[state.sort] - b[state.sort] || a.id - b.id; });
    }
    if (state.desc) res.reverse();

    var meta = sortMeta(state.sort);
    count.textContent = res.length.toLocaleString() + ' of ' + dex.length.toLocaleString() +
      ' species \u00b7 ' + (state.desc ? meta[3] : meta[4]);
    empty.classList.toggle('hidden', res.length > 0);
    grid.classList.toggle('hidden', res.length === 0);
    paintDir();

    state.hide = hideCaught;
    Object.keys(chipBtns).forEach(function (k) {
    var b = chipBtns[k];
    b.classList.toggle('on', !!state[k]);
    b.setAttribute('aria-pressed', String(!!state[k]));
  });
    if (caughtToggle) {
      caughtToggle.textContent = hideCaught ? 'Show all species' : 'Show not caught';
      caughtToggle.title = hideCaught
        ? 'Currently hiding everything you have already caught'
        : 'Only show the species you have not caught yet';
    }

    /* every active filter gets a removable chip, so nothing is a hidden state */
    var active = [];
    if (state.q) active.push(chip('q', 'search: ' + state.q));
    if (state.gen) active.push(chip('gen', 'Gen ' + state.gen));
    if (state.type) active.push(chip('type', typeLabel(state.type)));
    if (state.legend) active.push(chip('legend', 'Legendary'));
    if (state.mega) active.push(chip('mega', 'Has Mega form'));
    if (state.z) active.push(chip('z', 'Has Z form'));
    if (state.sort !== 'id' || state.desc) {
      active.push(chip('sort', 'sorted by ' + sortMeta(state.sort)[0].toLowerCase() +
        (state.desc ? ' \u2193' : ' \u2191')));
    }
    if (state.hide) active.push(chip('hide', 'uncaught only'));
    chips.textContent = '';
    active.forEach(function (b) { chips.appendChild(b); });

    var sig = [state.q, state.gen, state.type, state.legend, state.mega, state.z,
      state.sort, state.desc, state.hide,
      Object.keys(caught).length, Object.keys(formCaught).length].join('|');
    if (sig === lastSig) return;
    lastSig = sig;

    var frag = document.createDocumentFragment();
    for (var i = 0; i < res.length; i++) frag.appendChild(card(res[i], i));
    grid.textContent = '';
    grid.appendChild(frag);
  }

  var TYPE_LABEL = data.chart ? data.chart.spanish : null;
  function typeLabel(t) {
    if (TYPE_LABEL && TYPE_LABEL[t]) return TYPE_LABEL[t];
    return String(t).charAt(0).toUpperCase() + String(t).slice(1);
  }

  function chip(key, label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'rounded-full border border-ink-200 bg-white px-2 py-0.5 font-sans text-[11px] text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800';
    b.textContent = label + ' \u00d7';
    b.addEventListener('click', function () {
      if (key === 'q') { q.value = ''; state.q = ''; }
      else if (key === 'gen') { gen.value = ''; state.gen = ''; }
      else if (key === 'type') { type.value = ''; state.type = ''; }
      else if (key === 'legend') { state.legend = false; }
      else if (key === 'mega') { state.mega = false; }
      else if (key === 'z') { state.z = false; }
      else if (key === 'sort') { sort.value = 'id'; state.sort = 'id'; state.desc = false; }
      else if (key === 'hide') { hideCaught = false; save(K_HIDE, false); paintCaught(); state.hide = false; }
      lastSig = '';
      apply();
    });
    return b;
  }

  /* delegated so it survives re-renders */
  grid.addEventListener('click', function (e) {
    var fbtn = e.target.closest('[data-form]');
    if (fbtn) {
      e.preventDefault();
      e.stopPropagation();
      var raw = fbtn.getAttribute('data-form').split('\u0001');
      toggleForm(raw[0], raw[1]);
      var nowOn = isFormCaught(raw[0], raw[1]);
      fbtn.setAttribute('aria-pressed', String(nowOn));
      /* A ticked form used to fill with bg-kalos-100 / dark:bg-kalos-950. In
         dark mode that is nearly the same value as the card behind it, so a
         caught Mega or Z form was almost invisible. Fill with the ember tone
         the caught marker uses instead. */
      var ON = ['border-ember-500', 'bg-ember-500', 'text-white'];
      /* Rebuild the pill's class list from scratch rather than patching the
         old one. Filtering had two bugs: it stripped text-[9px] along with the
         colours (the tag ballooned to the inherited 16px), and it removed the
         kind's tone without ever putting it back, so an unticked tag came
         back colourless. Rebuilding is idempotent, so repeated toggles cannot
         drift. */
      var kind = fbtn.getAttribute('data-kind') || 'other';
      fbtn.className = formPillClass(kind, nowOn);
      paintCaught();
      return;
    }
    var btn = e.target.closest('[data-catch]');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      toggleCaught(btn.getAttribute('data-catch'));
      return;
    }
    var cardEl = e.target.closest('a[data-name]');
    if (cardEl) {
      e.preventDefault();
      /* Promote just this one so the sheet paints at once, whatever the
         browser was doing with the other 1024. */
      var art = cardEl.querySelector('img');
      if (art) {
        art.loading = 'eager';
        art.fetchPriority = 'high';
        if (!art.complete) {
          var dup = new Image();
          dup.fetchPriority = 'high';
          dup.src = art.src;
        }
      }
      var name = cardEl.getAttribute('data-name');
      var p = null;
      for (var i = 0; i < dex.length; i++) if (dex[i].name === name) { p = dex[i]; break; }
      if (p) openSheet(p);
    }
  });

  q.addEventListener('input', pz.debounce(function () { state.q = q.value; apply(); }, 140));
  gen.addEventListener('change', function () { state.gen = gen.value; lastSig = ''; apply(); });
  type.addEventListener('change', function () { state.type = type.value; lastSig = ''; apply(); });
  Object.keys(chipBtns).forEach(function (k) {
    chipBtns[k].addEventListener('click', function () {
      if (k === 'hide') {
        hideCaught = !hideCaught;
        save(K_HIDE, hideCaught);
        paintCaught();
        state.hide = hideCaught;
      } else {
        state[k] = !state[k];
      }
      lastSig = '';
      apply();
    });
  });
  sort.addEventListener('change', function () {
    state.sort = sort.value;
    state.desc = sortMeta(state.sort)[2];
    lastSig = '';
    apply();
  });
  dirBtn.addEventListener('click', function () { state.desc = !state.desc; lastSig = ''; apply(); });

  reset.addEventListener('click', function () {
    q.value = ''; gen.value = ''; type.value = ''; sort.value = 'id';
    state = { q: '', gen: '', type: '', legend: false, mega: false, z: false,
              sort: 'id', desc: false };
    hideCaught = false;
    save(K_HIDE, false);
    paintCaught();
    lastSig = '';
    apply();
  });
  var er = document.getElementById('dex-empty-reset');
  if (er) er.addEventListener('click', function () { reset.click(); });

  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); q.focus(); }
  });

  /* deep link: dex.html?q=greninja */
  try {
    var params = new URLSearchParams(location.search);
    var q0 = params.get('q');
    if (q0) { q.value = q0; state.q = q0; }
    var t0 = params.get('type');
    if (t0 && TYPES.indexOf(t0) >= 0) { type.value = t0; state.type = t0; }
    var s0 = params.get('sort');
    if (s0) { sort.value = s0; state.sort = s0; state.desc = sortMeta(s0)[2]; }
  } catch (e) {}

  paintCaught();
  paintBadges();
  apply();
})();