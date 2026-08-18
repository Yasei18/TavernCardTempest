#!/usr/bin/env node
/*
 * scripts/build.js
 * Генерирует HTML-страницы рас и верований из данных.
 *
 * Использование:
 *   node scripts/build.js [races|faiths|all]
 *
 * Примеры:
 *   node scripts/build.js races   — пересоздать wiki/races/*.html из RACES[]
 *   node scripts/build.js faiths  — пересоздать wiki/faiths/*.html из FAITHS[]
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
    '    <script defer src="../js/layout.js"></script>\n' +
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
    '    <script defer src="../js/layout.js"></script>\n' +
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
 *  MAIN
 * ══════════════════════════════════════════════════════════════════ */

var target = (process.argv[2] || 'all').toLowerCase();

try {
  if (target === 'races' || target === 'all') buildRaces();
  if (target === 'faiths' || target === 'all') buildFaiths();
  console.log('\n✓ Готово!');
} catch (err) {
  console.error('ОШИБКА:', err.message);
  process.exit(1);
}
