/* Рендер карточек игр из GAMES.
   #gamesGrid без data-featured — полный каталог с поиском и фильтром по жанру,
   с data-featured="true" — только 4 избранных для главной. */
document.addEventListener('DOMContentLoaded', function () {
  var grid = document.getElementById('gamesGrid');
  if (!grid) return;

  var onlyFeatured = grid.hasAttribute('data-featured');
  var search = document.getElementById('gamesSearch');
  var filters = document.getElementById('gamesFilters');
  var empty = document.getElementById('gamesEmpty');

  var playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.14v13.72L19 12z"/></svg>';

  function gameTags(game) {
    return game.tags || (game.tag ? [game.tag] : []);
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

  function apply() {
    var list;
    if (onlyFeatured) {
      list = GAMES.filter(function (g) { return g.featured && g.img; }).slice(0, 4);
    } else {
      list = GAMES.slice();
      var q = search ? search.value.trim().toLowerCase() : '';
      var tag = filters ? filters.getAttribute('data-active-tag') : '';
      if (q || tag) {
        list = list.filter(function (g) {
          var gtags = gameTags(g);
          if (tag && gtags.indexOf(tag) === -1) return false;
          if (q) {
            var hay = (g.title + ' ' + gtags.join(' ') + ' ' + (g.desc || '')).toLowerCase();
            if (hay.indexOf(q) === -1) return false;
          }
          return true;
        });
      }
    }
    grid.innerHTML = list.map(cardHtml).join('');
    if (empty) empty.hidden = list.length > 0;
  }

  /* Фильтр по жанрам — только в каталоге */
  if (filters) {
    var tags = [];
    GAMES.forEach(function (g) {
      gameTags(g).forEach(function (t) {
        if (tags.indexOf(t) === -1) tags.push(t);
      });
    });
    var pillHtml = '<button type="button" class="games-filter is-active" data-tag="">Все</button>';
    tags.forEach(function (t) {
      pillHtml += '<button type="button" class="games-filter" data-tag="' + t + '">' + t + '</button>';
    });
    filters.innerHTML = pillHtml;
    filters.setAttribute('data-active-tag', '');

    filters.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.games-filter') : null;
      if (!btn) return;
      filters.setAttribute('data-active-tag', btn.getAttribute('data-tag') || '');
      var btns = filters.querySelectorAll('.games-filter');
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle('is-active', btns[i] === btn);
      }
      apply();
    });
  }

  if (search) {
    search.addEventListener('input', apply);
    search.addEventListener('search', apply);
  }

  apply();

  function pluralGames(n) {
    var n10 = n % 10;
    var n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return n + ' игра';
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return n + ' игры';
    return n + ' игр';
  }

  var counts = document.querySelectorAll('.js-game-count');
  for (var i = 0; i < counts.length; i++) {
    counts[i].textContent = pluralGames(GAMES.length);
  }

  /* 3D-наклон: при наведении картинка «вылетает» из карточки и следует за курсором. */
  grid.addEventListener('mouseover', function (e) {
    var el = e.target;
    if (el && el.classList && el.classList.contains('game-art')) {
      el.classList.add('game-art-zoomed');
    }
  });

  grid.addEventListener('mouseout', function (e) {
    var el = e.target;
    if (el && el.classList && el.classList.contains('game-art')) {
      el.classList.remove('game-art-zoomed');
    }
  });

  grid.addEventListener('mousemove', function (e) {
    var el = e.target;
    if (el && el.classList && el.classList.contains('game-art')) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--rx', ((py - 0.5) * 18).toFixed(2) + 'deg');
      el.style.setProperty('--ry', ((0.5 - px) * 18).toFixed(2) + 'deg');
    }
  });
});
