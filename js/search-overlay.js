/* Глобальный поиск-оверлей для всего сайта Таверны «Карточная Буря».
   Индекс WIKI_SEARCH_INDEX подгружается скриптом wiki/js/search-data.js
   (подключается из layout.js до этого скрипта). Виджет открывается:
   — кликом по ссылке с атрибутом data-search-open (кнопка «Поиск» в шапках);
   — горячей клавишей «/».
   Самостоятельно инъектит себе стили, поэтому работает на любом макете. */
(function () {
  'use strict';

  var INDEX = typeof WIKI_SEARCH_INDEX !== 'undefined' ? WIKI_SEARCH_INDEX : [];
  var PREFIX = window.SITE_SEARCH_DIR || '';

  var MAX_RESULTS = 20;
  var LEAD_LIMIT = 220;

  /* ---------- Стили ---------- */
  var styles =
    '<style id="site-search-styles">' +
      '.site-search{display:none;position:fixed;inset:0;z-index:100000;font-family:\'Segoe UI\',Tahoma,sans-serif;}' +
      '.site-search.is-open{display:block;}' +
      '.site-search__backdrop{position:absolute;inset:0;background:rgba(10,16,40,.45);' +
        '-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);}' +
      '.site-search__panel{position:absolute;left:50%;top:12vh;transform:translateX(-50%);' +
        'width:min(620px,calc(100vw - 24px));background:#fff;border:1px solid #c8ccd1;' +
        'border-radius:10px;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden;}' +
      '.site-search__head{display:flex;align-items:center;gap:8px;border-bottom:1px solid #e5e5e5;padding-right:8px;}' +
      '.site-search__icon{display:flex;align-items:center;justify-content:center;padding-left:16px;flex:0 0 auto;}' +
      '.site-search__icon svg{width:21px;height:21px;fill:#72777d;}' +
      '.site-search__input{flex:1 1 auto;min-width:0;border:none;outline:none;background:transparent;' +
        'padding:16px 8px;font-family:inherit;font-size:18px;color:#0c0c0c;}' +
      '.site-search__input::placeholder{color:#a2a9b1;}' +
      '.site-search__close{flex:0 0 auto;width:34px;height:34px;border:none;border-radius:50%;' +
        'background:#eef1f8;color:#555;font-size:20px;line-height:1;cursor:pointer;transition:background .15s,color .15s;}' +
      '.site-search__close:hover{background:#1c2c7c;color:#fff;}' +
      '.site-search__body{max-height:62vh;overflow:auto;padding:6px 14px 16px;}' +
      '.site-search__meta{min-height:20px;margin:6px 0 2px;font-size:14px;color:#555;}' +
      '.site-search__hint{font-size:14px;color:#72777d;padding:4px 2px 6px;line-height:1.5;}' +
      '.site-search__results{display:flex;flex-direction:column;gap:8px;}' +
      '.site-search__item{display:block;padding:12px 14px;border:1px solid #d5dae6;border-left:4px solid #d5dae6;' +
        'border-radius:8px;background:#fbfcfe;text-decoration:none;transition:box-shadow .15s,border-color .15s;}' +
      '.site-search__item:hover{border-left-color:#1c2c7c;box-shadow:0 4px 14px rgba(3,9,41,.1);}' +
      '.site-search__item__section{display:block;margin-bottom:4px;font-size:12px;letter-spacing:.04em;' +
        'text-transform:uppercase;color:#72777d;}' +
      '.site-search__item__title{display:block;font-family:Georgia,\'Times New Roman\',serif;font-size:18px;' +
        'line-height:1.35;color:#1c2c7c;margin-bottom:4px;}' +
      '.site-search__item__lead{display:block;font-size:14px;line-height:1.5;color:#3c4043;}' +
      '.site-search__item mark{background:#ffe58a;color:#111;padding:0 2px;border-radius:2px;}' +
      '.site-search__empty{padding:16px;border:1px dashed #d5dae6;border-radius:8px;background:#fbfcfe;' +
        'color:#555;font-size:15px;line-height:1.55;}' +
      '@media (max-width:640px){.site-search__panel{top:6vh;}' +
        '.site-search__body{max-height:78vh;padding:4px 10px 12px;}}' +
    '</style>';
  if (!document.getElementById('site-search-styles')) {
    document.head.insertAdjacentHTML('beforeend', styles);
  }

  /* ---------- DOM ---------- */
  var overlay = document.createElement('div');
  overlay.className = 'site-search';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML =
    '<div class="site-search__backdrop" data-search-close></div>' +
    '<div class="site-search__panel" role="dialog" aria-modal="true" aria-label="Поиск по сайту">' +
      '<div class="site-search__head">' +
        '<span class="site-search__icon" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" focusable="false"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>' +
        '</span>' +
        '<input class="site-search__input" type="search" placeholder="Найди в мире Орвей: раздел, расу, место, правило…"' +
          'autocomplete="off" spellcheck="false">' +
        '<button class="site-search__close" type="button" data-search-close aria-label="Закрыть">×</button>' +
      '</div>' +
      '<div class="site-search__body">' +
        '<p class="site-search__meta" role="status"></p>' +
        '<div class="site-search__hint">Ищи по-русски или по-английски, например, «дварфы», «Пятеро» или «Кехабат». ' +
          'Клавиша Esc закрывает окно, «/» — открывает поиск с любой страницы.</div>' +
        '<div class="site-search__results"></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  var input = overlay.querySelector('.site-search__input');
  var metaEl = overlay.querySelector('.site-search__meta');
  var hintEl = overlay.querySelector('.site-search__hint');
  var resultsEl = overlay.querySelector('.site-search__results');

  var cached = [];
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

      if (title.indexOf(w) !== -1) { total += 5; found = true; }
      if (entry.keywords.indexOf(w) !== -1) { total += 4; found = true; }
      if (entry.headings.indexOf(w) !== -1) { total += 2; found = true; }
      if (lead.indexOf(w) !== -1 || entry.section.toLowerCase().indexOf(w) !== -1) {
        total += 1; found = true;
      }
      if (found) matchedWords++;
    }

    return { score: total, matched: matchedWords };
  }

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

    if (!query) {
      metaEl.textContent = '';
      resultsEl.innerHTML = '';
      hintEl.style.display = '';
      return;
    }

    hintEl.style.display = 'none';

    var results = runSearch(query);
    metaEl.textContent = results.length
      ? 'Найдено: ' + results.length
      : 'Ничего не найдено';

    if (!results.length) {
      resultsEl.innerHTML =
        '<div class="site-search__empty">По запросу «' + esc(query) + '» ничего не нашлось. ' +
        'Попробуй другое слово, например, <em>дварфы</em>, <em>Кехабат</em> или <em>черты</em>.</div>';
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
        '<a class="site-search__item" href="' + esc(PREFIX + e.url) + '">' +
          '<span class="site-search__item__section">' + esc(e.section) + '</span>' +
          '<span class="site-search__item__title">' + titleHtml + '</span>' +
          (leadHtml ? '<span class="site-search__item__lead">' + leadHtml + '</span>' : '') +
        '</a>';
    }

    if (results.length > MAX_RESULTS) {
      html += '<p class="site-search__empty" style="border-style:solid;text-align:center;color:#72777d;font-size:14px;">' +
        'Показаны первые ' + MAX_RESULTS + ' из ' + results.length + ' результатов.</p>';
    }

    resultsEl.innerHTML = html;
  }

  /* ---------- Открытие/закрытие ---------- */
  function open() {
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.querySelectorAll('[data-search-open]').forEach(function (el) {
      el.setAttribute('aria-expanded', 'true');
    });
    input.focus();
    input.select();
  }

  function close() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.querySelectorAll('[data-search-open]').forEach(function (el) {
      el.setAttribute('aria-expanded', 'false');
    });
  }

  /* ---------- События ---------- */
  var debounceTimer = null;
  input.addEventListener('input', function () {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(render, 120);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var first = resultsEl.querySelector('a');
      if (first) window.location.href = first.getAttribute('href');
    }
  });

  overlay.addEventListener('click', function (e) {
    var target = e.target;
    if (target.closest && target.closest('[data-search-close]')) {
      close();
    } else if (target.closest && target.closest('.site-search__item')) {
      close(); /* ссылка кликнется сама */
    }
  });

  resultsEl.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a') : null;
    if (link) close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
      e.preventDefault();
      close();
      /* возвращаем фокус на триггер, если он есть */
      var opener = document.querySelector('[data-search-open][aria-expanded="true"]');
      if (opener) opener.focus();
      return;
    }
    var quickSearch = e.key === '/' || e.code === 'Slash' || e.keyCode === 191;
    if (quickSearch &&
        !overlay.classList.contains('is-open') &&
        !/^(input|textarea|select)$/i.test(document.activeElement.tagName)) {
      /* если на странице есть собственный поиск — фокусируем его,
         а не открываем глобальный оверлей (например, главная вики) */
      var pageSearch = document.getElementById('searchInput');
      if (pageSearch) {
        e.preventDefault();
        pageSearch.focus();
        pageSearch.select();
        return;
      }
      e.preventDefault();
      open();
    }
  });

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest ? e.target.closest('[data-search-open]') : null;
    if (trigger) {
      e.preventDefault();
      open();
    }
  });

  /* ---------- Кнопка «Поиск» в шапке не должна подсвечиваться как активная
     на странице поиска — обрабатывается отдельно ниже: просто показываем виджет. */
})();