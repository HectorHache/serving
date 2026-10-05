/* Dataset explorer: tab switch, sortable columns, filter, CSV download. */
(function () {
  'use strict';
  var pz = window.pz;
  var data = pz.readData();
  var tabs = document.getElementById('data-tabs');
  var host = document.getElementById('data-table');
  if (!data || !tabs) return;

  var q = document.getElementById('data-search');
  var count = document.getElementById('data-count');
  var dl = document.getElementById('data-download');
  var panel = document.getElementById('data-panel');

  var current = Object.keys(data)[0];
  var sortKey = null, sortDir = 1, query = '';

  function active() { return data[current]; }

  function render() {
    var d = active();
    var rows = d.rows.slice();

    if (query) {
      var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      rows = rows.filter(function (r) {
        var hay = d.cols.map(function (c) { return r[c] || ''; }).join(' ').toLowerCase();
        return terms.every(function (t) { return hay.indexOf(t) >= 0; });
      });
    }
    if (sortKey) {
      rows.sort(function (a, b) {
        var x = a[sortKey] || '', y = b[sortKey] || '';
        var nx = parseFloat(x.replace(/[^0-9.\-]/g, ''));
        var ny = parseFloat(y.replace(/[^0-9.\-]/g, ''));
        if (!isNaN(nx) && !isNaN(ny) && x !== '' && y !== '') return (nx - ny) * sortDir;
        return String(x).localeCompare(String(y), undefined, { numeric: true }) * sortDir;
      });
    }

    count.textContent = rows.length.toLocaleString() + ' of ' + d.rows.length.toLocaleString() + ' rows · ' +
      d.cols.length + ' columns';

    /* header */
    var th = '';
    d.cols.forEach(function (c) {
      var aria = 'none';
      if (c === sortKey) aria = sortDir > 0 ? 'ascending' : 'descending';
      var glyph = c === sortKey ? (sortDir > 0 ? ' ↑' : ' ↓') : '';
      th += '<th scope="col" aria-sort="' + aria + '">' +
        '<button type="button" data-sort="' + c + '" class="flex items-center gap-1 uppercase tracking-wide hover:text-kalos-700 dark:hover:text-kalos-300">' +
        pz.highlight(c.replace(/_/g, ' '), query ? query.split(/\s+/).filter(Boolean) : []) +
        '<span aria-hidden="true">' + glyph + '</span></button></th>';
    });

    /* body, capped so a 1000 row table does not lock the page */
    var CAP = 400;
    var shown = rows.slice(0, CAP);
    var tb = '';
    shown.forEach(function (r) {
      var tds = d.cols.map(function (c) {
        var v = r[c] || '';
        var isNum = /^[\d.\-\s]+$/.test(v);
        return '<td class="' + (isNum ? 'font-mono text-xs tabular-nums' : '') + '">' +
          pz.highlight(v, query ? query.split(/\s+/).filter(Boolean) : []) + '</td>';
      }).join('');
      tb += '<tr>' + tds + '</tr>';
    });

    host.innerHTML = '<div class="table-shell not-prose" role="region" tabindex="0" ' +
      'aria-label="' + d.title + ', scrollable"><table class="doc-table">' +
      '<thead><tr>' + th + '</tr></thead><tbody>' + tb + '</tbody></table></div>' +
      (rows.length > CAP ? '<p class="mt-3 font-sans text-xs text-ink-500 dark:text-ink-400">Showing the first ' +
        CAP.toLocaleString() + ' of ' + rows.length.toLocaleString() +
        ' rows. Narrow the filter, or download the full CSV.</p>' : '');

    host.querySelectorAll('[data-sort]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = b.getAttribute('data-sort');
        if (sortKey === c) sortDir = -sortDir; else { sortKey = c; sortDir = 1; }
        render();
      });
    });
  }

  Array.prototype.forEach.call(tabs.querySelectorAll('[data-tab]'), function (b) {
    b.addEventListener('click', function () {
      tabs.querySelectorAll('[data-tab]').forEach(function (x) {
        var on = x === b;
        x.setAttribute('aria-selected', String(on));
        x.classList.toggle('bg-kalos-600', on);
        x.classList.toggle('text-white', on);
        x.classList.toggle('text-ink-600', !on);
        x.classList.toggle('dark:text-ink-300', !on);
      });
      current = b.getAttribute('data-tab');
      panel.setAttribute('aria-labelledby', b.id);
      var d = active();
      document.getElementById('data-search').placeholder = 'Filter ' + d.title.toLowerCase() + ' rows';
      sortKey = null; sortDir = 1;
      dl.href = 'data/' + current + '.csv';
      dl.setAttribute('download', current + '.csv');
      render();
    });
  });

  q.addEventListener('input', pz.debounce(function () {
    query = q.value.trim();
    render();
  }, 150));

  /* keyboard: left/right moves between tabs */
  tabs.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var list = Array.prototype.slice.call(tabs.querySelectorAll('[data-tab]'));
    var i = list.findIndex(function (x) { return x.getAttribute('aria-selected') === 'true'; });
    var n = e.key === 'ArrowRight' ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
    list[n].focus();
    list[n].click();
  });

  dl.href = 'data/' + current + '.csv';
  render();
})();