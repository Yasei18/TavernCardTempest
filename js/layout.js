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

  function link(href, label, cls) {
    return '<a class="' + (cls || '') + '" href="' + root + href + '">' + label + '</a>';
  }

  var HEADERS = {
    tavern: [
      '<header class="site-header">',
      '  <nav class="nav">',
      '    <a class="nav-logo" href="' + root + 'index.html">',
      '      <img src="' + root + 'img/gerb-small.jpg" alt="Герб Таверны «Карточная Буря»" width="42" height="42">',
      '      <span>Карточная Буря</span>',
      '    </a>',
      '    <button class="nav-toggle" id="navToggle" aria-label="Открыть меню" aria-controls="nav-links" aria-expanded="false">',
      '      <span></span><span></span><span></span>',
      '    </button>',
      '    <ul class="nav-links" id="nav-links">',
      '      <li>' + link('index.html#about', 'О нас') + '</li>',
      '      <li>' + link('games.html', 'Коллекция') + '</li>',
      '      <li>' + link('index.html#events', 'Сходки') + '</li>',
      '      <li>' + link('otgoloski.html', 'Отголоски Бури') + '</li>',
      '      <li>' + link('wiki/wiki.html', 'Орвей') + '</li>',
      '      <li>' + link('index.html#team', 'Администрация') + '</li>',
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
      '      ' + link('wiki.html', 'Главная', 'nav__btn'),
      '      <div class="dropdown">',
      '        <div class="box-wrap">',
      '          <button class="dropbtn" type="button">Регионы</button>',
      '          <div class="box">',
      '            <div class="dropdown-content">',
      '              ' + link('alvaera.html', 'Аль\'Ваэра') + '',
      '              ' + link('kaladan.html', 'Каладан') + '',
      '              ' + link('zadubravye.html', 'Задубравье') + '',
      '              ' + link('snezhnaya-pustosh.html', 'Снежная Пустошь') + '',
      '              <span>Степной Пояс</span>',
      '            </div>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      ' + link('races.html', 'Виды', 'nav__link') + '',
      '      ' + link('map.html', 'Карта', 'nav__link') + '',
      '      <div class="dropdown">',
      '        <div class="box-wrap">',
      '          <button class="dropbtn" type="button">Верования</button>',
      '          <div class="box">',
      '            <div class="dropdown-content">',
      '              ' + link('faiths/faith-pyatero.html', 'Пятеро') + '',
      '              ' + link('faiths/faith-siyanie.html', 'Сияние') + '',
      '              ' + link('faiths/faith-dzhailam.html', 'Джа\'Илам') + '',
      '              ' + link('faiths/faith-staraya-vera-alvaera.html', 'Пантеон Аль\'Ваэры') + '',
      '              ' + link('faiths/faith-staraya-vera-zadubravye.html', 'Пантеон Задубравья') + '',
      '            </div>',
      '          </div>',
      '        </div>',
      '      </div>',
      '      ' + link('../index.html', 'В таверну', 'nav__link') + '',
      '    </nav>',
      '  </div>',
      '  <div class="create-line-header"></div>',
      '</header>'
    ].join('\n')
  };

  var FOOTERS = {
    tavern: [
      '<footer class="site-footer">',
      '  <img class="footer-emblem" src="' + root + 'img/gerb-small.jpg" alt="Герб Таверны" width="74" height="74">',
      '  <p class="footer-title">Таверна «Карточная Буря»</p>',
      '  <p class="footer-quote">«Будь как дома, путник!»</p>',
      '  <p class="footer-copy">© <span class="js-year"></span> Таверна «Карточная Буря» · Двери открыты для всякого путника</p>',
      '  <p class="footer-copy"><a href="#top">Вернуться наверх ↑</a></p>',
      '</footer>'
    ].join('\n'),

    wiki: [
      '<div class="wiki-footer">',
      '  <div class="copyright"><span>© <span class="js-year"></span> Таверна «Карточная Буря» · Двери открыты для всякого путника</span><br><span><a href="#header">Вернуться наверх ↑</a></span></div>',
      '</div>'
    ].join('\n'),

    'wiki-home': [
      '<footer class="footer">',
      '  <div class="container">',
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
