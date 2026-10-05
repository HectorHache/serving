/* Document page: scrollspy TOC, Cmd+K full text search, reading time, mini TOC. */
(function () {
  'use strict';
  var pz = window.pz, root = document.documentElement;
  var article = document.getElementById('article');
  if (!article) return;

  var data = pz.readData() || {};
  var toc = data.toc || [];
  var headings = Array.prototype.slice.call(article.querySelectorAll('h2[id], h3[id]'));

  /* ---------------------------------------------------------- reading time */
  var words = (article.textContent || '').trim().split(/\s+/).length;
  var rt = document.getElementById('read-time');
  if (rt) rt.textContent = Math.max(1, Math.round(words / 230)) + ' min · ' +
    words.toLocaleString() + ' words · ' + article.querySelectorAll('table').length + ' tables';

  /* ---------------------------------------------------------- mini toc */
  var mini = document.getElementById('mini-toc');
  if (mini) {
    var h2s = toc.filter(function (t) { return t.level === 2; });
    var html = '';
    for (var i = 0; i < h2s.length; i++) {
      var n = h2s[i].text.match(/^(\d+[a-z]?)\.?\s/);
      html += '<a href="#' + h2s[i].id + '" class="block py-1 pl-2 text-xs leading-snug text-ink-500 no-underline hover:text-ink-900 dark:text-ink-400 dark:hover:text-white">' +
        (n ? '<span class="font-mono text-ink-400 dark:text-ink-600">' + n[1] + '</span> ' : '') +
        h2s[i].text.replace(/^\d+[a-z]?\.?\s*/, '') + '</a>';
    }
    mini.innerHTML = html;
  }

  /* ---------------------------------------------------------- scrollspy */
  var links = {};
  Array.prototype.forEach.call(document.querySelectorAll('.toc-link'), function (a) {
    links[a.getAttribute('data-toc')] = a;
  });
  var current = null;
  function setActive(id) {
    if (id === current || !links[id]) return;
    if (current && links[current]) {
      links[current].classList.remove('text-ink-900', 'font-medium', 'bg-ink-100', 'dark:text-white', 'dark:bg-ink-800');
      links[current].classList.add('text-ink-500', 'dark:text-ink-400');
    }
    var a = links[id];
    a.classList.remove('text-ink-500', 'dark:text-ink-400');
    a.classList.add('text-ink-900', 'font-medium', 'bg-ink-100', 'dark:text-white', 'dark:bg-ink-800');
    a.setAttribute('aria-current', 'true');
    current = id;
  }
  if (headings.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setActive(e.target.id);
      });
    }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });
    headings.forEach(function (h) { io.observe(h); });
  }

  /* ---------------------------------------------------------- search */
  var dlg = document.getElementById('search-dialog');
  var input = document.getElementById('search-input');
  var out = document.getElementById('search-results');
  var count = document.getElementById('search-count');
  var openBtn = document.getElementById('open-search');

  /* index built once: one entry per paragraph-ish block */
  var index = [];
  Array.prototype.forEach.call(article.children, function (node) {
    if (node.tagName === 'H1') return;
    var id = node.id || '';
    var heading = '';
    if (node.tagName === 'H2' || node.tagName === 'H3') {
      heading = node.textContent;
      index.push({ id: id, heading: heading, text: '', tag: node.tagName });
    } else {
      var txt = (node.textContent || '').trim();
      if (txt.length < 30) return;
      if (!id) {
        var p = node.previousElementSibling;
        while (p && !p.id) p = p.previousElementSibling;
        id = p ? p.id : (toc[0] || {}).id || '';
      }
      index.push({ id: id, heading: heading, text: txt, tag: node.tagName });
    }
  });
  /* attach the section heading to each body block */
  var curH = '';
  for (var i = 0; i < index.length; i++) {
    if (index[i].heading) curH = index[i].heading;
    else index[i].heading = curH;
  }

  function openSearch() {
    if (!dlg) return;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    input.focus();
    input.select();
  }
  if (openBtn) openBtn.addEventListener('click', openSearch);

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openSearch(); return; }
    if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); openSearch(); }
  });

  function run(q) {
    if (!out) return;
    var query = q.trim().toLowerCase();
    out.innerHTML = '';
    if (query.length < 2) {
      count.textContent = index.length + ' searchable blocks · type at least 2 characters';
      var hint = pz.el('div', 'px-3 py-8 text-center text-sm text-ink-500 dark:text-ink-400',
        'Search ' + index.length + ' blocks of the research.');
      out.appendChild(hint);
      return;
    }
    var terms = query.split(/\s+/).filter(Boolean).slice(0, 6);
    var hits = [];
    for (var j = 0; j < index.length && hits.length < 60; j++) {
      var hay = (index[j].heading + ' ' + index[j].text).toLowerCase();
      var score = 0, all = true;
      for (var k = 0; k < terms.length; k++) {
        var t = terms[k];
        var n = hay.split(t).length - 1;
        if (!n) { all = false; break; }
        score += n;
        if (index[j].heading.toLowerCase().indexOf(t) >= 0) score += 6;
      }
      if (all) hits.push({ rec: index[j], score: score, n: hay.split(terms[0]).length - 1 });
    }
    hits.sort(function (a, b) { return b.score - a.score; });
    count.textContent = hits.length + (hits.length === 60 ? '+ results' : ' result' + (hits.length === 1 ? '' : 's'));
    if (!hits.length) {
      out.appendChild(pz.el('div', 'px-3 py-10 text-center text-sm text-ink-500 dark:text-ink-400',
        'Nothing matches "' + q + '". Try a shorter term, or a species name like Greninja.'));
      return;
    }
    for (var h = 0; h < hits.length; h++) {
      var rec = hits[h].rec;
      var a = document.createElement('a');
      a.href = '#' + rec.id;
      a.setAttribute('role', 'option');
      a.className = 'block rounded-lg px-3 py-2.5 no-underline hover:bg-ink-100 dark:hover:bg-ink-800';
      var head = pz.el('div', 'font-sans text-xs font-semibold text-kalos-700 dark:text-kalos-300');
      head.innerHTML = pz.highlight(rec.heading || 'Introduction', terms);
      a.appendChild(head);
      var body = rec.text || '';
      var at = body.toLowerCase().indexOf(terms[0]);
      if (at < 0) at = 0;
      var from = Math.max(0, at - 70);
      var snippet = (from > 0 ? '…' : '') + body.slice(from, from + 240) + (body.length > from + 240 ? '…' : '');
      var p = pz.el('p', 'mt-1 line-clamp-3 font-serif text-sm text-ink-600 dark:text-ink-300');
      p.innerHTML = pz.highlight(snippet, terms);
      a.appendChild(p);
      a.addEventListener('click', function () { if (dlg.open) dlg.close(); });
      out.appendChild(a);
    }
  }

  if (input) {
    input.addEventListener('input', pz.debounce(function () { run(input.value); }, 150));
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { dlg.close(); }
      if (e.key === 'Enter') {
        var first = out.querySelector('a');
        if (first) { location.hash = first.getAttribute('href'); dlg.close(); }
      }
    });
  }
  if (dlg) {
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }
  run('');
})();