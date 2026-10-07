/* Type matchups matrix.
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
      '<span>Defending \u2192</span><span>Attacking \u2193</span></span></th>'];
  TYPES.forEach(function (d, j) {
    html.push('<th class="tm-hd tm-v tm-v-' + j + '" data-j="' + j + '" scope="col" title="' +
      esc(label(d)) + ' &middot; ' + COUNTS[d] + ' species"><span class="t-' + d + '">' +
      esc(label(d)) + '</span></th>');
  });
  html.push('</tr></thead><tbody>');

  TYPES.forEach(function (a, i) {
    html.push('<tr><th class="tm-hd tm-h tm-h-' + i + '" data-i="' + i + '" scope="row">' +
      '<span class="t-' + a + '">' + esc(label(a)) + '</span></th>');
    for (var j = 0; j < N; j++) {
      var v = ROWS[i][j];
      html.push('<td class="tm-cell tm-x' + band(v) + ' tm-r' + i + '-c' + j + '" data-v="' +
        (v === 0 ? '0' : v === 2 ? '2' : v === 0.5 ? '&frac12;' : '&middot;') +
        '" title="' + esc(label(a)) + ' into ' + esc(label(TYPES[j])) + ' &times;' + v + '"></td>');
    }
    html.push('</tr>');
  });
  html.push('</tbody>');
  table.innerHTML = html.join('');

  var tds = table.querySelectorAll('td.tm-cell');
  var rowHds = table.querySelectorAll('th[data-i]');
  var colHds = table.querySelectorAll('th[data-j]');
  var summary = document.getElementById('t-summary');

  /* ---- selection -------------------------------------------------------- */
  var pick = null;

  function pick_(t) { pick = (pick === t) ? null : t; paint(); }

  function paint() {
    if (!pick) {
      tds.forEach(function (td) {
        td.classList.remove('tm-on', 'tm-row-off');
      });
      rowHds.forEach(function (h) { h.classList.remove('on', 'tm-mark'); });
      colHds.forEach(function (h) { h.classList.remove('on', 'tm-mark'); });
      summary.innerHTML = hintHtml();
      return;
    }
    var i = idx[pick];
    tds.forEach(function (td) {
      var r = td.className.match(/tm-r(\d+)-c(\d+)/);
      var ri = +r[1], ci = +r[2];
      td.classList.toggle('tm-on', ri === i || ci === i);
      /* anything off the chosen row and column dims together */
      td.classList.toggle('tm-row-off', ri !== i && ci !== i);
    });
    rowHds.forEach(function (h) {
      h.classList.toggle('on', +h.dataset.i === i);
      h.classList.toggle('tm-mark', +h.dataset.i === i);
    });
    colHds.forEach(function (h) {
      h.classList.toggle('on', +h.dataset.j === i);
      h.classList.toggle('tm-mark', +h.dataset.j === i);
    });
    summary.innerHTML = summaryHtml(pick, i);
  }

  function hintHtml() {
    return '<div class="tm-hint">' +
      '<p class="font-sans text-sm font-semibold">Pick a type to light up its row and column</p>' +
      '<p class="mt-1 max-w-2xl font-sans text-xs text-ink-500 dark:text-ink-400">' +
      'The row it sits in is what that type <em>hits hard</em>. The column it sits above is what ' +
      '<em>gets it in trouble</em>. This panel then lists both directions with the types named, ' +
      'and links straight to the species that carry it.</p></div>';
  }

  function chips(list, kind) {
    if (!list.length) return '<span class="text-ink-500">none</span>';
    return list.map(function (t) {
      return '<span class="t-' + t + ' inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold">' +
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
      '<div class="rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">' +
      '<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">' +
      '<span class="t-' + t + ' rounded px-2 py-1 text-sm font-bold">' + esc(label(t)) + '</span>' +
      '<span class="text-sm text-ink-600 dark:text-ink-300">' + COUNTS[t] + ' species carry it</span>' +
      '<a href="dex.html?type=' + t + '" class="ml-auto text-sm font-semibold text-kalos-700 underline underline-offset-2 hover:text-kalos-800 dark:text-kalos-200">' +
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
})();