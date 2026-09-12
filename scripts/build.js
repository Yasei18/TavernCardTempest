#!/usr/bin/env node
/*
 * scripts/build.js
 * Генерирует HTML-страницы рас и верований из данных.
 *
 * Использование:
 *   node scripts/build.js [races|faiths|search|all]
 *
 * Примеры:
 *   node scripts/build.js races   — пересоздать wiki/races/*.html из RACES[]
 *   node scripts/build.js faiths  — пересоздать wiki/faiths/*.html из FAITHS[]
 *   node scripts/build.js search  — пересоздать wiki/js/search-data.js и browse-data.js
 *   node scripts/build.js all     — всё вместе
 */
'use strict';

var fs   = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');

/* ─── Утилиты ─── */

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function write(p, data) {
  var dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, data, 'utf8');
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─── Извлечение данных из JS-файлов ─── */

function extractArray(fileContent, varName) {
  var re = new RegExp('var\\s+' + varName + '\\s*=\\s*(\\[[\\s\\S]*?\\]);');
  var m = fileContent.match(re);
  if (!m) throw new Error('Не найден ' + varName + ' в содержимом');
  // Формируем безопасный объект — оборачиваем в скобки и eval
  // (безопасно, т.к. данные рукописные и не содержат внешних вызовов)
  return (new Function('return (' + m[1] + ')'))();
}

/* ══════════════════════════════════════════════════════════════════
 *  RACE PAGES
 * ══════════════════════════════════════════════════════════════════ */

function extractBodyContent(html) {
  // Извлекаем содержимое <div id="raceContent">...</div>
  var m = html.match(/<div id="raceContent">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/);
  if (m) return m[1].trim();
  // Запасной вариант — ищем просто <div id="raceContent"> и берём до конца
  var idx = html.indexOf('<div id="raceContent">');
  if (idx === -1) return '';
  var start = idx + '<div id="raceContent">'.length;
  var end = html.indexOf('</div>', start);
  // Ищем закрывающий divwiki-container
  var end2 = html.indexOf('</div>', end + 1);
  var end3 = html.indexOf('</div>', end2 + 1);
  return html.substring(start, end3).trim();
}

function buildRaces() {
  console.log('\n=== Building race pages ===');

  var dataSrc = read(path.join(ROOT, 'wiki', 'js', 'data.js'));
  var RACES = extractArray(dataSrc, 'RACES');

  var SITE = 'https://example.com/tavern';

  // Сначала извлекаем body-content из существующих HTML-файлов
  // и добавляем в данные (если ещё нет)
  var racesDir = path.join(ROOT, 'wiki', 'races');
  var htmlFiles = fs.readdirSync(racesDir).filter(function(f) {
    return /^race-.*\.html$/.test(f);
  });

  for (var i = 0; i < htmlFiles.length; i++) {
    var filePath = path.join(racesDir, htmlFiles[i]);
    var html = read(filePath);
    var slug = htmlFiles[i].replace(/\.html?$/i, '');
    var body = extractBodyContent(html);

    // Ищем существующую запись в RACES
    var race = null;
    for (var j = 0; j < RACES.length; j++) {
      if (RACES[j].slug === slug) { race = RACES[j]; break; }
    }
    if (race && !race.body && body) {
      race.body = body;
    }
  }

  // Теперь записываем обновлённый data.js с body
  var dataContent = 'var RACES = ' + JSON.stringify(RACES, null, 2) + ';\n\n';

  // Добавляем FAITHS обратно (без изменений)
  var faithsSrc = read(path.join(ROOT, 'wiki', 'js', 'data.js'));
  var faithsMatch = faithsSrc.match(/var FAITHS = (\[[\s\S]*?\]);/);
  if (faithsMatch) {
    var FAITHS = (new Function('return (' + faithsMatch[1] + ')'))();
    dataContent += 'var FAITHS = ' + JSON.stringify(FAITHS, null, 2) + ';\n';
  }
  write(path.join(ROOT, 'wiki', 'js', 'data.js'), dataContent);
  console.log('  Обновлён data.js (добавлен body для рас)');

  // Шаблон страницы расы
  var template =
    '<!DOCTYPE html>\n' +
    '<html lang="ru">\n' +
    '<head>\n' +
    '    <meta charset="UTF-8">\n' +
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '    <title>{{TITLE}}</title>\n' +
    '    <meta name="description" content="{{META}}">\n' +
    '    <link rel="stylesheet" href="../static/style_wiki.css">\n' +
    '    <script defer src="../../js/layout.js"></script>\n' +
    '    <script defer src="../js/main.js"></script>\n' +
    '</head>\n' +
    '<body data-layout="wiki" data-root="../">\n' +
    '    <div class="wiki-page">\n' +
    '        <div class="wiki-container">\n' +
    '            <div id="raceContent">\n' +
    '{{BODY}}\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '    <script src="../js/data.js"></script>\n' +
    '    <script src="../js/race-page.js"></script>\n' +
    '</body>\n' +
    '</html>\n';

  var count = 0;
  for (var i = 0; i < RACES.length; i++) {
    var race = RACES[i];
    var slug = race.slug;
    var title = race.title ? race.title + ' — Расы Орвея' : slug;
    var meta = race.meta || '';
    var body = race.body || '<!-- Контент не найден -->';

    var html = template
      .replace('{{TITLE}}', esc(title))
      .replace('{{META}}', esc(meta))
      .replace('{{BODY}}', body);

    write(path.join(racesDir, slug + '.html'), html);
    count++;
  }

  console.log('  Сгенерировано ' + count + ' race-страниц в wiki/races/');
}

