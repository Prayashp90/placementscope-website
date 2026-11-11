/* PlacementScope client script. Progressive enhancement only: every page works without it. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var root = document.documentElement;

  /* theme */
  function effectiveTheme() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function syncThemeLabel(btn) {
    var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    btn.setAttribute('aria-label', 'Switch to ' + next + ' theme');
  }
  var themeBtn = $('.theme-toggle');
  if (themeBtn) {
    syncThemeLabel(themeBtn);
    themeBtn.addEventListener('click', function () {
      var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      store.set('ps-theme', next);
      syncThemeLabel(themeBtn);
    });
  }

  /* mobile nav */
  var navBtn = $('.nav-toggle'), nav = $('#site-nav');
  if (navBtn && nav) {
    navBtn.addEventListener('click', function () {
      var open = navBtn.getAttribute('aria-expanded') !== 'true';
      navBtn.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('open', open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open'); navBtn.setAttribute('aria-expanded', 'false'); navBtn.focus();
      }
    });
  }

  /* domain sections: collapsible on mobile, always open on desktop and in print */
  var secs = $$('.dsec details');
  if (secs.length) {
    var desktop = window.matchMedia('(min-width: 1000px)');
    var applyMode = function () {
      secs.forEach(function (d, i) { d.open = desktop.matches || i === 0; });
    };
    applyMode();
    if (desktop.addEventListener) desktop.addEventListener('change', applyMode);
    secs.forEach(function (d) {
      d.querySelector('summary').addEventListener('click', function (e) { if (desktop.matches) e.preventDefault(); });
    });
    var openHash = function () {
      var id = location.hash.slice(1);
      var t = id && document.getElementById(id);
      if (t) { var det = t.closest('.dsec') && t.closest('.dsec').querySelector('details'); if (det) det.open = true; }
    };
    window.addEventListener('hashchange', openHash); openHash();
    window.addEventListener('beforeprint', function () { secs.forEach(function (d) { d.open = true; }); });

    /* scroll-spy for the sticky TOC */
    var tocLinks = $$('.toc a');
    if ('IntersectionObserver' in window && tocLinks.length) {
      var map = {};
      tocLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            tocLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
            var a = map[en.target.id]; if (a) a.setAttribute('aria-current', 'true');
          }
        });
      }, { rootMargin: '-80px 0px -70% 0px' });
      $$('.dsec').forEach(function (s) { io.observe(s); });
    }
  }
  $$('[data-print]').forEach(function (b) {
    b.addEventListener('click', function () { secs.forEach(function (d) { d.open = true; }); window.print(); });
  });

  /* tabs */
  $$('[data-tabs]').forEach(function (box) {
    var tabs = $$('[role="tab"]', box);
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') n = tabs[0];
        else if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    select(tabs[0]);
  });

  /* self-check checklists persisted in localStorage */
  $$('[data-checklist]').forEach(function (box) {
    var key = 'ps-check-' + box.getAttribute('data-checklist');
    var boxes = $$('input[type="checkbox"]', box);
    var done = $('[data-done]', box);
    var saved = [];
    try { saved = JSON.parse(store.get(key) || '[]'); } catch (e) {}
    boxes.forEach(function (b) { b.checked = saved.indexOf(Number(b.getAttribute('data-idx'))) !== -1; });
    var update = function (persist) {
      var on = boxes.filter(function (b) { return b.checked; }).map(function (b) { return Number(b.getAttribute('data-idx')); });
      done.textContent = on.length;
      if (persist) store.set(key, JSON.stringify(on));
    };
    boxes.forEach(function (b) { b.addEventListener('change', function () { update(true); }); });
    $('[data-reset]', box).addEventListener('click', function () {
      boxes.forEach(function (b) { b.checked = false; }); store.del(key); update(false);
    });
    update(false);
  });

  /* generic chip filters (roadmap hub, question bank) */
  $$('[data-filter-group]').forEach(function (group) {
    var name = group.getAttribute('data-filter-group');
    var chips = $$('.chip', group);
    var status = $('[data-filter-status="' + name + '"]');
    var items = $$('[data-item]');
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var f = c.getAttribute('data-filter');
        chips.forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
        var shown = 0;
        items.forEach(function (it) {
          var ok = f === 'all' || it.getAttribute('data-item') === f;
          it.hidden = !ok; if (ok) shown++;
        });
        $$('.hub-stage').forEach(function (st) { st.hidden = !$$('[data-item]', st).some(function (i) { return !i.hidden; }); });
        if (status) status.textContent = f === 'all' ? '' : 'Showing ' + shown + ' item' + (shown === 1 ? '' : 's') + ' for ' + c.textContent + '.';
      });
    });
  });

  /* home: category chips + full-text search */
  var grid = $('.dgrid');
  if (grid) {
    var cards = $$('.dcard', grid);
    var input = $('#search');
    var sStatus = $('#search-status');
    var cat = 'all', index = null, loading = null;
    var loadIndex = function () {
      if (index || loading) return loading;
      loading = fetch('search-index.json').then(function (r) { return r.json(); }).then(function (j) {
        index = {}; j.forEach(function (d) { index[d.id] = d.text; });
      }).catch(function () { index = {}; });
      return loading;
    };
    var escapeHtml = function (s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var snippet = function (text, term) {
      var i = text.toLowerCase().indexOf(term);
      if (i < 0) return '';
      var s = Math.max(0, i - 60), e = Math.min(text.length, i + term.length + 80);
      var part = (s ? '…' : '') + text.slice(s, e) + (e < text.length ? '…' : '');
      var safe = escapeHtml(part);
      var re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
      return safe.replace(re, function (m) { return '<mark>' + m + '</mark>'; });
    };
    var run = function () {
      var q = (input.value || '').trim().toLowerCase();
      var terms = q.split(/\s+/).filter(Boolean);
      var shown = 0;
      cards.forEach(function (card) {
        var id = card.getAttribute('data-id');
        var okCat = cat === 'all' || card.getAttribute('data-cat') === cat;
        var text = (index && index[id]) || card.textContent;
        var low = text.toLowerCase();
        var okQ = terms.every(function (t) { return low.indexOf(t) !== -1; });
        var sn = $('.snippet', card);
        if (terms.length && okQ) { sn.innerHTML = snippet(text, terms[0]); sn.hidden = !sn.innerHTML; } else { sn.hidden = true; }
        card.hidden = !(okCat && okQ);
        if (!card.hidden) shown++;
      });
      sStatus.textContent = (terms.length || cat !== 'all') ? shown + ' of ' + cards.length + ' domains match.' + (shown === 0 ? ' Try a different word.' : '') : '';
    };
    var timer;
    input.addEventListener('focus', loadIndex, { once: true });
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { var p = loadIndex(); if (p) p.then(run); else run(); }, 120);
    });
    $$('.chips .chip[data-cat]').forEach(function (c) {
      c.addEventListener('click', function () {
        cat = c.getAttribute('data-cat');
        $$('.chips .chip[data-cat]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
        run();
      });
    });
  }

  /* quiz */
  var form = $('#quiz-form');
  if (form) {
    var data = JSON.parse($('#quiz-data').textContent);
    var out = $('#quiz-result');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var scores = {}, notes = [], answered = 0;
      data.questions.forEach(function (q) {
        var sel = form.querySelector('input[name="' + q.id + '"]:checked');
        if (!sel) return;
        answered++;
        var opt = q.options[Number(sel.value)];
        Object.keys(opt.scores).forEach(function (k) { scores[k] = (scores[k] || 0) + opt.scores[k]; });
        if (opt.note) notes.push(opt.note);
      });
      if (answered < 2) {
        out.innerHTML = '<p class="note">Answer at least the first two questions to see matches.</p>';
        out.focus(); return;
      }
      var ranked = Object.keys(scores).sort(function (a, b) { return scores[b] - scores[a]; }).slice(0, 3);
      var labels = ['Best match', 'Also consider', 'Worth a look'];
      var html = '<h3>Your matches</h3><ol class="matches">' + ranked.map(function (id, i) {
        var d = data.domains[id];
        return '<li class="card match"><p class="rank">' + labels[i] + '</p><h4><a href="' + d.url + '">' + escape(d.name) + '</a></h4><p>' + escape(d.summary) + '</p></li>';
      }).join('') + '</ol>';
      if (notes.length) html += '<div class="keypoints"><p><strong>Things to know</strong></p><ul>' + notes.map(function (n) { return '<li>' + escape(n) + '</li>'; }).join('') + '</ul></div>';
      html += '<p class="note">These are rule-based suggestions. Read the domain pages and talk to seniors before deciding.</p>';
      out.innerHTML = html;
      out.focus();
    });
    form.addEventListener('reset', function () { out.innerHTML = ''; });
  }
  function escape(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* company table: filter + sort */
  var table = $('#co-table');
  if (table) {
    var rows = $$('tbody tr', table);
    var sel = $('#co-domain'), txt = $('#co-text'), st = $('#co-status');
    var filter = function () {
      var d = sel.value, q = txt.value.trim().toLowerCase(), n = 0;
      rows.forEach(function (r) {
        var ok = (d === 'all' || r.getAttribute('data-domain') === d) && (!q || r.textContent.toLowerCase().indexOf(q) !== -1);
        r.hidden = !ok; if (ok) n++;
      });
      st.textContent = n + ' compan' + (n === 1 ? 'y' : 'ies');
    };
    sel.addEventListener('change', filter);
    txt.addEventListener('input', filter);
    var ths = $$('thead th', table);
    $$('[data-sort-col]', table).forEach(function (b) {
      b.addEventListener('click', function () {
        var col = Number(b.getAttribute('data-sort-col'));
        var th = ths[col];
        var dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
        ths.forEach(function (h) { h.setAttribute('aria-sort', 'none'); });
        th.setAttribute('aria-sort', dir);
        var val = function (r) {
          var c = r.children[col];
          var v = (c.getAttribute('data-sort') !== null ? c.getAttribute('data-sort') : c.textContent).trim();
          var num = parseFloat(v.replace(/[^\d.]/g, ''));
          return { s: v.toLowerCase(), n: isNaN(num) ? null : num, empty: !v };
        };
        var tb = table.tBodies[0];
        rows.slice().sort(function (a, z) {
          var A = val(a), Z = val(z);
          if (A.empty !== Z.empty) return A.empty ? 1 : -1; /* blanks always last */
          var r = (A.n !== null && Z.n !== null) ? A.n - Z.n : A.s.localeCompare(Z.s);
          return dir === 'ascending' ? r : -r;
        }).forEach(function (r) { tb.appendChild(r); });
      });
    });
  }
})();
