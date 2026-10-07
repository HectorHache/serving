/* Playthrough guide: renders the parsed 559-page walkthrough in play order.
   Sorting, filtering and paging all run off one in-memory step list so the page
   stays usable across 419 steps. */
(function () {
  'use strict';
  var pz = window.pz;
  var data = pz.readData();
  var list = document.getElementById('g-list');
  if (!data || !list) return;
  var steps = data.steps || [];
  var medals = data.medals || [];

  var q = document.getElementById('gq');
  var kind = document.getElementById('gkind');
  var itemsOnly = document.getElementById('gitems');
  var encOnly = document.getElementById('gencre');
  var reset = document.getElementById('greset');
  var count = document.getElementById('gcount');
  var chips = document.getElementById('gchips');
  var medalsBox = document.getElementById('gmedals');
  var empty = document.getElementById('g-empty');
  var more = document.getElementById('g-more');

  /* The guide hides its jump targets under two stacked sticky bars (the site
     header plus the filter toolbar), and the toolbar wraps taller as the
     window narrows. A fixed scroll-margin cannot cover that, so measure the
     live pair and publish it as --guide-stack, which the CSS feeds into
     scroll-margin-top. Re-measure on resize, because wrapping changes. */
  function measureStack() {
    /* Measure each bar's own sticky offset plus its height. Reading the
       current bottom instead only saw the header, because at scroll 0 the
       toolbar still sits in flow far down the page and never looks pinned. */
    var st = document.querySelectorAll('.sticky');
    var b = 0;
    for (var i = 0; i < st.length; i++) {
      var cs = getComputedStyle(st[i]);
      var off = parseFloat(cs.top) || 0;
      var h = st[i].getBoundingClientRect().height;
      if (off + h > b) b = off + h;
    }
    document.documentElement.style.setProperty('--guide-stack', Math.round(b) + 'px');
  }
  measureStack();
  window.addEventListener('resize', pz.debounce(measureStack, 150));
  window.addEventListener('load', measureStack);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureStack);

  var PAGE = 60;
  var shown = PAGE;
  var filtered = steps;
  var CHUNK = 2;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function dexLink(name, slug) {
    if (!slug) return esc(name);
    return '<a href="dex.html?q=' + encodeURIComponent(slug) + '" class="font-medium text-kalos-700 underline-offset-2 hover:underline dark:text-kalos-300">' + esc(name) + '</a>';
  }

  function section(title, body, cls) {
    if (!body) return '';
    return '<div class="mt-3"><h4 class="font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">' + title + '</h4>' + body + '</div>';
  }

  function encTable(rows, showZone) {
    if (!rows.length) return '';
    var zoneSet = rows.some(function (r) { return r.zone != null; });
    var h = '<div class="table-shell not-prose mt-2" role="region" tabindex="0"><table class="doc-table">' +
      '<thead><tr><th>Species</th><th>Rate</th>' + (showZone && zoneSet ? '<th>Zone</th>' : '') +
      '<th>Drops</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr><td>' + dexLink(r.species, r.dex) + '</td><td class="font-mono text-xs tabular-nums">' +
        (r.pct != null ? r.pct + '%' : '&#8212;') + '</td>' +
        (showZone && zoneSet ? '<td>' + (r.zone != null ? r.zone : '&#8212;') + '</td>' : '') +
        '<td>' + (r.drop ? esc(r.drop) : '<span class="text-ink-400">none</span>') +
          (r.rare ? '<div class="mt-0.5 text-[11px] text-ink-400">rarely ' + esc(r.rare) + '</div>' : '') +
        '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  function itemList(rows) {
    if (!rows.length) return '';
    var h = '<ul class="mt-2 space-y-1.5 font-sans text-sm">';
    rows.forEach(function (it) {
      h += '<li class="flex flex-wrap gap-x-2"><span class="font-semibold text-ink-800 dark:text-ink-100">' +
        esc(it.item) + (it.qty ? ' <span class="text-ink-400">(' + esc(it.qty) + ')</span>' : '') +
        '</span><span class="text-ink-500 dark:text-ink-400">&#8212; ' + esc(it.where) + '</span></li>';
    });
    return h + '</ul>';
  }

  function bossList(rows) {
    if (!rows || !rows.length) return '';
    var h = '<div class="mt-2 grid gap-2 sm:grid-cols-2">';
    rows.forEach(function (b) {
      /* the sheet records "sprites/s0001_p29.png"; from site/guide.html that
         resolves to /sprites/... which does not exist, so every battle sprite
         404d once the artwork moved under assets/ */
      var art = b.sprite
        ? '<img src="assets/' + esc(b.sprite).replace(/^assets\//, '') + '" alt="" loading="lazy" decoding="async" width="56" height="56" class="h-14 w-14 shrink-0 rounded-md bg-white/90 object-contain dark:bg-ink-800">'
        : '<span class="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-ink-200 text-[9px] text-ink-500 dark:bg-ink-800 dark:text-ink-400">no art</span>';
      var meta = [];
      if (b.level) meta.push('Lv ' + esc(b.level));
      if (b.item) meta.push('holds ' + esc(b.item));
      if (b.ability) meta.push(esc(b.ability));
      if (b.nature && b.nature !== 'NEUTRA') meta.push(esc(b.nature));
      h += '<div class="flex gap-2.5 rounded-lg border border-ink-200 p-2 dark:border-ink-800">' + art +
        '<div class="min-w-0 text-xs">' +
        '<div class="font-sans text-sm font-semibold">' +
          (b.dex ? dexLink(b.species, b.dex) : esc(b.species || 'Unknown')) + '</div>' +
        (meta.length ? '<div class="mt-0.5 text-ink-500 dark:text-ink-400">' + meta.join(' &#183; ') + '</div>' : '') +
        (b.moves ? '<div class="mt-0.5 text-ink-400 dark:text-ink-500">' + esc(b.moves) + '</div>' : '') +
        (b.alt ? '<div class="mt-0.5 text-ink-400">alt read: ' + esc(b.alt) + '</div>' : '') +
        '</div></div>';
    });
    return h + '</div>';
  }

  function trainerList(rows) {
    if (!rows.length) return '';
    var h = '<ul class="mt-2 space-y-1 font-sans text-sm">';
    rows.forEach(function (t) {
      var m = t.members.map(function (x) {
        return dexLink(x.species, x.dex) + ' <span class="font-mono text-xs text-ink-400">Lv' + x.level + '</span>';
      }).join(', ');
      h += '<li><span class="font-semibold text-ink-700 dark:text-ink-200">' + esc(t.name) + '</span> &#8212; ' + m + '</li>';
    });
    return h + '</ul>';
  }

  function card(st, i) {
    var badge = '';
    if (st.medals && st.medals.length) {
      badge = '<span class="rounded-full bg-ember-500 px-2.5 py-0.5 font-sans text-[11px] font-bold uppercase tracking-wide text-white">Medal ' +
        st.medals.join(', ') + '</span>';
    } else if (st.bosses && st.bosses.length) {
      badge = '<span class="rounded-full bg-kalos-100 px-2.5 py-0.5 font-sans text-[11px] font-semibold text-kalos-800 dark:bg-kalos-950 dark:text-kalos-200">Battle</span>';
    } else if (st.wild.length || st.fish.length) {
      badge = '<span class="rounded-full bg-ink-100 px-2.5 py-0.5 font-sans text-[11px] font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">Encounters</span>';
    }

    var advice = '';
    if (st.advice && st.advice.length) {
      advice = '<div class="mt-2 rounded-lg border-l-4 border-ember-400 bg-ember-50 p-3 font-sans text-sm text-ink-700 dark:bg-ember-950/40 dark:text-ink-200">' +
        '<span class="font-bold">Battle advice from the guide: </span>' + esc(st.advice.join(' ')) + '</div>';
    } else if (st.battles && st.battles.length) {
      var allAdv = [];
      st.battles.forEach(function (b) { if (b.advice && b.advice.length) allAdv.push.apply(allAdv, b.advice); });
      if (allAdv.length) {
        advice = '<div class="mt-2 rounded-lg border-l-4 border-ember-400 bg-ember-50 p-3 font-sans text-sm text-ink-700 dark:bg-ember-950/40 dark:text-ink-200">' +
          '<span class="font-bold">Battle advice from the guide: </span>' + esc(allAdv.join(' ')) + '</div>';
      }
    }

    var band = st.trainerBand
      ? '<span class="font-sans text-[11px] text-ink-500 dark:text-ink-400">trainers Lv ' + st.trainerBand.lo + '&#8211;' + st.trainerBand.hi + '</span>'
      : '';

    var prose = '';
    if (st.prose && st.prose[0]) {
      prose = '<details class="mt-3"><summary class="cursor-pointer font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">Original guide text</summary>' +
        '<div class="mt-1.5 rounded-lg bg-ink-50 p-3 font-serif text-sm leading-relaxed text-ink-600 dark:bg-ink-900 dark:text-ink-300">' +
        esc(st.prose[0].slice(0, 1400)) + (st.prose[0].length > 1400 ? '&#8230;' : '') + '</div></details>';
    }

    return '<article class="deferred rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900" id="step-' + st.page + '">' +
      '<div class="flex flex-wrap items-center gap-2">' +
        '<span class="font-mono text-xs text-ink-400">p' + st.page + '</span>' +
        '<h3 class="font-sans text-base font-bold">' + esc(st.location || 'Unnamed') + '</h3>' + badge + band +
        '<span class="ml-auto font-sans text-[11px] text-ink-400">' + (st.available || 0) + ' species available by here</span>' +
      '</div>' +
      advice +
      section('Wild encounters', encTable(st.wild, true)) +
      section('Fishing', encTable(st.fish, true)) +
      section('Items', itemList(st.items)) +
      section('Trainers', trainerList(st.trainers)) +
      section('Boss roster', bossList(st.bosses) +
        (st.roster_pages
          ? '<p class="mt-2 font-sans text-[11px] text-ink-500">Listed on ' +
            st.roster_pages.map(function (n) { return 'p' + n; }).join(' and ') +
            ', a couple of pages after this gate.</p>'
          : '')) +
      (st.tips && st.tips.length
        ? section('Tips', '<ul class="mt-2 list-disc space-y-1 pl-5 font-sans text-sm text-ink-600 dark:text-ink-300">' +
            st.tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>')
        : '') +
      (st.new && st.new.length
        ? section('New here', '<p class="mt-2 font-sans text-xs text-ink-500 dark:text-ink-400">First catchable at this point: ' +
            st.new.slice(0, 14).map(function (n) { return dexLink(n.replace(/-/g, ' '), n); }).join(', ') +
            (st.new.length > 14 ? ' and ' + (st.new.length - 14) + ' more' : '') + '</p>')
        : '') +
      prose +
    '</article>';
  }

  function haystack(st) {
    if (st._h) return st._h;
    var parts = [st.location || '', String(st.page)];
    (st.wild || []).forEach(function (w) { parts.push(w.species, w.drop || '', w.rare || ''); });
    (st.fish || []).forEach(function (w) { parts.push(w.species, w.drop || '', w.rare || ''); });
    (st.items || []).forEach(function (i) { parts.push(i.item, i.where); });
    (st.trainers || []).forEach(function (t) {
      parts.push(t.name);
      t.members.forEach(function (m) { parts.push(m.species); });
    });
    (st.bosses || []).forEach(function (b) { parts.push(b.species, b.ability, b.moves, b.item); });
    (st.battles || []).forEach(function (b) { parts.push(b.title); });
    if (st.prose && st.prose[0]) parts.push(st.prose[0].slice(0, 600));
    st._h = parts.join(' ').toLowerCase();
    return st._h;
  }

  function apply() {
    var terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    filtered = steps.filter(function (st) {
      if (kind.value === 'medal' && !(st.medals && st.medals.length)) return false;
      if (kind.value === 'battle' && !((st.bosses && st.bosses.length) || (st.battles && st.battles.length))) return false;
      if (kind.value === 'route' && !(st.wild.length || st.fish.length)) return false;
      if (itemsOnly.checked && !(st.items && st.items.length)) return false;
      if (encOnly.checked && !(st.wild.length || st.fish.length)) return false;
      if (!terms.length) return true;
      var h = haystack(st);
      return terms.every(function (t) { return h.indexOf(t) >= 0; });
    });
    count.textContent = filtered.length.toLocaleString() + ' of ' + steps.length.toLocaleString() + ' steps';
    empty.classList.toggle('hidden', filtered.length > 0);
    more.classList.toggle('hidden', filtered.length <= PAGE);
    shown = PAGE;
    render();
    paintChips();
  }

  function render() {
    var frag = document.createDocumentFragment();
    var slice = filtered.slice(0, shown);
    var wrap = document.createElement('div');
    wrap.className = 'contents';
    slice.forEach(function (st) {
      var d = document.createElement('div');
      d.innerHTML = card(st);
      frag.appendChild(d.firstElementChild);
    });
    list.textContent = '';
    list.appendChild(frag);
  }

  function chip(key, label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'rounded-full border border-ink-200 bg-white px-2 py-0.5 font-sans text-[11px] text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800';
    b.textContent = label + ' \u00d7';
    b.addEventListener('click', function () {
      if (key === 'q') { q.value = ''; }
      else if (key === 'kind') { kind.value = ''; }
      else if (key === 'items') { itemsOnly.checked = false; }
      else { encOnly.checked = false; }
      apply();
    });
    return b;
  }

  function paintChips() {
    chips.textContent = '';
    if (q.value) chips.appendChild(chip('q', 'search: ' + q.value));
    if (kind.value) chips.appendChild(chip('kind', 'kind: ' + kind.options[kind.selectedIndex].text));
    if (itemsOnly.checked) chips.appendChild(chip('items', 'has items'));
    if (encOnly.checked) chips.appendChild(chip('enc', 'has encounters'));
  }

  /* medal shortcuts jump straight to the gate */
  medalsBox.textContent = '';
  medals.forEach(function (m) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'rounded-full border border-ink-200 bg-white px-2.5 py-0.5 font-sans text-[11px] font-semibold text-ink-700 hover:border-ember-400 hover:bg-ember-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:bg-ember-950';
    b.textContent = m.medal + ' \u00b7 ' + m.title;
    b.addEventListener('click', function () {
      var target = document.getElementById('step-' + m.page);
      if (target) { target.scrollIntoView({ block: 'start' }); }
    });
    medalsBox.appendChild(b);
  });

  q.addEventListener('input', pz.debounce(apply, 160));
  kind.addEventListener('change', apply);
  itemsOnly.addEventListener('change', apply);
  encOnly.addEventListener('change', apply);
  reset.addEventListener('click', function () {
    q.value = ''; kind.value = ''; itemsOnly.checked = false; encOnly.checked = false;
    apply();
  });
  more.addEventListener('click', function () {
    shown += PAGE * CHUNK;
    render();
    if (filtered.length <= shown) more.classList.add('hidden');
  });

  apply();
})();