/* ══════════════════════════════════════════════════════════════════
 *  FAITH PAGES
 * ══════════════════════════════════════════════════════════════════ */

function buildFaiths() {
  console.log('\n=== Building faith pages ===');

  var dataSrc = read(path.join(ROOT, 'wiki', 'js', 'data.js'));
  var faithsMatch = dataSrc.match(/var FAITHS = (\[[\s\S]*?\]);/);
  if (!faithsMatch) {
    console.log('  FAITHS не найден в data.js, пропускаем');
    return;
  }
  var FAITHS = (new Function('return (' + faithsMatch[1] + ')'))();

  var SITE = 'https://example.com/tavern';

  // Извлекаем body из существующих HTML-файлов
  var faithsDir = path.join(ROOT, 'wiki', 'faiths');
  var htmlFiles = fs.readdirSync(faithsDir).filter(function(f) {
    return /^faith-.*\.html$/.test(f);
  });

  for (var i = 0; i < htmlFiles.length; i++) {
    var filePath = path.join(faithsDir, htmlFiles[i]);
    var html = read(filePath);
    var slug = htmlFiles[i].replace(/\.html?$/i, '');
    var body = extractBodyContent(html);

    var faith = null;
    for (var j = 0; j < FAITHS.length; j++) {
      if (FAITHS[j].slug === slug) { faith = FAITHS[j]; break; }
    }
    if (faith && !faith.body && body) {
      faith.body = body;
    }
  }

  // Обновляем data.js — перезаписываем RACES (уже с body) и FAITHS (теперь тоже с body)
  var racesSrc = read(path.join(ROOT, 'wiki', 'js', 'data.js'));
  var racesMatch = racesSrc.match(/var RACES = (\[[\s\S]*?\]);/);
  var RACES = racesMatch
    ? (new Function('return (' + racesMatch[1] + ')'))()
    : [];

  var dataContent = 'var RACES = ' + JSON.stringify(RACES, null, 2) + ';\n\n';
  dataContent += 'var FAITHS = ' + JSON.stringify(FAITHS, null, 2) + ';\n';
  write(path.join(ROOT, 'wiki', 'js', 'data.js'), dataContent);
  console.log('  Обновлён data.js (добавлен body для верований)');

  // Шаблон страницы верования
  var template =
    '<!DOCTYPE html>\n' +
    '<html lang="ru">\n' +
    '<head>\n' +
    '    <meta charset="UTF-8">\n' +
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '    <title>{{TITLE}}</title>\n' +
    '    <meta name="description" content="{{META}}">\n' +
    '    <link rel="stylesheet" href="../static/style_wiki.css">\n' +
    '    <script defer src="../../js/layout.js"></script>\n' +
    '    <script defer src="../js/main.js"></script>\n' +
    '</head>\n' +
    '<body data-layout="wiki" data-root="../">\n' +
    '    <div class="wiki-page">\n' +
    '        <div class="wiki-container">\n' +
    '            <div id="raceContent">\n' +
    '{{BODY}}\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '    <script src="../js/data.js"></script>\n' +
    '    <script src="../js/race-page.js"></script>\n' +
    '</body>\n' +
    '</html>\n';

  var count = 0;
  for (var i = 0; i < FAITHS.length; i++) {
    var faith = FAITHS[i];
    var slug = faith.slug;
    var title = faith.title ? faith.title + ' — Верования Орвея' : slug;
    var meta = faith.meta || '';
    var body = faith.body || '<!-- Контент не найден -->';

    var html = template
      .replace('{{TITLE}}', esc(title))
      .replace('{{META}}', esc(meta))
      .replace('{{BODY}}', body);

    write(path.join(faithsDir, slug + '.html'), html);
    count++;
  }

  console.log('  Сгенерировано ' + count + ' faith-страниц в wiki/faiths/');
}

