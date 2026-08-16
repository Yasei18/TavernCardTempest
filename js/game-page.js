/* Единый шаблон страницы игры.
   Читает slug из текущего URL (games/dnd.html → dnd),
   находит игру в GAMES и рендерит содержимое в #gamePage. */
(function () {
  var grid = document.getElementById('gamePage');
  if (!grid) return;

  var path = location.pathname.split('/').pop() || '';
  var slug = path.replace(/\.html?$/i, '');

  var bySlug = {};
  GAMES.forEach(function (g) { bySlug[g.slug] = g; });

  var game = bySlug[slug];
  if (!game) {
    grid.innerHTML = '<section class="section"><div class="container container-narrow">' +
      '<div class="section-head"><span class="ornament">⚠</span><h1>Игра не найдена</h1>' +
      '<p class="section-note">Такой игры нет в каталоге Таверны.</p></div>' +
      '<p class="catalog-footnote"><a class="btn btn-ghost" href="../games.html">Все игры Таверны</a></p>' +
      '</div></section>';
    return;
  }

  var root = document.body.getAttribute('data-root') || '../';
  var playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.14v13.72L19 12z"/></svg>';

  // --- Hero ---
  var imgHtml = game.img
    ? '<img class="game-page-art" src="' + root + 'img/games/' + game.img + '" alt="' + esc(game.title) + '" loading="lazy">'
    : '';
  var longDesc = game.longdesc || game.desc;

  var html = '<section class="catalog-hero"><div class="container">' +
    '<p class="back-link"><a href="' + root + 'games.html">← Вернуться к каталогу игр</a></p>' +
    '<div class="game-page">' +
    imgHtml +
    '<div class="game-page-info">' +
    '<h1>' + esc(game.title) + '</h1>' +
    '<p class="game-page-desc">' + esc(longDesc) + '</p>' +
    '</div></div></div></section>';

  // --- Rules ---
  var rulesBlocks = '';

  if (game.rules) {
    rulesBlocks += '<div class="rules-block">' +
      '<h3 class="rules-title">Видео-правила</h3>' +
      '<p class="rules-link"><a class="btn btn-ghost" href="' + game.rules + '" target="_blank" rel="noopener">' + playIcon + 'Смотреть правила на YouTube</a></p>' +
      '</div>';
  }

  if (game.pdf) {
    rulesBlocks += '<div class="rules-block">' +
      '<h3 class="rules-title">Правила в PDF</h3>' +
      '<iframe class="rules-pdf" src="' + game.pdf + '" title="Правила: ' + esc(game.title) + ' (PDF)"></iframe>' +
      '<p class="rules-link"><a class="btn btn-gold" href="' + game.pdf + '" target="_blank" rel="noopener" download>Скачать правила (PDF)</a></p>' +
      '</div>';
  }

  if (rulesBlocks) {
    var sourceNote = '';
    if (game.source && game.sourceUrl) {
      sourceNote = '<p class="games-footnote">Источник правил: <a href="' + game.sourceUrl + '" target="_blank" rel="noopener">' + esc(game.source) + '</a></p>';
    }

    html += '<section class="section section-dark"><div class="container container-narrow">' +
      '<div class="section-head">' +
      '<span class="ornament">🎲</span>' +
      '<h2>Правила игры</h2>' +
      '<p class="section-note">Посмотрите видео и почитайте PDF — и можно за стол!</p>' +
      '</div>' +
      rulesBlocks +
      sourceNote +
      '<p class="catalog-footnote"><a class="btn btn-ghost" href="' + root + 'games.html">Все игры Таверны</a></p>' +
      '</div></section>';
  }

  // --- Expansions ---
  var exps = GAMES.filter(function (g) { return g.base === slug; });
  if (exps.length) {
    var cards = exps.map(function (exp) {
      return '<div class="game-card">' +
        '<h3><a href="' + root + 'games/' + exp.slug + '.html">' + esc(exp.title) + '</a></h3>' +
        '<p>' + exp.desc + '</p>' +
        '<a class="game-rules" href="' + root + 'games/' + exp.slug + '.html">Страница дополнения</a>' +
        '</div>';
    }).join('');

    html += '<section class="section section-dark"><div class="container">' +
      '<div class="section-head">' +
      '<span class="ornament">🧩</span>' +
      '<h2>Дополнения</h2>' +
      '<p class="section-note">Расширения из коллекции Таверны:</p>' +
      '</div>' +
      '<div class="games-grid">' + cards + '</div>' +
      '<p class="catalog-footnote"><a class="btn btn-ghost" href="' + root + 'games.html">Все игры Таверны</a></p>' +
      '</div></section>';
  }

  grid.innerHTML = html;

  function esc(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }
})();
