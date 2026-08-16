/* Шаблон страницы расы/верования.
   Читает slug из URL, находит данные в RACES/FAITHS,
   рендерит хлебные крошки, заголовок, теги, арт, аннотацию, тело и нижнюю навигацию. */
(function () {
  var container = document.querySelector('.wiki-container');
  var content = document.getElementById('raceContent');
  if (!container || !content) return;

  var path = location.pathname.split('/').pop() || '';
  var slug = path.replace(/\.html?$/i, '');

  var isRace = /\/races\//.test(location.pathname);
  var pages = isRace
    ? (typeof RACES !== 'undefined' ? RACES : [])
    : (typeof FAITHS !== 'undefined' ? FAITHS : []);

  var page = null;
  for (var i = 0; i < pages.length; i++) {
    if (pages[i].slug === slug) { page = pages[i]; break; }
  }

  if (!page) return;

  function esc(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s || ''));
    return d.innerHTML;
  }

  function insertBefore(html) {
    var temp = document.createElement('div');
    temp.innerHTML = html;
    while (temp.firstChild) container.insertBefore(temp.firstChild, content);
  }

  function appendAfter(html) {
    var temp = document.createElement('div');
    temp.innerHTML = html;
    while (temp.firstChild) container.appendChild(temp.firstChild);
  }

  /* --- Хлебные крошки --- */
  var crumbs = '<nav class="crumbs">';
  for (var i = 0; i < page.breadcrumbs.length; i++) {
    var c = page.breadcrumbs[i];
    if (i > 0) crumbs += ' / ';
    crumbs += c.href
      ? '<a href="' + c.href + '">' + esc(c.label) + '</a>'
      : '<span>' + esc(c.label) + '</span>';
  }
  crumbs += '</nav>';

  /* --- Заголовок --- */
  var header = '<div class="race-page__header"><h1>' + esc(page.title) + '</h1>';
  if (page.titleEn) header += '<div class="race-title-en">' + esc(page.titleEn) + '</div>';
  header += '</div>';

  /* --- Теги --- */
  var tags = '<div class="race-tags">';
  for (var i = 0; i < page.tags.length; i++) {
    var t = page.tags[i];
    tags += t.region
      ? '<span class="tag tag-region--' + t.region + '">' + esc(t.label) + '</span>'
      : '<span class="tag tag-type">' + esc(t.label) + '</span>';
  }
  tags += '</div>';

  /* --- Арт (опционально) --- */
  var art = '';
  if (page.art) {
    art = '<figure class="race-art">' +
      '<a class="js-art-open" href="' + page.art.href + '">' +
      '<img src="' + page.art.src + '" alt="' + esc(page.art.alt) + '"></a>' +
      '<figcaption>' + esc(page.art.caption) + '</figcaption></figure>';
  }

  /* --- Аннотация --- */
  var summary = '<div class="race-summary">' + esc(page.summary) + '</div>';

  /* --- Вставка до контента --- */
  insertBefore(crumbs + header + tags + art + summary);

  /* --- Тело статьи (из данных) --- */
  if (page.body) {
    content.innerHTML = page.body;
  }

  /* --- Нижняя навигация (после контента) --- */
  var nav = '<nav class="wiki-nav-more">';
  for (var i = 0; i < page.bottomNav.length; i++) {
    var n = page.bottomNav[i];
    nav += '<a href="' + n.href + '">' + esc(n.label) + '</a>';
  }
  nav += '</nav>';
  appendAfter(nav);
})();