/* ══════════════════════════════════════════════════════════════════
 *  WIKI SEARCH INDEX + BROWSE DATA
 *  Генерирует wiki/js/search-data.js (индекс поиска) и
 *  wiki/js/browse-data.js (список страниц и похожие статьи)
 *  из HTML-файлов вики и wiki/js/data.js.
 * ══════════════════════════════════════════════════════════════════ */

// Декодирует HTML-сущности, встречающиеся в контенте вики.
function decodeEntities(s) {
  if (!s) return '';
  var named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    mdash: '—', ndash: '–', hellip: '…', laquo: '«', raquo: '»',
    lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', copy: '©'
  };
  return String(s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, function (m, e) {
    if (e.charAt(0) === '#') {
      var hex = e.charAt(1) === 'x' || e.charAt(1) === 'X';
      var code = parseInt(e.slice(hex ? 2 : 1), hex ? 16 : 10);
      return isNaN(code) ? m : String.fromCharCode(code);
    }
    return Object.prototype.hasOwnProperty.call(named, e) ? named[e] : m;
  });
}

function stripHtml(s) {
  return decodeEntities(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function unique(arr) {
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] && out.indexOf(arr[i]) === -1) out.push(arr[i]);
  }
  return out;
}

// Теги как массив лейблов (подходит и компакту {region,label}, и строкам).
function tagsOf(item) {
  var out = [];
  var tags = item.tags || (item.tag ? [item.tag] : []);
  for (var i = 0; i < tags.length; i++) {
    var t = tags[i];
    if (t && typeof t === 'object' && t.label) out.push(t.label);
    else if (typeof t === 'string') out.push(t);
  }
  return out;
}

// Заголовки h2/h3 из HTML-контента, максимум 10.
function headingsOf(htmlContent) {
  var out = [];
  if (!htmlContent) return out;
  var re = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  var m;
  while ((m = re.exec(htmlContent)) !== null) {
    var h = stripHtml(m[1]);
    if (h) out.push(h);
    if (out.length >= 10) break;
  }
  return out;
}

