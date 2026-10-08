/* Type matchups matrix and dual-type defense calculator.
 *
 * The grid is rendered once and never reordered. Choosing a type only toggles
 * emphasis classes, so a cell keeps its position for the whole session and the
 * user builds a mental map instead of re-learning it every click.
 */
(function () {
  'use strict';

  var D = JSON.parse(document.getElementById('pz-data').textContent.replace(/<\//g, '</'));
  var TYPES = D.types, SPAN = D.spanish, ROWS = D.chart, COUNTS = D.counts;
  var N = TYPES.length;
  var idx = {};
  TYPES.forEach(function (t, i) { idx[t] = i; });

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function label(t) { return SPAN[t] || t; }
  function band(v) { return v === 2 ? '2' : v === 0.5 ? '05' : v === 0 ? '0' : '1'; }

  /* ---- build the table -------------------------------------------------- */
  var table = document.getElementById('t-matrix');
  var html = ['<thead><tr>',
    '<th class="tm-corner"><span class="tm-axes">' +
      '<span>Defending →</span><span>Attacking ↓</span></span></th>'];

  TYPES.forEach(function (d, j) {
    html.push('<th class="tm-hd tm-v tm-v-' + j + '" data-j="' + j + '" scope="col" ' +
      'title="' + esc(label(d)) + ' &middot; ' + COUNTS[d] + ' species">' +
      '<span class="t-' + d + '" aria-label="Defending ' + esc(label(d)) + '">' +
      esc(label(d)) + '</span></th>');
  });
  html.push('</tr></thead><tbody>');

  TYPES.forEach(function (a, i) {
    html.push('<tr><th class="tm-hd tm-h tm-h-' + i + '" data-i="' + i + '" scope="row">' +
      '<span class="t-' + a + '" aria-label="Attacking ' + esc(label(a)) + '">' +
      esc(label(a)) + '</span></th>');
    for (var j = 0; j < N; j++) {
      var v = ROWS[i][j];
      var glyph = v === 0 ? '0' : v === 2 ? '2' : v === 0.5 ? '&frac12;' : '&middot;';
      var textMult = v === 0 ? '0' : v === 2 ? '2' : v === 0.5 ? '0.5' : '1';
      html.push('<td class="tm-cell tm-x' + band(v) + ' tm-r' + i + '-c' + j + '" ' +
        'data-i="' + i + '" data-j="' + j + '" data-v="' + glyph + '" role="gridcell" ' +
        'aria-label="' + esc(label(a)) + ' attacking into ' + esc(label(TYPES[j])) + ' &times;' + textMult + '">' +
        '</td>');
    }
    html.push('</tr>');
  });
  html.push('</tbody>');
  table.innerHTML = html.join('');

  var tds = table.querySelectorAll('td.tm-cell');
  var rowHds = table.querySelectorAll('th[data-i]');
  var colHds = table.querySelectorAll('th[data-j]');
  var summary = document.getElementById('t-summary');

  /* Pre-index cells by row and column for fast O(1) lookups */
  var cellsByRow = Array.from({ length: N }, function () { return []; });
  var cellsByCol = Array.from({ length: N }, function () { return []; });
  tds.forEach(function (td) {
    cellsByRow[+td.dataset.i].push(td);
    cellsByCol[+td.dataset.j].push(td);
  });

  /* ---- selection -------------------------------------------------------- */
  var pick = null;

  function pick_(t) { pick = (pick === t) ? null : t; paint(); }

  function paint() {
    if (!pick) {
      tds.forEach(function (td) {
        td.classList.remove('tm-on', 'tm-row-off');
      });
      rowHds.forEach(function (h) {
        h.classList.remove('on', 'tm-mark');
        h.setAttribute('aria-pressed', 'false');
      });
      colHds.forEach(function (h) {
        h.classList.remove('on', 'tm-mark');
        h.setAttribute('aria-pressed', 'false');
      });
      summary.innerHTML = hintHtml();
      return;
    }
    var i = idx[pick];
    /* Fast lookup using dataset indices */
    tds.forEach(function (td) {
      var ri = +td.dataset.i, ci = +td.dataset.j;
      var isOn = (ri === i || ci === i);
      td.classList.toggle('tm-on', isOn);
      td.classList.toggle('tm-row-off', !isOn);
    });
    rowHds.forEach(function (h) {
      var matches = (+h.dataset.i === i);
      h.classList.toggle('on', matches);
      h.classList.toggle('tm-mark', matches);
      h.setAttribute('aria-pressed', String(matches));
    });
    colHds.forEach(function (h) {
      var matches = (+h.dataset.j === i);
      h.classList.toggle('on', matches);
      h.classList.toggle('tm-mark', matches);
      h.setAttribute('aria-pressed', String(matches));
    });
    summary.innerHTML = summaryHtml(pick, i);
  }

  function hintHtml() {
    return '<div class="tm-hint">' +
      '<p class="font-sans text-sm font-semibold text-ink-900 dark:text-white">Pick a type to light up its row and column</p>' +
      '<p class="mt-1 max-w-2xl font-sans text-xs text-ink-500 dark:text-ink-400">' +
      'The row it sits in is what that type <em>hits hard</em>. The column it sits above is what ' +
      '<em>gets it in trouble</em>. This panel then lists both directions with the types named, ' +
      'and links straight to the species that carry it.</p></div>';
  }

  function chips(list) {
    if (!list.length) return '<span class="text-ink-400 dark:text-ink-500 text-xs">none</span>';
    return list.map(function (t) {
      return '<span class="t-' + t + ' inline-block rounded px-2 py-0.5 text-[11px] font-semibold">' +
        esc(label(t)) + '</span>';
    }).join(' ');
  }

  function summaryHtml(t, i) {
    var strong = [], weak = [], none = [];
    TYPES.forEach(function (d, j) {
      var v = ROWS[i][j];
      if (v === 2) strong.push(d);
      else if (v === 0.5) weak.push(d);
      else if (v === 0) none.push(d);
    });
    var hard = [], soft = [], immune = [];
    TYPES.forEach(function (a, j) {
      var v = ROWS[j][i];
      if (v === 2) hard.push(a);
      else if (v === 0.5) soft.push(a);
      else if (v === 0) immune.push(a);
    });
    var rows = [
      ['Hits hard', strong, 'row'],
      ['Blocked by', weak, 'row'],
      ['No effect on', none, 'row'],
      ['Vulnerable to', hard, 'col'],
      ['Resisted by', soft, 'col'],
      ['Immune to', immune, 'col']
    ];
    return '' +
      '<div class="rounded-xl border border-ink-200 bg-white p-4 shadow-sm dark:border-ink-800 dark:bg-ink-900">' +
      '<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">' +
      '<span class="t-' + t + ' rounded px-2.5 py-1 text-sm font-bold">' + esc(label(t)) + '</span>' +
      '<span class="text-sm text-ink-600 dark:text-ink-300">' + COUNTS[t] + ' species carry it</span>' +
      '<a href="dex.html?type=' + t + '" class="ml-auto text-sm font-semibold text-kalos-700 underline underline-offset-2 hover:text-kalos-800 dark:text-kalos-300">' +
      'See these in the Pok&eacute;dex &rarr;</a>' +
      '</div>' +
      '<dl class="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">' +
      rows.map(function (r) {
        return '<div><dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-500">' +
          r[0] + '</dt><dd class="mt-1 flex flex-wrap gap-1">' + chips(r[1]) + '</dd></div>';
      }).join('') +
      '</dl></div>';
  }

  rowHds.forEach(function (h) { h.addEventListener('click', function () { pick_(TYPES[+h.dataset.i]); }); });
  colHds.forEach(function (h) { h.addEventListener('click', function () { pick_(TYPES[+h.dataset.j]); }); });
  document.getElementById('t-clear').addEventListener('click', function () { pick = null; paint(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pick) { pick = null; paint(); }
  });

  paint();

  /* ---- Dual-type defense calculator ------------------------------------ */
  var selT1 = document.getElementById('calc-t1');
  var selT2 = document.getElementById('calc-t2');
  var calcReset = document.getElementById('calc-reset');
  var calcRes = document.getElementById('calc-results');

  if (selT1 && selT2 && calcRes) {
    var optHtml1 = TYPES.map(function (t) {
      return '<option value="' + t + '">' + esc(label(t)) + '</option>';
    }).join('');
    var optHtml2 = '<option value="">None (Pure type)</option>' + TYPES.map(function (t) {
      return '<option value="' + t + '">' + esc(label(t)) + '</option>';
    }).join('');

    selT1.innerHTML = optHtml1;
    selT2.innerHTML = optHtml2;
    selT1.value = 'fire';
    selT2.value = 'flying';

    function runCalc() {
      var t1 = selT1.value;
      var t2 = selT2.value;
      if (!t1) return;
      var i1 = idx[t1];
      var i2 = (t2 && t2 !== t1) ? idx[t2] : null;

      var x4 = [], x2 = [], x1 = [], x05 = [], x025 = [], x0 = [];

      TYPES.forEach(function (atk, aIdx) {
        var m1 = ROWS[aIdx][i1];
        var m2 = (i2 !== null) ? ROWS[aIdx][i2] : 1;
        var total = m1 * m2;

        if (total === 4) x4.push(atk);
        else if (total === 2) x2.push(atk);
        else if (total === 1) x1.push(atk);
        else if (total === 0.5) x05.push(atk);
        else if (total === 0.25) x025.push(atk);
        else if (total === 0) x0.push(atk);
      });

      var groups = [];
      if (x4.length) groups.push({ title: '4&times; Double weakness', list: x4, badgeCls: 'bg-rose-600 text-white' });
      if (x2.length) groups.push({ title: '2&times; Weakness', list: x2, badgeCls: 'bg-amber-600 text-white' });
      if (x05.length) groups.push({ title: '&frac12;&times; Resistance', list: x05, badgeCls: 'bg-emerald-600 text-white' });
      if (x025.length) groups.push({ title: '&frac14;&times; Double resistance', list: x025, badgeCls: 'bg-teal-700 text-white' });
      if (x0.length) groups.push({ title: '0&times; Immunity', list: x0, badgeCls: 'bg-ink-700 text-white' });
      groups.push({ title: '1&times; Neutral damage', list: x1, badgeCls: 'bg-ink-400 text-white' });

      var outHtml = '<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">';
      groups.forEach(function (g) {
        outHtml += '<div class="rounded-lg border border-ink-100 bg-ink-50/50 p-2.5 dark:border-ink-800 dark:bg-ink-950/50">' +
          '<div class="flex items-center justify-between text-xs font-bold">' +
            '<span>' + g.title + '</span>' +
            '<span class="rounded px-1.5 py-0.2 text-[10px] ' + g.badgeCls + '">' + g.list.length + '</span>' +
          '</div>' +
          '<div class="mt-2 flex flex-wrap gap-1">' + chips(g.list) + '</div>' +
        '</div>';
      });
      outHtml += '</div>';
      calcRes.innerHTML = outHtml;
    }

    selT1.addEventListener('change', runCalc);
    selT2.addEventListener('change', runCalc);
    calcReset.addEventListener('click', function () {
      selT1.value = 'normal';
      selT2.value = '';
      runCalc();
    });
    runCalc();
  }
})();
