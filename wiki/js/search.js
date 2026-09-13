/* Поиск по вики мира Орвей.
   Индекс (WIKI_SEARCH_INDEX) подгружается из search-data.js.
   Поиск живёт на клиенте: ранжирование по точному совпадению в заголовке,
   ключевых словах, подзаголовках и аннотации. Совпадения подсвечиваются. */
(function () {
  'use strict';

  var INDEX = typeof WIKI_SEARCH_INDEX !== 'undefined' ? WIKI_SEARCH_INDEX : [];

  var input = document.getElementById('searchInput');
  var clearBtn = document.getElementById('searchClear');
  var metaEl = document.getElementById('searchMeta');
  var resultsEl = document.getElementById('searchResults');
  var quickEl = document.getElementById('searchQuick');

  if (!input || !resultsEl) return;

  var MAX_RESULTS = 30;
  var LEAD_LIMIT = 280;

  var cached = [];
  var currentQuery = '';

  /* ---------- Подготовка индекса ---------- */
  INDEX.forEach(function (entry) {
    cached.push({
      title: entry.title || '',
      url: entry.url || '',
      section: entry.section || '',
      keywords: (entry.keywords || '').toLowerCase(),
      headings: (entry.headings || []).join(' ').toLowerCase(),
      lead: entry.lead || '',
      haystack: (
        (entry.title || '') + ' ' +
        (entry.keywords || '') + ' ' +
        (entry.section || '') + ' ' +
        (entry.headings || []).join(' ') + ' ' +
        (entry.lead || '')
      ).toLowerCase()
    });
  });

  /* ---------- Утилиты ---------- */
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function truncate(s, n) {
    s = s.replace(/\s+/g, ' ').trim();
    if (s.length <= n) return s;
    return s.slice(0, n).replace(/\s+\S*$/, '') + '…';
  }

  /* Подсветка вхождений фраз в тексте. html — уже экранированный текст. */
  function highlight(html, terms) {
    if (!terms.length) return html;
    var pattern = terms
      .slice()
      .sort(function (a, b) { return b.length - a.length; })
      .map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); })
      .join('|');
    var re = new RegExp('(' + pattern + ')', 'gi');
    return html.replace(re, '<mark>$1</mark>');
  }

  /* ---------- Ранжирование ---------- */
  function scoreEntry(entry, words) {
    var total = 0;
    var matchedWords = 0;
    var title = entry.title.toLowerCase();
    var lead = entry.lead.toLowerCase();

    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      var found = false;

      if (title.indexOf(w) !== -1) {
        total += 5;
        found = true;
      }
      if (entry.keywords.indexOf(w) !== -1) {
        total += 4;
        found = true;
      }
      if (entry.headings.indexOf(w) !== -1) {
        total += 2;
        found = true;
      }
      if (lead.indexOf(w) !== -1 || entry.section.toLowerCase().indexOf(w) !== -1) {
        total += 1;
        found = true;
      }
      if (found) matchedWords++;
    }

    return { score: total, matched: matchedWords };
  }

  /* ---------- Поиск ---------- */
  function runSearch(rawQuery) {
    var words = rawQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(function (w) {
        return w.length >= 1 && /[а-яёa-z0-9]/.test(w);
      });

    if (!words.length) return [];

    var totalWords = words.length;
    var results = [];

    cached.forEach(function (entry) {
      var r = scoreEntry(entry, words);
      if (r.score <= 0) return;
      results.push({
        entry: entry,
        score: r.score,
        matched: r.matched,
        all: r.matched === totalWords,
        ratio: r.matched / totalWords
      });
    });

    results.sort(function (a, b) {
      if (b.all !== a.all) return b.all ? 1 : -1;
      if (b.score !== a.score) return b.score - a.score;
      if (b.ratio !== a.ratio) return b.ratio - a.ratio;
      return a.entry.title.length - b.entry.title.length;
    });

    return results;
  }

  /* ---------- Отрисовка ---------- */
  function render() {
    var query = input.value.trim();
    var needClear = query.length > 0;

    if (clearBtn) clearBtn.hidden = !needClear;

    if (!query) {
      currentQuery = '';
      if (metaEl) metaEl.textContent = '';
      resultsEl.innerHTML = '';
      if (quickEl) quickEl.hidden = false;
      return;
    }

    if (quickEl) quickEl.hidden = true;

    var results = runSearch(query);

    if (metaEl) {
      metaEl.textContent = results.length
        ? 'Найдено: ' + results.length
        : 'Ничего не найдено';
    }

    if (!results.length) {
      var chips = [
        { text: 'Дварфы', href: './races/races-dvarfy.html' },
        { text: 'Альбани', href: './races/race-albany.html' },
        { text: 'Джа&#39;Илам', href: './faiths/faith-dzhailam.html' },
        { text: 'Черты', href: './player-book/feats.html' },
        { text: 'Кампания «Ушта-те»', href: './usta-te.html' },
        { text: 'Карта мира', href: './map.html' }
      ];
      var chipsHtml = chips
        .map(function (c) { return '<a href="' + c.href + '">' + c.text + '</a>'; })
        .join('');
      resultsEl.innerHTML =
        '<div class="wiki-search-empty">' +
          '<p>По запросу «' + esc(query) + '» ничего не нашлось.</p>' +
          '<p>Попробуй другое слово или загляни в популярные статьи:</p>' +
          '<div class="wiki-search-empty__chips">' + chipsHtml + '</div>' +
        '</div>';
      return;
    }

    var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    var html = '';

    for (var i = 0; i < Math.min(results.length, MAX_RESULTS); i++) {
      var r = results[i];
      var e = r.entry;

      var titleHtml = highlight(esc(e.title), terms);
      var leadHtml = e.lead
        ? highlight(esc(truncate(e.lead, LEAD_LIMIT)), terms)
        : '';

      html +=
        '<a class="wiki-search-item" href="' + esc(e.url) + '">' +
          '<span class="wiki-search-item__section">' + esc(e.section) + '</span>' +
          '<span class="wiki-search-item__title">' + titleHtml + '</span>' +
          (leadHtml ? '<span class="wiki-search-item__lead">' + leadHtml + '</span>' : '') +
        '</a>';
    }

    if (results.length > MAX_RESULTS) {
      html += '<p class="wiki-search-more">Показаны первые ' + MAX_RESULTS + ' из ' + results.length + ' результатов.</p>';
    }

    resultsEl.innerHTML = html;
  }

  /* ---------- События ---------- */
  var debounceTimer = null;
  function onInput() {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(function () {
      render();
      var q = input.value.trim();
      if (q !== currentQuery) {
        currentQuery = q;
        var url = new URL(window.location.href);
        if (q) url.searchParams.set('q', q);
        else url.searchParams.delete('q');
        history.replaceState(null, '', url.toString());
      }
    }, 120);
  }

  input.addEventListener('input', onInput);

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      input.value = '';
      input.focus();
      render();
      currentQuery = '';
      var url = new URL(window.location.href);
      url.searchParams.delete('q');
      history.replaceState(null, '', url.toString());
    });
  }

  document.getElementById('searchForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (debounceTimer) window.clearTimeout(debounceTimer);
    render();
  });

  document.addEventListener('keydown', function (e) {
    var quickKey = e.key === '/' || e.code === 'Slash' || e.keyCode === 191;
    if (quickKey && document.activeElement !== input && !/^(input|textarea)$/i.test(document.activeElement.tagName)) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });

  /* ---------- Старт: берём запрос из URL ---------- */
  var params = new URL(window.location.href).searchParams;
  var initial = (params.get('q') || '').trim();
  if (initial) {
    input.value = initial;
  }
  render();
})();