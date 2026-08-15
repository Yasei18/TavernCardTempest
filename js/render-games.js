/* Рендер карточек игр из GAMES.
   #gamesGrid без data-featured — полный каталог:
   основные игры в #gamesGrid, дополнения (поле base) — отдельным блоком #gamesExpansions.
   С data-featured="true" — только 4 избранных для главной. */
document.addEventListener('DOMContentLoaded', function () {
  var grid = document.getElementById('gamesGrid');
  if (!grid) return;

  var onlyFeatured = grid.hasAttribute('data-featured');
  var search = document.getElementById('gamesSearch');
  var filters = document.getElementById('gamesFilters');
  var empty = document.getElementById('gamesEmpty');
  var expWrap = document.getElementById('gamesExpansions');
  var expGrid = expWrap ? expWrap.querySelector('.games-exp-groups') : null;

  var playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.14v13.72L19 12z"/></svg>';

  var bySlug = {};
  GAMES.forEach(function (g) { bySlug[g.slug] = g; });

  var activeTags = [];

  function gameTags(game) {
    return game.tags || (game.tag ? [game.tag] : []);
  }

  function isExpansion(game) {
    return !!game.base;
  }

  // Дополнение наследует жанры базовой игры, чтобы фильтр «Военные»
  // находил и дополнения к военным играм.
  function effectiveTags(game) {
    var tags = gameTags(game).slice();
    if (game.base && bySlug[game.base]) {
      gameTags(bySlug[game.base]).forEach(function (t) {
        if (tags.indexOf(t) === -1) tags.push(t);
      });
    }
    return tags;
  }

  function matchesGenres(game) {
    var genres = activeTags;
    var tags = effectiveTags(game);
    for (var i = 0; i < genres.length; i++) {
      if (tags.indexOf(genres[i]) === -1) return false;
    }
    return true;
  }

  function pluralGames(n) {
    var mod10 = n % 10;
    var mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return n + ' игра';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return n + ' игры';
    return n + ' игр';
  }

  function cardHtml(game) {
    var cls = game.featured ? 'game-card game-featured' : 'game-card';
    var page = game.slug ? 'games/' + game.slug + '.html' : '';
    var rules = game.rules
      ? '<a class="game-rules" href="' + game.rules + '" target="_blank" rel="noopener">' + playIcon + 'Правила</a>'
      : '';
    var img = game.img
      ? '<a class="game-art-link" href="' + page + '"><img class="game-art" src="img/games/' + game.img + '" alt="' + game.title + '" loading="lazy"></a>'
      : '';
    var pills = gameTags(game).map(function (t) {
      return '<span class="game-tag">' + t + '</span>';
    }).join('');
    return '<div class="' + cls + '">' +
      img +
      (pills ? '<div class="game-tags">' + pills + '</div>' : '') +
      '<h3><a href="' + page + '">' + game.title + '</a></h3>' +
      '<p>' + game.desc + '</p>' +
      rules +
      '</div>';
  }

  // Группирует дополнения по базовой игре: блок с названием игры и списком ссылок.
  function expansionsHtml(list) {
    var groups = {};
    list.forEach(function (exp) {
      var key = exp.base || '';
      if (!groups[key]) groups[key] = [];
      groups[key].push(exp);
    });

    var html = '';
    Object.keys(groups).forEach(function (key) {
      var base = bySlug[key];
      if (!base) return;
      var items = groups[key].map(function (exp) {
        var page = exp.slug ? 'games/' + exp.slug + '.html' : '';
        return '<li class="games-exp-item"><a href="' + page + '">' + exp.title + '</a></li>';
      }).join('');
      html += '<div class="games-exp-group">' +
        '<h4 class="games-exp-base"><a href="games/' + base.slug + '.html">' + base.title + '</a></h4>' +
        '<ul class="games-exp-list">' + items + '</ul>' +
        '</div>';
    });
    return html;
  }

  function apply() {
    if (onlyFeatured) {
      var featured = GAMES.filter(function (g) { return g.featured && g.img; }).slice(0, 4);
      grid.innerHTML = featured.map(cardHtml).join('');
      if (empty) empty.hidden = featured.length > 0;
      return;
    }

    var q = search ? search.value.trim().toLowerCase() : '';

    function searchMatch(game) {
      if (!q) return true;
      var hay = (game.title + ' ' + effectiveTags(game).join(' ') + ' ' + (game.desc || '')).toLowerCase();
      return hay.indexOf(q) !== -1;
    }

    var bases = GAMES.filter(function (g) { return !isExpansion(g); });
    var exps = GAMES.filter(function (g) { return isExpansion(g); });

    // Основные игры: по фильтру жанров и поиску.
    var mainList = bases.filter(function (g) {
      return matchesGenres(g) && searchMatch(g);
    });

    // Дополнения: по жанрам базовой игры и поиску.
    var expList = exps.filter(function (g) {
      return matchesGenres(g) && searchMatch(g);
    });

    grid.innerHTML = mainList.map(cardHtml).join('');

    if (expWrap) {
      expGrid.innerHTML = expansionsHtml(expList);
      expWrap.hidden = expList.length === 0;
    }

    if (empty) {
      empty.hidden = mainList.length + expList.length > 0;
    }

    var counts = document.querySelectorAll('.js-game-count');
    for (var i = 0; i < counts.length; i++) {
      counts[i].textContent = pluralGames(GAMES.length);
    }
  }

  if (search) {
    search.addEventListener('input', apply);
    search.addEventListener('search', apply);
  }

  function refreshFilters() {
    if (!filters) return;
    var btns = filters.querySelectorAll('.games-filter');
    for (var i = 0; i < btns.length; i++) {
      var t = btns[i].getAttribute('data-tag') || '';
      btns[i].classList.toggle('is-active', t === '' ? activeTags.length === 0 : activeTags.indexOf(t) !== -1);
    }
  }

  // Мультивыбор: жанры можно сочетать, «Все» сбрасывает.
  if (filters) {
    var tags = [];
    GAMES.forEach(function (g) {
      gameTags(g).forEach(function (t) {
        if (tags.indexOf(t) === -1) tags.push(t);
      });
    });

    var html = '<button type="button" class="games-filter is-active" data-tag="">Все</button>';
    tags.forEach(function (t) {
      html += '<button type="button" class="games-filter" data-tag="' + t + '">' + t + '</button>';
    });
    filters.innerHTML = html;

    filters.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.games-filter') : null;
      if (!btn) return;
      var t = btn.getAttribute('data-tag') || '';
      if (t === '') {
        activeTags = [];
      } else {
        var i = activeTags.indexOf(t);
        if (i === -1) {
          activeTags.push(t);
        } else {
          activeTags.splice(i, 1);
        }
      }
      refreshFilters();
      apply();
    });
  }

  apply();

  // 3D-наклон карточек: картинка следует за курсором.
  function bindTilt(container) {
    if (!container) return;
    container.addEventListener('mouseover', function (e) {
      var el = e.target;
      if (el && el.classList && el.classList.contains('game-art')) el.classList.add('game-art-zoomed');
    });
    container.addEventListener('mouseout', function (e) {
      var el = e.target;
      if (el && el.classList && el.classList.contains('game-art')) el.classList.remove('game-art-zoomed');
    });
    container.addEventListener('mousemove', function (e) {
      var el = e.target;
      if (el && el.classList && el.classList.contains('game-art')) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--rx', ((py - 0.5) * 18).toFixed(2) + 'deg');
        el.style.setProperty('--ry', ((0.5 - px) * 18).toFixed(2) + 'deg');
      }
    });
  }

  bindTilt(grid);
  bindTilt(expGrid);
});
