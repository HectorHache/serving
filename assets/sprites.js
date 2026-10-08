/* Boss Roster gallery: filter by identification status, search, counters, open a detail dialog. */
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
  var currentRes = [];

  var TYPES = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
  var SPANISH = {"normal": "Normal", "fire": "Fuego", "water": "Agua", "electric": "El\u00e9ctrico", "grass": "Planta", "ice": "Hielo", "fighting": "Lucha", "poison": "Veneno", "ground": "Tierra", "flying": "Volador", "psychic": "Ps\u00edquico", "bug": "Bicho", "rock": "Roca", "ghost": "Fantasma", "dragon": "Drag\u00f3n", "dark": "Siniestro", "steel": "Acero", "fairy": "Hada"};
  var CHART = [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0, 1, 1, 0.5, 1], [1, 0.5, 0.5, 1, 2, 2, 2, 1, 1, 2, 1, 2, 0.5, 1, 1, 1, 2, 1], [1, 2, 0.5, 1, 0.5, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1], [1, 1, 2, 0.5, 0.5, 1, 1, 1, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1], [1, 0.5, 2, 1, 0.5, 0.5, 1, 0.5, 2, 0.5, 1, 0.5, 2, 1, 1, 1, 1, 1], [1, 0.5, 0.5, 2, 2, 0.5, 1, 1, 2, 2, 1, 1, 1, 1, 2, 1, 1, 1], [2, 1, 1, 1, 0.5, 2, 1, 0.5, 1, 0.5, 0.5, 0.5, 2, 0, 1, 2, 2, 0.5], [1, 1, 2, 1, 2, 1, 1, 0.5, 0.5, 1, 1, 1, 1, 0.5, 1, 1, 1, 2], [1, 2, 2, 2, 0.5, 1, 2, 1, 1, 0, 1, 0.5, 2, 1, 1, 1, 2, 1], [1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 0.5, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 0.5, 1, 1, 1, 1, 1, 0.5, 1], [1, 0.5, 2, 1, 2, 0.5, 0.5, 0.5, 2, 0.5, 2, 1, 0.5, 0.5, 1, 2, 1, 0.5], [1, 2, 0.5, 1, 1, 2, 0.5, 2, 0.5, 2, 1, 2, 1, 1, 1, 1, 0.5, 2], [0.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 0.5, 0.5, 1], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 0], [1, 1, 1, 1, 0.5, 1, 0.5, 0.5, 1, 2, 2, 0.5, 1, 2, 1, 2, 1, 0.5], [1, 0.5, 0.5, 0.5, 1, 2, 1, 0, 1, 1, 1, 1, 2, 0.5, 1, 1, 0.5, 2], [1, 0.5, 0.5, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 1]];
  var TYPE_IDX = {"normal": 0, "fire": 1, "water": 2, "electric": 3, "grass": 4, "ice": 5, "fighting": 6, "poison": 7, "ground": 8, "flying": 9, "psychic": 10, "bug": 11, "rock": 12, "ghost": 13, "dragon": 14, "dark": 15, "steel": 16, "fairy": 17};
  var SPECIES_TYPES = {"croagunk": ["poison", "fighting"], "baltoy": ["ground", "psychic"], "kricketune-z": ["bug", "fighting"], "bronzor": ["steel", "psychic"], "wobbuffet": ["psychic"], "chansey": ["normal"], "lileep": ["rock", "grass"], "kadabra": ["psychic"], "simisear": ["fire"], "machoke": ["fighting"], "cacturne": ["grass", "dark"], "beldum": ["steel", "psychic"], "cofagrigus-z": ["ghost", "ground"], "bronzong": ["steel", "psychic"], "noivern": ["flying", "dragon"], "cloyster": ["water", "ice"], "electivire": ["electric"], "aggron": ["steel", "rock"], "girafarig": ["normal", "psychic"], "skeledirge": ["fire", "ghost"], "scizor": ["bug", "steel"], "steelix": ["steel", "ground"], "meditite": ["fighting", "psychic"], "haunter": ["ghost", "poison"], "audino": ["normal"], "garchomp": ["dragon", "ground"], "gardevoir": ["psychic", "fairy"], "sableye": ["dark", "ghost"], "delphox-z": ["fire", "psychic"], "entei": ["fire"], "blissey": ["normal"], "alomomola": ["water"], "miltank": ["normal"], "lickitung": ["normal"], "snorlax": ["normal"], "lillipup": ["normal"], "nihilego": ["rock", "poison"], "lucario": ["fighting", "steel"], "greninja-z": ["water", "dark"], "honchkrow": ["dark", "flying"], "dragapult": ["dragon", "ghost"], "kingler": ["water"], "meowscarada": ["grass", "dark"], "serperior": ["grass"], "flareon": ["fire"], "machamp": ["fighting"], "braviary": ["normal", "flying"], "mienshao": ["fighting"], "absol": ["dark"], "toesdoler": ["bug", "steel"], "milotic": ["water"], "gengar": ["ghost", "poison"], "iron-moth": ["fire", "poison"], "hydreigon": ["dark", "dragon"], "jolteon": ["electric"], "frillish": ["water", "ghost"], "turtonator": ["fire", "dragon"], "sylveon": ["fairy"], "toxapex": ["poison", "water"], "bastiodon": ["rock", "steel"], "gliscor": ["ground", "flying"], "sceptile": ["grass"], "reshiram": ["dragon", "fire"], "corviknight": ["flying", "steel"], "aegislash": ["steel", "ghost"], "zoroark": ["dark"], "ninetales": ["fire"], "alakazam": ["psychic"], "venusaur": ["grass", "poison"], "metagross": ["steel", "psychic"], "bouffalant": ["normal"], "yveltal": ["dark", "flying"], "kyogre": ["water"], "volcarona": ["bug", "fire"], "gible": ["dragon", "ground"], "mr-mime": ["psychic", "fairy"], "empoleon": ["water", "steel"], "victini": ["psychic", "fire"], "chandelure": ["ghost", "fire"], "dondozo": ["water"], "xerneas": ["fairy"], "starmie": ["water", "psychic"], "gothitelle": ["psychic"], "rayquaza": ["dragon", "flying"], "cobalion": ["steel", "fighting"], "beheeyem": ["psychic"], "lunala": ["psychic", "ghost"], "tsareena": ["grass"], "slowpoke": ["water", "psychic"], "suicune": ["water"], "gholdengo": ["steel", "ghost"], "zarude": ["dark", "grass"], "ogerpon": ["grass"], "arcanine": ["fire"], "lampent": ["ghost", "fire"], "mamoswine": ["ice", "ground"], "decidueye": ["grass", "ghost"], "zapdos": ["electric", "flying"], "glimmora": ["rock", "poison"], "skarmory": ["steel", "flying"], "venomoth": ["bug", "poison"], "persian": ["normal"], "lapras": ["water", "ice"], "arceus": ["normal"], "blaziken": ["fire", "fighting"], "blastoise": ["water"], "virizion": ["grass", "fighting"], "garganacl": ["rock"], "azumarill": ["water", "fairy"], "vikavolt": ["bug", "electric"], "zygarde": ["dragon", "ground"], "flygon": ["ground", "dragon"], "salamence": ["dragon", "flying"], "talonflame": ["fire", "flying"], "raikou": ["electric"], "klefki": ["steel", "fairy"], "umbreon": ["dark"], "ampharos": ["electric"], "hatterene": ["psychic", "fairy"], "gigalith": ["rock"], "feraligatr": ["water"], "latios": ["dragon", "psychic"], "magnezone": ["electric", "steel"], "ho-oh": ["fire", "flying"], "annihilape": ["fighting", "ghost"], "pikachu-z": ["electric", "poison"], "crobat": ["poison", "flying"], "ameonguss": ["grass", "poison"], "regieleki": ["electric"], "urshifu": ["fighting", "dark"], "torterra": ["grass", "ground"], "bellossom": ["grass"], "roserade": ["grass", "poison"], "sawsbuck": ["normal", "grass"], "ninjask": ["bug", "flying"], "ditto": ["normal"], "pikachu": ["electric"], "lugia": ["psychic", "flying"], "necrozma": ["psychic"], "cefireon": ["flying"], "latias": ["dragon", "psychic"], "braixen-z": ["fire", "poison"]};

  /* Update filter button labels with exact counts */
  var nAll = cards.length;
  var nIdentified = cards.filter(function (c) { return !c.unk; }).length;
  var nUnknown = nAll - nIdentified;
  var filterLabels = {
    'all': 'All (' + nAll + ')',
    'identified': 'Identified (' + nIdentified + ')',
    'unknown': 'Unknown (' + nUnknown + ')'
  };
  Array.prototype.forEach.call(document.querySelectorAll('.sp-filter'), function (b) {
    var fKey = b.getAttribute('data-sp-filter');
    if (filterLabels[fKey]) b.textContent = filterLabels[fKey];
  });

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function typeLabel(t) {
    return SPANISH[t] || t;
  }

  function typePill(t, extra) {
    var label = esc(typeLabel(t)) + (extra ? ' ' + extra : '');
    return '<span class="t-' + t + ' inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold leading-none">' + label + '</span>';
  }

  function getTypesFor(spName) {
    if (!spName) return [];
    var key = spName.toLowerCase().trim();
    return SPECIES_TYPES[key] || [];
  }

  function getCounters(typesList) {
    if (!typesList || !typesList.length) return [];
    var weaknesses = [];
    var i1 = TYPE_IDX[typesList[0]];
    var i2 = (typesList.length > 1) ? TYPE_IDX[typesList[1]] : null;
    if (i1 == null) return [];

    TYPES.forEach(function (atk, aIdx) {
      var m1 = CHART[aIdx][i1];
      var m2 = (i2 != null) ? CHART[aIdx][i2] : 1;
      var total = m1 * m2;
      if (total >= 2) {
        weaknesses.push({ type: atk, mult: total });
      }
    });
    weaknesses.sort(function (a, b) { return b.mult - a.mult; });
    return weaknesses;
  }

  function chipFor(sp) {
    if (!sp.unk) return '<span class="type-chip bg-ink-600">identified</span>';
    if (sp.alt) return '<span class="type-chip bg-ember-600">competing</span>';
    return '<span class="type-chip bg-ink-400">open</span>';
  }

  function card(c, idx) {
    var a = document.createElement('button');
    a.type = 'button';
    a.className = 'sp-card flex flex-col items-center rounded-xl border border-ink-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-kalos-400 hover:shadow-md dark:border-ink-800 dark:bg-ink-900 dark:hover:border-kalos-600';
    
    var spTypes = getTypesFor(c.sp);
    var counters = getCounters(spTypes);

    var typesHtml = spTypes.length
      ? '<div class="mt-1.5 flex flex-wrap justify-center gap-1">' + spTypes.map(function (t) { return typePill(t); }).join('') + '</div>'
      : '';

    var countersHtml = counters.length
      ? '<div class="mt-2 flex flex-col items-center gap-1 border-t border-ink-100 pt-1.5 dark:border-ink-800 w-full">' +
          '<span class="font-sans text-[9px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Counters</span>' +
          '<div class="flex flex-wrap justify-center gap-1">' +
            counters.slice(0, 4).map(function (w) {
              var multTag = w.mult === 4 ? '4×' : '';
              return typePill(w.type, multTag);
            }).join('') +
          '</div>' +
        '</div>'
      : '';

    a.innerHTML =
      '<img src="' + c.img + '" alt="Boss sprite on guide page ' + c.p + '" loading="lazy" decoding="async" ' +
      'class="h-20 w-20 object-contain">' +
      '<div class="mt-2 w-full truncate text-center font-sans text-xs font-semibold text-ink-900 dark:text-white">' +
      (c.unk ? '<span class="text-ink-400 dark:text-ink-500">UNKNOWN</span>' : c.sp) + '</div>' +
      '<div class="mt-0.5 font-mono text-[10px] text-ink-400 dark:text-ink-500">L' + (c.lvl || '?') + ' &middot; p' + c.p + '</div>' +
      '<div class="mt-1.5">' + chipFor(c) + '</div>' +
      typesHtml +
      countersHtml;

    a.addEventListener('click', function () { detail(c, idx); });
    return a;
  }

  function detail(c, idx) {
    var d = document.createElement('dialog');
    d.className = 'm-auto w-[min(32rem,92vw)] rounded-2xl border border-ink-200 bg-white p-0 text-ink-900 shadow-2xl backdrop:bg-ink-950/60 backdrop:backdrop-blur-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100';

    var spTypes = getTypesFor(c.sp);
    var counters = getCounters(spTypes);

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

    var hasPrev = (idx > 0);
    var hasNext = (idx < currentRes.length - 1);
    var posLabel = (idx + 1) + ' of ' + currentRes.length;

    var typesPills = spTypes.length
      ? '<div class="flex flex-wrap gap-1 mt-1">' + spTypes.map(function (t) { return typePill(t); }).join('') + '</div>'
      : '<span class="text-ink-400">Unknown</span>';

    var countersPills = counters.length
      ? '<div class="flex flex-wrap gap-1 mt-1">' + counters.map(function (w) {
          return typePill(w.type, w.mult + '×');
        }).join('') + '</div>'
      : '<span class="text-ink-400">None</span>';

    var html = '<div class="flex items-center justify-between border-b border-ink-200 px-4 py-3 dark:border-ink-700">' +
      '<div>' +
        '<h2 class="font-sans text-sm font-semibold">Boss roster entry, guide page ' + c.p + '</h2>' +
        '<span class="font-mono text-[11px] text-ink-400">' + posLabel + '</span>' +
      '</div>' +
      '<button type="button" data-close class="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="Close">' +
      '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="flex flex-col items-center gap-3 px-4 py-5">' +
      '<img src="' + c.img + '" alt="Boss sprite" class="h-32 w-32 object-contain">' +
      '<div>' + chipFor(c) + '</div></div>' +
      '<dl class="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 border-t border-ink-200 px-4 py-4 font-sans text-sm dark:border-ink-700">' +
      '<dt class="font-semibold text-ink-500 dark:text-ink-400">Types</dt>' +
      '<dd class="min-w-0">' + typesPills + '</dd>' +
      '<dt class="font-semibold text-rose-600 dark:text-rose-400">Counters</dt>' +
      '<dd class="min-w-0">' + countersPills + '</dd>';

    rows.forEach(function (r) {
      if (!r[1]) return;
      html += '<dt class="font-semibold text-ink-500 dark:text-ink-400">' + r[0] + '</dt>' +
        '<dd class="min-w-0 break-words text-ink-900 dark:text-ink-100">' + String(r[1]).replace(/</g, '&lt;') + '</dd>';
    });
    html += '</dl>';

    /* Prev / Next navigation footer */
    html += '<div class="flex items-center justify-between border-t border-ink-200 px-4 py-3 dark:border-ink-700">' +
      '<button type="button" id="sp-prev" class="rounded-lg border border-ink-200 px-3 py-1.5 font-sans text-xs font-semibold ' +
        (hasPrev ? 'text-ink-700 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800' : 'cursor-not-allowed opacity-30 text-ink-400') + '" ' +
        (hasPrev ? '' : 'disabled') + '>&larr; Previous</button>' +
      '<span class="font-sans text-xs text-ink-400">Use &larr; &rarr; keys</span>' +
      '<button type="button" id="sp-next" class="rounded-lg border border-ink-200 px-3 py-1.5 font-sans text-xs font-semibold ' +
        (hasNext ? 'text-ink-700 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800' : 'cursor-not-allowed opacity-30 text-ink-400') + '" ' +
        (hasNext ? '' : 'disabled') + '>Next &rarr;</button>' +
      '</div>';

    d.innerHTML = html;
    document.body.appendChild(d);

    function cleanup() {
      document.removeEventListener('keydown', onKey);
      d.remove();
    }

    function onKey(e) {
      if (e.key === 'ArrowLeft' && hasPrev) {
        cleanup();
        detail(currentRes[idx - 1], idx - 1);
      } else if (e.key === 'ArrowRight' && hasNext) {
        cleanup();
        detail(currentRes[idx + 1], idx + 1);
      } else if (e.key === 'Escape') {
        cleanup();
      }
    }
    document.addEventListener('keydown', onKey);

    var prevBtn = d.querySelector('#sp-prev');
    var nextBtn = d.querySelector('#sp-next');
    if (prevBtn && hasPrev) {
      prevBtn.addEventListener('click', function () {
        cleanup();
        detail(currentRes[idx - 1], idx - 1);
      });
    }
    if (nextBtn && hasNext) {
      nextBtn.addEventListener('click', function () {
        cleanup();
        detail(currentRes[idx + 1], idx + 1);
      });
    }

    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-close]')) cleanup();
    });
    d.showModal();
  }

  function apply() {
    var terms = query_().toLowerCase().split(/\s+/).filter(Boolean);
    var res = cards.filter(function (c) {
      if (filter === 'identified' && c.unk) return false;
      if (filter === 'unknown' && !c.unk) return false;
      if (!terms.length) return true;
      var spTypes = (getTypesFor(c.sp) || []).map(typeLabel).join(' ');
      var hay = [c.sp, c.alt, c.lvl, c.item, c.ab, c.nat, c.mv, c.p, c.conf, spTypes].join(' ').toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) >= 0; });
    });
    currentRes = res;
    count.textContent = res.length.toLocaleString() + ' of ' + cards.length.toLocaleString() + ' entries';
    var frag = document.createDocumentFragment();
    for (var i = 0; i < res.length; i++) frag.appendChild(card(res[i], i));
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
