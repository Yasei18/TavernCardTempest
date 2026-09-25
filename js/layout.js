/* Общие шапка и подвал для всех страниц сайта.
   Страница подключает скрипт в <head> с атрибутом defer и задаёт на <body>:
     data-layout="tavern" | data-layout="wiki"  — макет шапки/подвала
     data-root="..."                              — префикс относительных путей ("" для корня,
                                                   "../" для страниц в games/, wiki/races/, wiki/faiths/)
     data-footer="none"                           — не выводить подвал (например, интерактивная карта)
   Скрипт вставляет шапку в начало <body>, а подвал и кнопку «наверх» — в конец.
   Активный пункт меню подсвечивается автоматически по текущей странице. */
(function () {
  'use strict';

  var body = document.body;
  if (!body) return;

  var layout = body.getAttribute('data-layout') || 'tavern';
  var root = body.getAttribute('data-root') || '';

  /* На главной вики кнопка «Главная» в шапке не нужна — это и есть эта страница. */
  var isWikiHome = (location.pathname.split('/').pop() || '').toLowerCase() === 'wiki.html';

  /* На главной книги игрока кнопка «Книга игрока» не нужна — это и есть эта страница.
     В разделах внутри книги (player-book/*.html) она остаётся. */
  var isBookHome = (location.pathname.split('/').pop() || '').toLowerCase() === 'player-book.html';

  function link(href, label, cls) {
    return '<a class="' + (cls || '') + '" href="' + root + href + '">' + label + '</a>';
  }

  /* Компактные иконки для шапки вики (заливка наследует цвет ссылки). */
  var SVG_SEARCH = '<svg viewBox="0 0 24 24" width="33" height="33" fill="currentColor" aria-hidden="true">' +
    '<path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>';
  var SVG_HOME = '<svg viewBox="0 0 24 24" width="33" height="33" fill="currentColor" aria-hidden="true">' +
    '<path d="M12 3L2 12h3v8h6v-5h2v5h6v-8h3L12 3z"/></svg>';

  var HEADERS = {
    tavern: [
      '<header class="site-header">',
      '  <nav class="nav">',
      '    <a class="nav-logo" href="' + root + 'index.html">',
      '      <img src="' + root + 'img/gerb-small.webp" alt="Герб Таверны «Карточная Буря»" width="42" height="42">',
      '      <span>Карточная Буря</span>',
      '    </a>',
      '    <button class="nav-toggle" id="navToggle" aria-label="Открыть меню" aria-controls="nav-links" aria-expanded="false">',
      '      <span></span><span></span><span></span>',
      '    </button>',
      '    <ul class="nav-links" id="nav-links">',
      '      <li>' + link('games.html', 'Коллекция') + '</li>',
      '      <li>' + link('index.html#events', 'Сходки') + '</li>',
      '      <li>' + link('index.html#schedule', 'Расписание') + '</li>',
      '      <li>' + link('index.html#newcomers', 'Новичкам') + '</li>',
'      <li>' + link('otgoloski.html', 'Отголоски Бури') + '</li>',
    '      <li>' + link('wiki/wiki.html', 'Орвей') + '</li>',
    '      <li>' + link('index.html#team', 'Команда') + '</li>',
      '      <li>' + link('index.html#contacts', 'Где нас найти') + '</li>',
      '    </ul>',
      '  </nav>',
      '</header>'
    ].join('\n'),

    wiki: [
      '<header class="header" id="header">',
      '  <div class="header__container">',
      '    <button class="nav-toggle" id="navToggle" aria-label="Открыть меню" aria-controls="nav" aria-expanded="false">',
      '      <span></span><span></span><span></span>',
      '    </button>',
'    <nav class="nav" id="nav">',
    '      ' + (isWikiHome ? '' : link('wiki.html', 'Главная', 'nav__btn')),
    '      ' + (isBookHome ? '' : link('player-book.html', 'Книга игрока', 'nav__btn')) + '',
'      ' + link('map.html', 'Карта', 'nav__link') + '',
    '      <div class="dropdown">',
      '        <div class="box-wrap">',
      '          <button class="dropbtn" type="button">Игры</button>',
      '          <div class="box">',
      '            <div class="dropdown-content">',
      '              ' + link('campaigns.html', 'Кампании') + '',
      '              ' + link('oneshots.html', 'Ваншоты') + '',
      '            </div>',
      '          </div>',
      '        </div>',
'      </div>',
    '      <a class="nav__link nav__icon" href="' + root + 'search.html" data-search-open aria-label="Поиск" title="Поиск">' + SVG_SEARCH + '</a>',
    '      <a class="nav__link nav__icon" href="' + root + '../index.html" aria-label="В таверну" title="В таверну">' + SVG_HOME + '</a>',
    '    </nav>',
      '  </div>',
      '  <div class="create-line-header"></div>',
      '</header>'
    ].join('\n')
  };

  var footerSocials = [
    '<div class="footer-socials">',
    '  <a href="https://t.me/tavern_card_tempest" target="_blank" rel="noopener">Telegram</a><span class="footer-social-sep">·</span>',
    '  <a href="https://t.me/TavernCardTempest_Chat" target="_blank" rel="noopener">Шумный Зал</a><span class="footer-social-sep">·</span>',
    '  <a href="https://www.youtube.com/@CardTempestTavern" target="_blank" rel="noopener">YouTube</a><span class="footer-social-sep">·</span>',
    '  <a href="https://vk.com/taverncardtempest" target="_blank" rel="noopener">ВКонтакте</a><span class="footer-social-sep">·</span>',
    '  <a href="https://discord.gg/AAMw8UJCj5" target="_blank" rel="noopener">Discord</a><span class="footer-social-sep">·</span>',
    '  <a href="https://boosty.to/taverncardtempest" target="_blank" rel="noopener">Boosty</a>',
    '</div>'
  ].join('\n');

  var FOOTERS = {
    tavern: [
      '<footer class="site-footer">',
      '  <img class="footer-emblem" src="' + root + 'img/gerb-small.webp" alt="Герб Таверны" width="74" height="74">',
      '  <p class="footer-title">Таверна «Карточная Буря»</p>',
      '  <p class="footer-quote">«Будь как дома, путник!»</p>',
      '  ' + footerSocials,
      '  <p class="footer-copy">© <span class="js-year"></span> Таверна «Карточная Буря» · Двери открыты для всякого путника</p>',
      '  <p class="footer-copy"><a href="#top">Вернуться наверх ↑</a></p>',
      '</footer>'
    ].join('\n'),

    wiki: [
      '<div class="wiki-footer">',
      '  ' + footerSocials,
      '  <div class="copyright"><span>© <span class="js-year"></span> Таверна «Карточная Буря» · Двери открыты для всякого путника</span><br><span><a href="#header">Вернуться наверх ↑</a></span></div>',
      '</div>'
    ].join('\n'),

    'wiki-home': [
      '<footer class="footer">',
      '  <div class="container">',
      '    ' + footerSocials,
      '  </div> <!--/.footer__inner-->',
      '  <div class="copyright">',
      '    <span>© <span class="js-year"></span> Таверна «Карточная Буря» · Двери открыты для всякого путника</span><br>',
      '    <span><a href="#header">Вернуться наверх ↑</a></span>',
      '  </div>',
      '</footer>'
    ].join('\n')
  };

  var footerKey = body.getAttribute('data-footer') || layout;
  if (footerKey === 'wiki-home') footerKey = 'wiki-home';

  var backTop = [
    '<button class="back-top" id="backTop" type="button" aria-label="Вернуться наверх" title="Наверх">',
    '  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    '</button>'
  ].join('\n');

  var headerHtml = HEADERS[layout];
  var footerHtml = footerKey === 'none'
    ? ''
    : (FOOTERS[footerKey] || FOOTERS[layout] || '') + '\n' + backTop;

  if (headerHtml) {
    body.insertAdjacentHTML('afterbegin', headerHtml);
  }
  if (footerHtml) {
    body.insertAdjacentHTML('beforeend', footerHtml);
  }

  /* Глобальный поиск-оверлей: работает только в части сайта про мир Орвей (layout «wiki»).
   Индекс вики живёт в wiki/js/search-data.js, а оверлей открывается кнопкой
   [data-search-open] в шапке или горячей клавишей «/». */
  if (layout === 'wiki') {
    var searchDataSrc = root + 'js/search-data.js';
    var overlaySrc = '../' + root + 'js/search-overlay.js';

    /* Каталог с материалами вики относительно текущей страницы — нужен, чтобы
       ссылки в результатах поиска вели на правильные страницы. */
    window.SITE_SEARCH_DIR = (searchDataSrc.replace(/[^/]*$/, '')).replace(/js\/$/, '');

    /* Сначала подгружаем данные поиска, затем сам виджет. */
    var siteSearchData = document.createElement('script');
    siteSearchData.src = searchDataSrc;
    siteSearchData.onload = function () {
      var siteSearchOverlay = document.createElement('script');
      siteSearchOverlay.src = overlaySrc;
      document.head.appendChild(siteSearchOverlay);
    };
    document.head.appendChild(siteSearchData);
  }

  /* UX для новичков (только макет «таверна»):
     — закреплённая снизу кнопка «Записаться на сходку» на мобильных;
     — баннер «Впервые у нас?» с подсказкой для первого визита (показывается один раз). */
  if (layout === 'tavern') {
    var page = location.pathname.split('/').pop() || 'index.html';
    if (page !== 'booking.html') {
      var sticky = document.createElement('a');
      sticky.className = 'cta-sticky';
      sticky.href = root + 'booking.html';
      sticky.textContent = 'Записаться на сходку';
      body.appendChild(sticky);

      /* На мобильных не показываем кнопку, пока на экране есть hero с соц-ссылками
         (чтобы не перекрывать их), и показываем при прокрутке вниз. */
      var heroEl = document.querySelector('.hero');
      if (heroEl && 'IntersectionObserver' in window) {
        var ctaObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            sticky.classList.toggle('cta-sticky-hidden', entry.isIntersecting && entry.intersectionRatio > 0.1);
          });
        }, { threshold: 0.1 });
        ctaObserver.observe(heroEl);
      } else if (!heroEl || !('IntersectionObserver' in window)) {
        sticky.classList.remove('cta-sticky-hidden');
      }

      /* В самом низу страницы также прячем кнопку, чтобы не перекрывала подвал. */
      var updateStickyOnScroll = function () {
        var nearEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120;
        sticky.classList.toggle('cta-sticky-hidden', nearEnd);
      };
      updateStickyOnScroll();
      window.addEventListener('scroll', updateStickyOnScroll, { passive: true });
      window.addEventListener('resize', updateStickyOnScroll);

      try {
        if (!localStorage.getItem('tct_banner_newcomer')) {
          var banner = document.createElement('aside');
          banner.className = 'newcomer-banner';
          banner.setAttribute('role', 'complementary');
          banner.innerHTML =
            '<a class="newcomer-banner-link" href="' + root + 'index.html#newcomers">Впервые у нас?' +
            '<span class="newcomer-banner-hint">нажми на меня</span>' +
            '</a>' +
            '<button type="button" class="newcomer-banner-close" aria-label="Скрыть подсказку">×</button>';
          banner.addEventListener('click', function (e) {
            if (e.target && e.target.classList.contains('newcomer-banner-close')) {
              try { localStorage.setItem('tct_banner_newcomer', '1'); } catch (err) { /* пусто */ }
              banner.remove();
            }
            if (e.target && e.target.classList.contains('newcomer-banner-link')) {
              try { localStorage.setItem('tct_banner_newcomer', '1'); } catch (err) { /* пусто */ }
            }
          });
          body.insertBefore(banner, body.firstChild);
        }
      } catch (e) {
        /* localStorage недоступен — просто не показываем баннер */
      }
    }
  }

  // Подсветка активного пункта меню по текущей странице.
  // Ссылки с якорем (#) не считаем активными — они ведут на разделы одной страницы.
  var currentFile = location.pathname.split('/').pop();
  var header = body.querySelector('header, .site-header');
  if (header) {
    header.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href.indexOf('#') !== -1 || href.indexOf('?') !== -1) return;
      var file = href.split('/').pop();
      if (file && file === currentFile) {
        a.classList.add('active');
        if (a.classList.contains('nav__link') || a.classList.contains('nav__btn')) {
          a.setAttribute('aria-current', 'page');
        }
      }
    });
  }
})();