function buildWikiData() {
  console.log('\n=== Building wiki search/browse data ===');

  var wikiRoot = path.join(ROOT, 'wiki');
  var dataSrc = read(path.join(wikiRoot, 'js', 'data.js'));

  var raceMap = {}, faithMap = {};
  try {
    extractArray(dataSrc, 'RACES').forEach(function (r) { if (r.slug) raceMap[r.slug] = r; });
  } catch (e) {}
  try {
    extractArray(dataSrc, 'FAITHS').forEach(function (f) { if (f.slug) faithMap[f.slug] = f; });
  } catch (e) {}

  // Собираем HTML-файлы вики (кроме static/) в алфавитном порядке путей.
  var files = [];
  (function walk(dir) {
    fs.readdirSync(dir).forEach(function (name) {
      var p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) {
        if (name !== 'static') walk(p);
      } else if (/\.html$/.test(name)) {
        files.push(p);
      }
    });
  })(wikiRoot);
  files.sort(function (a, b) {
    return a.toUpperCase().localeCompare(b.toUpperCase());
  });

  var pages = {};   // slug -> {url,title,section,keywords,headings}
  var entries = []; // записи поискового индекса

  files.forEach(function (p) {
    var rel = path.relative(wikiRoot, p).split(path.sep).join('/');
    var slug = path.basename(p, '.html');
    var raw = read(p);

    var section = 'Мир Орвей';
    if (/^races\//.test(rel)) section = 'Расы';
    else if (/^faiths\//.test(rel)) section = 'Веры';
    else if (/^player-book\//.test(rel)) section = 'Книга игрока';

    var info = null;
    if (/^races\//.test(rel) && raceMap[slug]) info = raceMap[slug];
    else if (/^faiths\//.test(rel) && faithMap[slug]) info = faithMap[slug];

    var title, lead, keywords, headings;

    if (info) {
      // Страница, сгенерированная из data.js: подставляем метаданные напрямую.
      title = info.title || slug;
      var kw = [];
      if (info.titleEn) kw.push(info.titleEn);
      tagsOf(info).forEach(function (l) { kw.push(l); });
      keywords = unique(kw).join(' ');
      lead = stripHtml(('' + (info.summary || '')).replace(/\r|\n/g, ' '));
      headings = headingsOf(info.body || '');
    } else {
      // Статическая HTML-страница: разбираем разметку.
      var m = raw.match(/<h1 class="wiki-title"[^>]*>([\s\S]*?)<\/h1>/);
      if (!m) m = raw.match(/<h1 class="intro__title"[^>]*>([\s\S]*?)<\/h1>/);
      if (m) {
        title = stripHtml(m[1]);
      } else {
        m = raw.match(/<title>([\s\S]*?)<\/title>/);
        if (m) {
          var t = stripHtml(m[1]);
          if (t.indexOf('—') !== -1) t = t.split('—')[0];
          else if (t.indexOf('|') !== -1) t = t.split('|')[0];
          title = t.trim();
        } else {
          title = slug;
        }
      }

      m = raw.match(/<p class="wiki-lead"[^>]*>([\s\S]*?)<\/p>/);
      if (!m) m = raw.match(/<(?:div|p)[^>]*class="[a-z-]*-summary"[^>]*>([\s\S]*?)<\/(?:div|p)>/);
      if (m) {
        lead = stripHtml(m[1]);
      } else {
        var m2 = raw.match(/<meta name="description" content="([\s\S]*?)">/);
        lead = m2 ? stripHtml(m2[1]) : '';
      }

      headings = headingsOf(raw);

      var kwArr = [];
      var re2 = /<div class="race-title-en"[^>]*>([\s\S]*?)<\/div>/g;
      var mm;
      while ((mm = re2.exec(raw)) !== null) {
        var en = stripHtml(mm[1]);
        if (en) kwArr.push(en);
      }
      keywords = unique(kwArr).join(' ');
    }

    if (slug !== 'search') {
      pages[slug] = { url: rel, title: title, section: section, keywords: keywords, headings: headings };
    }
    entries.push({
      title: title,
      url: rel,
      section: section,
      keywords: keywords,
      lead: lead,
      headings: headings
    });
  });

  var searchJson = JSON.stringify(entries, null, 4);
  var searchContent = '/* Поисковый индекс вики «Мир Орвей». Сгенерирован автоматически из HTML и data.js. */\n' +
    'var WIKI_SEARCH_INDEX = \n' + searchJson + ';\n';
  write(path.join(wikiRoot, 'js', 'search-data.js'), searchContent);
  console.log('  search-data.js: ' + entries.length + ' записей');

  // Похожие статьи: пересечение словарей ключевых слов и заголовков страниц.
  var slugList = Object.keys(pages).sort();
  var STOPS = { 'введение': 1, 'содержание': 1, 'оглавление': 1 };
  var vocabs = {};
  slugList.forEach(function (slug) {
    var v = {};
    var s = (pages[slug].keywords + ' ' + pages[slug].headings.join(' ')).toLowerCase();
    s.split(/[^a-zа-яё0-9]+/i).forEach(function (w) { if (w && !STOPS[w]) v[w] = 1; });
    vocabs[slug] = v;
  });

  var related = {};
  var sectionPages = {};
  slugList.forEach(function (slug) {
    var s = pages[slug].section;
    (sectionPages[s] = sectionPages[s] || []).push(slug);
  });

  slugList.forEach(function (slug) {
    var scored = [];
    slugList.forEach(function (other) {
      if (other === slug) return;
      var a = vocabs[slug], b = vocabs[other];
      var shared = 0;
      for (var w in a) { if (a[w] && b[w]) shared++; }
      if (!shared) return;
      var score = shared + (pages[slug].section === pages[other].section ? 2 : 0);
      scored.push({ slug: other, score: score });
    });
    var list = scored
      .sort(function (x, y) {
        return y.score - x.score || x.slug.localeCompare(y.slug);
      })
      .slice(0, 3)
      .map(function (r) { return r.slug; });

    // Хабовые страницы без общего словаря: соседи по разделу, затем любые.
    if (!list.length) {
      list = (sectionPages[pages[slug].section] || [])
        .filter(function (s) { return s !== slug; })
        .sort()
        .slice(0, 3);
    }
    if (!list.length) {
      list = slugList.filter(function (s) { return s !== slug; }).slice(0, 3);
    }
    related[slug] = list.map(function (r) {
      return { url: pages[r].url, title: pages[r].title };
    });
  });

  var browse = {
    urls: slugList.map(function (s) { return pages[s].url; }),
    related: related
  };
  var browseJson = JSON.stringify(browse, null, 4);
  var browseContent = '/* Навигационные данные вики «Мир Орвей»: страницы для «Случайной статьи» и похожие материалы. Сгенерированы автоматически. */\n' +
    'var WIKI_BROWSE_INDEX = \n' + browseJson + ';\n';
  write(path.join(wikiRoot, 'js', 'browse-data.js'), browseContent);
  console.log('  browse-data.js: ' + slugList.length + ' страниц');
}

/* ══════════════════════════════════════════════════════════════════
 *  MAIN
 * ══════════════════════════════════════════════════════════════════ */

var target = (process.argv[2] || 'all').toLowerCase();

try {
  if (target === 'races' || target === 'all') buildRaces();
  if (target === 'faiths' || target === 'all') buildFaiths();
  if (target === 'search' || target === 'browse' || target === 'all') buildWikiData();
  console.log('\n✓ Готово!');
} catch (err) {
  console.error('ОШИБКА:', err.message);
  process.exit(1);
}
