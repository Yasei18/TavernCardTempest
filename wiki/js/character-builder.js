/* Конструктор персонажа «Таверны „Карточная Буря"».
 *
 * Собирает в одном месте умения, которые получает герой:
 *   • вид            — особенности вида (из wiki/js/data.js, RACES)
 *   • класс          — классовые умения (из страниц wiki/player-book/class-*.html)
 *   • подкласс       — клятвы/академии (оттуда же)
 *   • приёмы         — «Приёмы Воеводы» и подобные выбираемые опции (оттуда же)
 *   • черты          — из wiki/player-book/feats.html
 *
 * Единственный источник правды — сами страницы правил: страницы классов
 * и черт разбираются на месте через DOMParser, поэтому при добавлении
 * нового класса достаточно создать его страницу и добавить карточку
 * в classes.html — конструктор подхватит её автоматически.
 *
 * Уровни — 1–20, поддерживается мультикласс. Требования черт и приёмов
 * намеренно не проверяются: игрок сам сверяется с правилами.
 */
(function () {
  'use strict';

  var app = document.getElementById('cbApp');
  if (!app) return;

  var STORAGE_KEY = 'tct-character-v1';
  var FEATS_FILE = 'feats.html';
  var CLASSES_HUB = 'classes.html';

  var ABILITIES = [
    { key: 'str', label: 'Сила', short: 'СИЛ' },
    { key: 'dex', label: 'Ловкость', short: 'ЛОВ' },
    { key: 'con', label: 'Телосложение', short: 'ТЕЛ' },
    { key: 'int', label: 'Интеллект', short: 'ИНТ' },
    { key: 'wis', label: 'Мудрость', short: 'МДР' },
    { key: 'cha', label: 'Харизма', short: 'ХАР' }
  ];

  // 18 навыков и их базовые характеристики.
  var SKILLS = [
    { key: 'athletics', name: 'Атлетика', ab: 'str', abShort: 'СИЛ' },
    { key: 'acrobatics', name: 'Акробатика', ab: 'dex', abShort: 'ЛОВ' },
    { key: 'sleight', name: 'Ловкость рук', ab: 'dex', abShort: 'ЛОВ' },
    { key: 'stealth', name: 'Скрытность', ab: 'dex', abShort: 'ЛОВ' },
    { key: 'arcana', name: 'Магия', ab: 'int', abShort: 'ИНТ' },
    { key: 'history', name: 'История', ab: 'int', abShort: 'ИНТ' },
    { key: 'investigation', name: 'Расследование', ab: 'int', abShort: 'ИНТ' },
    { key: 'nature', name: 'Природа', ab: 'int', abShort: 'ИНТ' },
    { key: 'religion', name: 'Религия', ab: 'int', abShort: 'ИНТ' },
    { key: 'perception', name: 'Восприятие', ab: 'wis', abShort: 'МДР' },
    { key: 'animal', name: 'Уход за животными', ab: 'wis', abShort: 'МДР' },
    { key: 'insight', name: 'Проницательность', ab: 'wis', abShort: 'МДР' },
    { key: 'medicine', name: 'Медицина', ab: 'wis', abShort: 'МДР' },
    { key: 'survival', name: 'Выживание', ab: 'wis', abShort: 'МДР' },
    { key: 'deception', name: 'Обман', ab: 'cha', abShort: 'ХАР' },
    { key: 'intimidation', name: 'Запугивание', ab: 'cha', abShort: 'ХАР' },
    { key: 'performance', name: 'Выступление', ab: 'cha', abShort: 'ХАР' },
    { key: 'persuasion', name: 'Убеждение', ab: 'cha', abShort: 'ХАР' }
  ];
  var SKILL_MAP = {};
  SKILLS.forEach(function (s) { SKILL_MAP[s.key] = s; });

  /* ─────────────── состояние ─────────────── */

  var state = {
    name: '',
    race: '',
    classes: [{ slug: '', level: 1, subclass: '' }],
    tricks: [],   // "slug::Название приёма"
    feats: [],    // имена выбранных черт
    abilities: { str: '', dex: '', con: '', int: '', wis: '', cha: '' },
    skills: {},   // key -> 0 нет / 1 владение / 2 экспертиза
    combat: { hp: '', hpMax: '', ac: '', speed: '', init: '', hitDice: '' },
    bio: { background: '', alignment: '', notes: '' }
  };

  var data = {
    classIndex: [],          // [{slug, file, title}]
    classBySlug: {},         // slug -> {slug, file, title}
    classes: {},             // slug -> разобранный класс
    feats: null,             // массив черт
    featsCats: {},           // cat -> метка
    featsReady: false,
    featsSearch: '',
    featsCat: ''
  };

  var FALLBACK_CLASSES = [
    { slug: 'paladin', file: 'class-paladin.html', title: 'Паладин' },
    { slug: 'warlord', file: 'class-warlord.html', title: 'Воевода' }
  ];

  /* ─────────────── утилиты ─────────────── */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function q(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qa(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }
  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }

  function clampInt(v, min, max) {
    v = parseInt(v, 10);
    if (isNaN(v)) v = min;
    return Math.max(min, Math.min(max, v));
  }

  function profBonus(total) {
    total = Math.max(1, Math.min(20, parseInt(total, 10) || 0));
    return 2 + Math.floor((total - 1) / 4);
  }

  function levelsLabel(levels) {
    if (!levels || !levels.length) return '';
    if (levels.length === 1) return levels[0] + ' уровень';
    return levels.join(', ') + ' уровни';
  }

  /* ─────────────── характеристики и боевые показатели ─────────────── */

  function numOrNull(v) {
    if (v === '' || v == null) return null;
    var n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  }

  function abilityMod(key) {
    var s = numOrNull(state.abilities[key]);
    return s == null ? null : Math.floor((s - 10) / 2);
  }

  function signed(n) {
    return n == null ? '—' : (n >= 0 ? '+' : '') + n;
  }

  function sumLevels() {
    var t = 0;
    state.classes.forEach(function (c) { t += clampInt(c.level, 1, 20); });
    return t;
  }

  function initiativeValue() {
    var manual = numOrNull(state.combat.init);
    if (manual != null) return manual;
    return abilityMod('dex');
  }

  // Вариант «Кость мастерства» (DMG, стр. 263): бонус владения заменяется костью.
  function profDie(total) {
    var lvl = Math.max(1, Math.min(20, parseInt(total, 10) || 1));
    if (lvl <= 4) return 'к4';
    if (lvl <= 8) return 'к6';
    if (lvl <= 12) return 'к8';
    if (lvl <= 16) return 'к10';
    return 'к12';
  }

  // Проверка навыка: модификатор характеристики + кость мастерства (двойная при экспертизе).
  function skillTotalText(key) {
    var sk = SKILL_MAP[key];
    if (!sk) return '—';
    var mod = abilityMod(sk.ab);
    if (mod == null) return '—';
    var lvl = state.skills[key] || 0;
    if (!lvl) return signed(mod);
    var dice = (lvl >= 2 ? '2' : '') + profDie(sumLevels());
    return mod === 0 ? dice : dice + ' ' + signed(mod);
  }

  // Пассивное значение навыка (Восприятие, Проницательность, Расследование):
  // для пассивных проверок кость мастерства учитывается по среднему — как стандартный бонус.
  function passiveSkill(key) {
    var sk = SKILL_MAP[key];
    if (!sk) return null;
    var base = abilityMod(sk.ab);
    if (base == null) return null;
    var lvl = state.skills[key] || 0;
    var prof = profBonus(sumLevels());
    return 10 + base + (lvl >= 1 ? prof : 0) + (lvl >= 2 ? prof : 0);
  }

  /* ─────────────── разбор страниц правил ─────────────── */

  // H3 класса/подкласса: «Название <span class="pb-lvl">4, 8 и 12 уровни</span>»
  function parseH3(h3) {
    var lvlEl = h3.querySelector('.pb-lvl');
    var levels = lvlEl ? (lvlEl.textContent.match(/\d+/g) || []).map(Number) : [];
    var clone = h3.cloneNode(true);
    var l = clone.querySelector('.pb-lvl');
    if (l) l.parentNode.removeChild(l);
    return {
      id: h3.id || '',
      name: txt(clone),
      levels: levels,
      html: ''
    };
  }

  // Обходит прямых потомков контейнера: H3 начинает умение,
  // всё до первого H3 — вступление.
  function parseFeatureNodes(container) {
    var intro = '';
    var features = [];
    if (!container) return { intro: intro, features: features };
    Array.prototype.slice.call(container.children).forEach(function (node) {
      var tag = node.tagName;
      if (tag === 'H3') {
        features.push(parseH3(node));
      } else if (tag === 'HR') {
        /* разделитель — пропускаем */
      } else if (features.length) {
        features[features.length - 1].html += node.outerHTML;
      } else {
        intro += node.outerHTML;
      }
    });
    return { intro: intro, features: features };
  }

  function parseTrickLi(li) {
    var name = '';
    var strong = li.querySelector('strong');
    if (strong) name = strong.textContent.replace(/\s+/g, ' ').replace(/\.\s*$/, '').trim();

    var reqEl = li.querySelector('.pb-req');
    var req = reqEl ? reqEl.textContent.replace(/^\s*Требование:\s*/i, '').replace(/\s+/g, ' ').trim() : '';

    var clone = li.cloneNode(true);
    var cs = clone.querySelector('strong');
    if (cs) cs.parentNode.removeChild(cs);
    qa('.pb-req', clone).forEach(function (e) { e.parentNode.removeChild(e); });
    var html = clone.innerHTML.trim().replace(/^[\s.:]+/, '');

    return { name: name, req: req, html: html };
  }

  function parseTricks(root) {
    var tiers = Array.prototype.slice.call(root.children).filter(function (n) {
      return n.tagName === 'DETAILS';
    }).map(function (d) {
      var summary = d.querySelector('summary');
      var lvlEl = summary ? summary.querySelector('.pb-lvl') : null;
      var level = lvlEl ? (parseInt((lvlEl.textContent.match(/\d+/) || ['1'])[0], 10) || 1) : 1;
      var tierText = summary && summary.firstChild ? String(summary.firstChild.nodeValue || '').trim() : '';
      var metaEl = summary ? summary.querySelector('.pb-tricks__meta') : null;
      var body = d.querySelector('.pb-tricks__body');
      var introEl = body ? body.querySelector('.pb-tricks__intro') : null;
      var items = body
        ? qa('.pb-tricks__list > li', body).map(parseTrickLi)
        : [];
      return {
        level: level,
        tier: tierText,
        count: txt(metaEl),
        intro: introEl ? introEl.outerHTML : '',
        items: items
      };
    });
    return tiers;
  }

  function parseSubclass(details) {
    var body = details.querySelector('.pb-subclass__body');
    var parsed = parseFeatureNodes(body);
    return {
      id: details.id || '',
      name: txt(details.querySelector('.pb-subclass__name')),
      tag: txt(details.querySelector('.pb-subclass__tag')),
      intro: parsed.intro,
      features: parsed.features,
      level: 3
    };
  }

  // Таблица уровней класса: какие уровни дают черту (увеличение характеристик)
  // и сколько к этому уровню известно приёмов.
  function parseLevelTable(doc) {
    var table = doc.querySelector('table.pb-levels');
    if (!table) return null;

    // Имена колонок с учётом rowspan/colspan (у части классов шапка в две строки).
    var names = [];
    var thead = table.querySelector('thead');
    if (thead) {
      var occ = [];
      qa('tr', thead).forEach(function (tr, r) {
        if (!occ[r]) occ[r] = [];
        var c = 0;
        qa('th', tr).forEach(function (th) {
          while (occ[r][c]) c++;
          var cs = parseInt(th.getAttribute('colspan'), 10) || 1;
          var rs = parseInt(th.getAttribute('rowspan'), 10) || 1;
          var label = txt(th);
          for (var dr = 0; dr < rs; dr++) {
            if (!occ[r + dr]) occ[r + dr] = [];
            for (var dc = 0; dc < cs; dc++) {
              occ[r + dr][c + dc] = true;
              if (dr === 0 && dc === 0) names[c + dc] = label;
              else if (names[c + dc] == null) names[c + dc] = '';
            }
          }
          c += cs;
        });
      });
    }

    var levelIdx = 0, featsIdx = -1, tricksIdx = -1;
    names.forEach(function (n, i) {
      if (/Уровень/i.test(n)) levelIdx = i;
      if (/Классовые умения/i.test(n)) featsIdx = i;
      if (/Известные приёмы/i.test(n)) tricksIdx = i;
    });
    if (featsIdx < 0) featsIdx = 2; // колонка умений — третья в обеих таблицах

    var rows = [];
    qa('tbody tr', table).forEach(function (tr) {
      var tds = tr.children;
      var lvl = parseInt(txt(tds[levelIdx] || tds[0]), 10);
      if (!lvl) return;
      var featCell = tds[featsIdx];
      var tricks = null;
      if (tricksIdx >= 0 && tds[tricksIdx]) {
        var mm = txt(tds[tricksIdx]).match(/\d+/);
        tricks = mm ? parseInt(mm[0], 10) : null;
      }
      rows.push({
        level: lvl,
        feat: featCell ? /uvelichenie-harakteristik/i.test(featCell.innerHTML) : false,
        tricks: tricks
      });
    });

    return {
      rows: rows,
      featLevels: rows.filter(function (r) { return r.feat; }).map(function (r) { return r.level; })
    };
  }

  function parseClassDoc(htmlText, slug, fallbackTitle) {
    var doc = new DOMParser().parseFromString(htmlText, 'text/html');
    var klass = {
      slug: slug,
      title: txt(doc.querySelector('h1.wiki-title')) || fallbackTitle || slug,
      features: [],
      subclassLabel: '',
      subclasses: [],
      tricks: [],
      levelTable: parseLevelTable(doc)
    };

    var um = doc.getElementById('umeniya');
    if (um) {
      var node = um.nextElementSibling;
      while (node) {
        if (node.tagName === 'H2') break;
        if (node.classList && node.classList.contains('pb-tricks')) {
          klass.tricks = parseTricks(node);
        } else if (node.tagName === 'H3') {
          klass.features.push(parseH3(node));
        } else if (node.tagName !== 'HR' && klass.features.length) {
          klass.features[klass.features.length - 1].html += node.outerHTML;
        }
        node = node.nextElementSibling;
      }
    }

    var pod = doc.getElementById('podklass');
    if (pod) {
      klass.subclassLabel = txt(pod);
      var n2 = pod.nextElementSibling;
      while (n2) {
        if (n2.tagName === 'H2') break;
        if (n2.tagName === 'DETAILS' && n2.classList && n2.classList.contains('pb-subclass')) {
          klass.subclasses.push(parseSubclass(n2));
        }
        n2 = n2.nextElementSibling;
      }
    }

    return klass;
  }

  function parseRaceTraits(body) {
    if (!body) return [];
    var doc = new DOMParser().parseFromString('<div id="__rc">' + body + '</div>', 'text/html');
    var wrap = doc.getElementById('__rc');
    if (!wrap) return [];
    var traits = [];
    qa('table.feature-table tr', wrap).forEach(function (tr) {
      if (tr.querySelector('th')) return;
      var tds = tr.children;
      if (tds.length < 2) return;
      var name = txt(tds[0]);
      var desc = tds[1].innerHTML.trim();
      // ссылки в теле расы относительны wiki/races/ — перенаправляем на тот же уровень
      desc = desc.replace(/(href|src)="\.\//g, '$1="../races/');
      if (name) traits.push({ name: name, desc: desc });
    });
    return traits;
  }

  function parseFeatsDoc(htmlText) {
    var doc = new DOMParser().parseFromString(htmlText, 'text/html');
    var cats = {};
    qa('.filter-tag[data-filter]', doc).forEach(function (b) {
      cats[b.getAttribute('data-filter')] = txt(b);
    });
    var feats = qa('article.feat-card', doc).map(function (a) {
      var cat = a.getAttribute('data-cat') || '';
      return {
        name: txt(a.querySelector('.race-card__title')),
        cat: cat,
        catLabel: cats[cat] || '',
        html: (a.querySelector('.race-card__desc') || {}).innerHTML || ''
      };
    }).filter(function (f) { return f.name; });
    return { feats: feats, cats: cats };
  }

  /* ─────────────── загрузка ─────────────── */

  function loadClassIndex() {
    if (window.CT_CLASS_INDEX && window.CT_CLASS_INDEX.length) {
      return Promise.resolve(window.CT_CLASS_INDEX.map(function (c) {
        return { slug: c.slug, file: c.file, title: c.title };
      }));
    }
    return fetch(CLASSES_HUB).then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var list = qa('a.pb-card', doc).map(function (a) {
        var href = a.getAttribute('href') || '';
        var m = href.match(/class-([a-z0-9-]+)\.html/i);
        if (!m) return null;
        return { slug: m[1], file: 'class-' + m[1] + '.html', title: txt(a) };
      }).filter(Boolean);
      return list.length ? list : FALLBACK_CLASSES;
    }).catch(function () {
      return FALLBACK_CLASSES;
    });
  }

  function ensureClass(slug) {
    if (!slug) return Promise.resolve(null);
    if (data.classes[slug]) return Promise.resolve(data.classes[slug]);
    var meta = data.classBySlug[slug] || { slug: slug, file: 'class-' + slug + '.html', title: slug };
    if (window.CT_CLASS_DOCS && window.CT_CLASS_DOCS[slug]) {
      var embedded = parseClassDoc(window.CT_CLASS_DOCS[slug], slug, meta.title);
      if (!data.classBySlug[slug]) data.classBySlug[slug] = meta;
      data.classes[slug] = embedded;
      return Promise.resolve(embedded);
    }
    return fetch(meta.file).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (html) {
      var klass = parseClassDoc(html, slug, meta.title);
      if (!data.classBySlug[slug]) data.classBySlug[slug] = meta;
      data.classes[slug] = klass;
      return klass;
    }).catch(function () {
      data.classes[slug] = { slug: slug, title: meta.title || slug, features: [], subclasses: [], tricks: [], error: true };
      return data.classes[slug];
    });
  }

  function loadFeats() {
    if (data.feats) return Promise.resolve(data.feats);
    if (window.CT_FEATS_HTML) {
      var embedded = parseFeatsDoc(window.CT_FEATS_HTML);
      data.feats = embedded.feats;
      data.featsCats = embedded.cats;
      data.featsReady = true;
      return Promise.resolve(data.feats);
    }
    return fetch(FEATS_FILE).then(function (r) { return r.text(); }).then(function (html) {
      var parsed = parseFeatsDoc(html);
      data.feats = parsed.feats;
      data.featsCats = parsed.cats;
      data.featsReady = true;
      return data.feats;
    }).catch(function () {
      data.feats = [];
      data.featsReady = true;
      return data.feats;
    });
  }

  function raceList() {
    return (window.RACES || []).filter(function (r) {
      return r && r.slug && /^race-/.test(r.slug);
    });
  }

  function findRace(slug) {
    var list = raceList();
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i];
    return null;
  }

  // Сколько черт (увеличение характеристик) класс даёт к этому уровню.
  function featSlotsFor(klass, level) {
    if (!klass || !klass.levelTable) return 0;
    return klass.levelTable.featLevels.filter(function (l) { return l <= level; }).length;
  }

  // Сколько приёмов известно классу на этом уровне (из таблицы класса), или null.
  function knownTricksFor(klass, level) {
    if (!klass || !klass.levelTable) return null;
    var val = null;
    klass.levelTable.rows.forEach(function (r) {
      if (r.level <= level && r.tricks != null) val = r.tricks;
    });
    return val;
  }

  // Даёт ли вид бесплатную черту (строка «Черта» в таблице особенностей вида).
  function raceGrantsFeat(race) {
    if (!race) return false;
    return parseRaceTraits(race.body).some(function (t) {
      return /^черта$/i.test(t.name.trim());
    });
  }

  // Сводка по доступным чертам: слоты от классов + бесплатная черта вида.
  function featBudgetInfo() {
    var slots = 0;
    var parts = [];
    state.classes.forEach(function (entry) {
      if (!entry.slug) return;
      var klass = data.classes[entry.slug];
      if (!klass || !klass.levelTable) return;
      var open = klass.levelTable.featLevels.filter(function (l) { return l <= entry.level; });
      slots += open.length;
      if (open.length) parts.push((klass.title || entry.slug) + ': ' + open.join(', '));
    });
    var race = findRace(state.race);
    var raceFeat = race ? raceGrantsFeat(race) : false;
    if (raceFeat) slots += 1;
    return { slots: slots, parts: parts, race: race, raceFeat: raceFeat };
  }

  /* ─────────────── отрисовка панели управления ─────────────── */

  function setInput(sel, val) {
    var el = q(sel);
    var str = val == null ? '' : String(val);
    if (el && el.value !== str) el.value = str;
  }

  function renderStatsInputs() {
    ABILITIES.forEach(function (a) {
      var inp = q('.cb-ab-input[data-key="' + a.key + '"]');
      if (inp && inp.value !== String(state.abilities[a.key] || '')) inp.value = state.abilities[a.key] || '';
      var mod = q('.cb-ab__mod[data-key="' + a.key + '"]');
      if (mod) mod.textContent = signed(abilityMod(a.key));
    });
    setInput('#cbHp', state.combat.hp);
    setInput('#cbHpMax', state.combat.hpMax);
    setInput('#cbAc', state.combat.ac);
    setInput('#cbSpeed', state.combat.speed);
    setInput('#cbInit', state.combat.init);
    setInput('#cbHitDice', state.combat.hitDice);
    setInput('#cbBackground', state.bio.background);
    setInput('#cbAlignment', state.bio.alignment);
    setInput('#cbNotes', state.bio.notes);
  }

  function renderSkillsPicker() {
    var box = q('#cbSkills');
    if (!box) return;
    var html = '';
    SKILLS.forEach(function (s) {
      var lvl = state.skills[s.key] || 0;
      html += '<div class="cb-skill">'
        + '<label class="cb-skill__main">'
        + '<input type="checkbox" class="cb-skill-prof" data-key="' + s.key + '"' + (lvl >= 1 ? ' checked' : '') + '>'
        + '<span class="cb-skill__name">' + esc(s.name) + '</span>'
        + '<span class="cb-skill__ab">' + esc(s.abShort) + '</span>'
        + '</label>'
        + '<label class="cb-skill__exp" title="Экспертиза: ещё одна кость мастерства">'
        + '<input type="checkbox" class="cb-skill-exp" data-key="' + s.key + '"' + (lvl >= 2 ? ' checked' : '') + (lvl >= 1 ? '' : ' disabled') + '> Э'
        + '</label>'
        + '<span class="cb-skill__bonus" data-bonus="' + s.key + '">—</span>'
        + '</div>';
    });
    box.innerHTML = html;
    updateSkillBonuses();
  }

  function syncSkillRow(key) {
    var lvl = state.skills[key] || 0;
    var prof = q('.cb-skill-prof[data-key="' + key + '"]');
    if (prof) prof.checked = lvl >= 1;
    var exp = q('.cb-skill-exp[data-key="' + key + '"]');
    if (exp) exp.checked = lvl >= 2;
  }

  function updateSkillBonuses() {
    var chosen = 0;
    SKILLS.forEach(function (s) {
      var lvl = state.skills[s.key] || 0;
      if (lvl > 0) chosen++;
      var out = q('.cb-skill__bonus[data-bonus="' + s.key + '"]');
      if (out) {
        out.textContent = skillTotalText(s.key);
        out.classList.toggle('cb-skill__bonus--prof', lvl >= 1 && abilityMod(s.ab) != null);
      }
      var exp = q('.cb-skill-exp[data-key="' + s.key + '"]');
      if (exp) exp.disabled = lvl < 1;
    });
    var cnt = q('#cbSkillCount');
    if (cnt) cnt.textContent = chosen || '';
  }

  function renderRaceSelect() {
    var sel = q('#cbRace');
    if (!sel) return;
    var groups = {};
    var order = [];
    raceList().forEach(function (r) {
      var region = (r.tags && r.tags[0] && r.tags[0].label) || 'Прочие';
      if (!groups[region]) { groups[region] = []; order.push(region); }
      groups[region].push(r);
    });

    var html = '<option value="">— выберите вид —</option>';
    order.forEach(function (region) {
      html += '<optgroup label="' + esc(region) + '">';
      groups[region].forEach(function (r) {
        html += '<option value="' + esc(r.slug) + '">' + esc(r.title) + '</option>';
      });
      html += '</optgroup>';
    });
    sel.innerHTML = html;
    sel.value = state.race || '';
  }

  function classOptionsHtml(selected) {
    var html = '<option value="">— класс —</option>';
    data.classIndex.forEach(function (c) {
      html += '<option value="' + esc(c.slug) + '"' + (c.slug === selected ? ' selected' : '') + '>' + esc(c.title) + '</option>';
    });
    return html;
  }

  function subclassOptionsHtml(entry, klass) {
    if (!klass || !klass.subclasses || !klass.subclasses.length) {
      return '<option value="">— подкласс —</option>';
    }
    var label = klass.subclassLabel || 'Подкласс';
    var html = '<option value="">' + esc(label) + '…</option>';
    klass.subclasses.forEach(function (s) {
      html += '<option value="' + esc(s.id) + '"' + (s.id === entry.subclass ? ' selected' : '') + '>' + esc(s.name) + '</option>';
    });
    return html;
  }

  function renderClassRows() {
    var box = q('#cbClasses');
    if (!box) return;
    var html = '';
    state.classes.forEach(function (entry, i) {
      var klass = data.classes[entry.slug] || null;
      var subclassDisabled = entry.level < 3 || !klass || !klass.subclasses.length;
      html += '<div class="cb-row" data-i="' + i + '">';
      html += '<select class="cb-class" data-i="' + i + '" aria-label="Класс">' + classOptionsHtml(entry.slug) + '</select>';
      html += '<label class="cb-lvl">ур. <input type="number" class="cb-level" data-i="' + i + '" min="1" max="20" value="' + entry.level + '"></label>';
      html += '<select class="cb-subclass" data-i="' + i + '"' + (subclassDisabled ? ' disabled' : '') + '>' + subclassOptionsHtml(entry, klass) + '</select>';
      html += '<button type="button" class="cb-icon-btn cb-remove" data-i="' + i + '" title="Убрать класс" aria-label="Убрать класс">×</button>';
      html += '</div>';
    });
    box.innerHTML = html;
  }

  function trickId(slug, name) { return slug + '::' + name; }

  function renderTricksPicker() {
    var box = q('#cbTricks');
    if (!box) return;

    sanitizeTricks();

    var blocks = '';
    state.classes.forEach(function (entry) {
      var klass = data.classes[entry.slug];
      if (!klass || !klass.tricks || !klass.tricks.length) return;
      var available = klass.tricks.filter(function (t) { return t.level <= entry.level; });
      if (!available.length) return;

      var known = knownTricksFor(klass, entry.level);
      var chosenHere = 0;
      available.forEach(function (tier) {
        tier.items.forEach(function (it) {
          if (state.tricks.indexOf(trickId(entry.slug, it.name)) !== -1) chosenHere++;
        });
      });
      var over = known != null && chosenHere > known;
      var atLimit = known != null && chosenHere >= known;
      var budgetText = known != null
        ? 'можно выбрать ' + known + ' · выбрано ' + chosenHere + ' · ' + (over ? ('лишних ' + (chosenHere - known)) : ('можно ещё ' + (known - chosenHere)))
        : ('выбрано ' + chosenHere);

      blocks += '<div class="cb-tricks__class" data-slug="' + esc(entry.slug) + '">';
      blocks += '<h4 class="cb-tricks__title">' + esc(klass.title) + ' — приёмы (ур. ' + entry.level + ')</h4>';
      blocks += '<div class="cb-tricks__budget' + (over ? ' cb-tricks__budget--over' : '') + '">' + esc(budgetText) + '</div>';
      available.forEach(function (tier) {
        blocks += '<div class="cb-tricks__tier">';
        blocks += '<div class="cb-tricks__tier-name">' + esc(tier.tier || ('Ступень, с ' + tier.level + ' ур.')) + '</div>';
        tier.items.forEach(function (it) {
          var id = trickId(entry.slug, it.name);
          var isChosen = state.tricks.indexOf(id) !== -1;
          var checked = isChosen ? ' checked' : '';
          var locked = atLimit && !isChosen;
          blocks += '<label class="cb-pick' + (locked ? ' cb-pick--locked' : '') + '">'
            + '<input type="checkbox" class="cb-trick" value="' + esc(id) + '"' + checked + (locked ? ' disabled' : '') + '>'
            + '<span class="cb-pick__name">' + esc(it.name) + '</span>'
            + (it.req ? '<span class="cb-pick__req">' + esc(it.req) + '</span>' : '')
            + '</label>';
        });
        blocks += '</div>';
      });
      blocks += '</div>';
    });

    var selCount = state.tricks.length;
    var summary = 'Приёмы <span class="cb-count" id="cbTrickCount">' + (selCount ? selCount : '') + '</span>';
    if (!blocks) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = '<details class="cb-picker" id="cbTricksBox"><summary>' + summary + ' <span class="cb-picker__hint">выбираемые приёмы</span></summary>'
      + '<div class="cb-picker__scroll">' + blocks + '</div></details>';
    var cb = q('#cbTricksBox');
    if (cb) cb.open = selCount > 0;
    updateTrickState();
  }

  // Приводит выбор приёмов в порядок: убирает недоступные (снизили уровень или
  // сменили класс) и лишние сверх известного числа приёмов для класса.
  function sanitizeTricks() {
    var ready = state.classes.every(function (e) { return !e.slug || data.classes[e.slug]; });
    if (!ready) return;

    var valid = {};
    state.classes.forEach(function (entry) {
      var klass = data.classes[entry.slug];
      if (!klass || !klass.tricks) return;
      klass.tricks.forEach(function (tier) {
        if (tier.level > entry.level) return;
        tier.items.forEach(function (it) { valid[trickId(entry.slug, it.name)] = true; });
      });
    });

    var remove = {};
    state.tricks.forEach(function (id) { if (!valid[id]) remove[id] = true; });

    state.classes.forEach(function (entry) {
      var klass = data.classes[entry.slug];
      if (!klass || !klass.tricks) return;
      var known = knownTricksFor(klass, entry.level);
      if (known == null) return;
      var selHere = state.tricks.filter(function (id) {
        return !remove[id] && id.indexOf(entry.slug + '::') === 0;
      });
      selHere.slice(known).forEach(function (id) { remove[id] = true; });
    });

    if (Object.keys(remove).length) {
      state.tricks = state.tricks.filter(function (id) { return !remove[id]; });
    }
  }

  // Обновляет счётчики и блокировку приёмов на месте, не пересобирая список (чтобы не сбить прокрутку).
  function updateTrickState() {
    qa('.cb-tricks__class').forEach(function (block) {
      var slug = block.getAttribute('data-slug');
      var entry = null;
      state.classes.forEach(function (e) { if (e.slug === slug) entry = e; });
      if (!entry) return;
      var klass = data.classes[slug];
      if (!klass || !klass.tricks) return;
      var chosen = 0;
      klass.tricks.forEach(function (tier) {
        if (tier.level > entry.level) return;
        tier.items.forEach(function (it) {
          if (state.tricks.indexOf(trickId(slug, it.name)) !== -1) chosen++;
        });
      });
      var known = knownTricksFor(klass, entry.level);
      var atLimit = known != null && chosen >= known;
      var el = q('.cb-tricks__budget', block);
      if (el) {
        var over = known != null && chosen > known;
        el.textContent = known != null
          ? 'можно выбрать ' + known + ' · выбрано ' + chosen + ' · ' + (over ? ('лишних ' + (chosen - known)) : ('можно ещё ' + (known - chosen)))
          : ('выбрано ' + chosen);
        el.classList.toggle('cb-tricks__budget--over', over);
      }
      qa('.cb-trick', block).forEach(function (cb) {
        var locked = atLimit && !cb.checked;
        cb.disabled = locked;
        var lbl = cb.closest ? cb.closest('.cb-pick') : null;
        if (lbl) lbl.classList.toggle('cb-pick--locked', locked);
      });
    });
  }

  function renderFeatsPicker() {
    var box = q('#cbFeats');
    if (!box) return;
    if (data.feats === null) {
      box.innerHTML = '<div class="cb-muted">Загрузка черт…</div>';
      return;
    }
    if (!data.feats.length) {
      box.innerHTML = '<div class="cb-muted">Список черт недоступен.</div>';
      return;
    }

    var cats = '';
    var seen = {};
    Object.keys(data.featsCats).forEach(function (k) {
      seen[k] = true;
      cats += '<option value="' + esc(k) + '">' + esc(data.featsCats[k]) + '</option>';
    });
    data.feats.forEach(function (f) {
      if (f.cat && !seen[f.cat]) { seen[f.cat] = true; cats += '<option value="' + esc(f.cat) + '">' + esc(f.catLabel || f.cat) + '</option>'; }
    });

    var list = data.feats.map(function (f) {
      var checked = state.feats.indexOf(f.name) !== -1 ? ' checked' : '';
      return '<label class="cb-pick" data-cat="' + esc(f.cat) + '" data-text="' + esc(f.name.toLowerCase()) + '">'
        + '<input type="checkbox" class="cb-feat" value="' + esc(f.name) + '"' + checked + '>'
        + '<span class="cb-pick__name">' + esc(f.name) + '</span>'
        + (f.catLabel ? '<span class="cb-pick__cat">' + esc(f.catLabel) + '</span>' : '')
        + '</label>';
    }).join('');

    box.innerHTML =
      '<details class="cb-picker" id="cbFeatsBox" open>'
      + '<summary>Черты <span class="cb-count" id="cbFeatCount"></span> <span class="cb-picker__hint">' + data.feats.length + ' доступно</span></summary>'
      + '<div class="cb-rules" id="cbFeatRules"></div>'
      + '<div class="cb-picker__tools">'
      + '<input type="search" id="cbFeatSearch" class="cb-search" placeholder="Поиск черты…">'
      + '<select id="cbFeatCat" class="cb-search"><option value="">Все категории</option>' + cats + '</select>'
      + '</div>'
      + '<div class="cb-picker__scroll" id="cbFeatList">' + list + '</div>'
      + '</details>';

    var s = q('#cbFeatSearch');
    if (s) s.value = data.featsSearch;
    var c = q('#cbFeatCat');
    if (c) c.value = data.featsCat;
    filterFeatList();
    updateFeatRules();
    updateFeatCount();
  }

  // Правила и бюджет черт: слоты от классов + бесплатная черта вида.
  function updateFeatRules() {
    var el = q('#cbFeatRules');
    if (!el) return;
    var info = featBudgetInfo();
    var sel = state.feats.length;
    var left = info.slots - sel;

    var html = '';
    html += '<p class="cb-rules__note">Черту можно взять вместо повышения характеристик '
      + '(классовое умение «Увеличение характеристик»). Требования черт не проверяются — сверяйтесь с описанием.</p>';
    if (info.parts.length) {
      html += '<p class="cb-rules__note">Увеличение характеристик доступно: ' + esc(info.parts.join('; ')) + '.</p>';
    } else {
      html += '<p class="cb-rules__note">Пока ни один класс не дал повышения характеристик, так что черт по уровням нет.</p>';
    }
    if (info.raceFeat) {
      html += '<p class="cb-rules__note">Вид «' + esc(info.race.title) + '» даёт одну черту сразу, без повышения характеристик.</p>';
    } else if (info.race) {
      html += '<p class="cb-rules__note">Вид «' + esc(info.race.title) + '» бесплатную черту не даёт.</p>';
    }
    html += '<p class="cb-rules__line">Доступно черт: <strong>' + info.slots + '</strong>. '
      + 'Выбрано <strong>' + sel + '</strong>'
      + (left >= 0 ? ' (можно ещё ' + left + ').' : ' — это больше доступного на ' + (-left) + '.')
      + '</p>';
    el.innerHTML = html;
    el.classList.toggle('cb-rules--over', left < 0);
  }

  function filterFeatList() {
    var list = q('#cbFeatList');
    if (!list) return;
    var term = (data.featsSearch || '').toLowerCase();
    qa('.cb-pick', list).forEach(function (lbl) {
      var okTerm = !term || (lbl.getAttribute('data-text') || '').indexOf(term) !== -1;
      var okCat = !data.featsCat || lbl.getAttribute('data-cat') === data.featsCat;
      lbl.style.display = (okTerm && okCat) ? '' : 'none';
    });
  }

  function updateFeatCount() {
    var el = q('#cbFeatCount');
    if (!el) return;
    var info = featBudgetInfo();
    var n = state.feats.length;
    el.textContent = info.slots > 0 ? (n + '/' + info.slots) : (n || '');
    el.classList.toggle('cb-count--over', n > info.slots);
  }

  /* ─────────────── отрисовка листа персонажа ─────────────── */

  function ability(name, lvl, html, cls) {
    return '<details class="pb-accordion cb-ability' + (cls ? ' ' + cls : '') + '">'
      + '<summary>' + esc(name) + (lvl ? '<span class="cb-lvl">' + esc(lvl) + '</span>' : '') + '</summary>'
      + '<div class="cb-ability__body">' + (html || '') + '</div>'
      + '</details>';
  }

  function groupTitle(title, sub) {
    return '<h3 class="cb-group__title">' + esc(title)
      + (sub ? ' <span class="cb-group__sub">' + esc(sub) + '</span>' : '') + '</h3>';
  }

  // Раздел «Характеристики» в листе — показываем, если игрок что-то заполнил.
  function statsSectionHtml() {
    var anyAbility = ABILITIES.some(function (a) { return numOrNull(state.abilities[a.key]) != null; });
    var anyCombat = ['hp', 'hpMax', 'ac', 'speed', 'init', 'hitDice'].some(function (k) {
      return String(state.combat[k] == null ? '' : state.combat[k]) !== '';
    });
    if (!anyAbility && !anyCombat) return '';

    var html = '<section class="cb-group cb-stats">';
    html += groupTitle('Характеристики', 'лист персонажа');

    html += '<div class="cb-stats__grid">';
    ABILITIES.forEach(function (a) {
      var score = numOrNull(state.abilities[a.key]);
      html += '<div class="cb-stat">'
        + '<span class="cb-stat__name">' + esc(a.short) + '</span>'
        + '<span class="cb-stat__score">' + (score == null ? '—' : score) + '</span>'
        + '<span class="cb-stat__mod">' + signed(abilityMod(a.key)) + '</span>'
        + '<span class="cb-stat__label">' + esc(a.label) + '</span>'
        + '</div>';
    });
    html += '</div>';

    var items = [];
    var hp = String(state.combat.hp == null ? '' : state.combat.hp);
    var hpMax = String(state.combat.hpMax == null ? '' : state.combat.hpMax);
    if (hp !== '' || hpMax !== '') {
      var hpText = (hp !== '' && hpMax !== '') ? (hp + ' / ' + hpMax) : (hp !== '' ? hp : hpMax);
      items.push(['Хиты', hpText]);
    }
    if (String(state.combat.ac == null ? '' : state.combat.ac) !== '') items.push(['Класс доспеха', state.combat.ac]);
    var init = initiativeValue();
    if (init != null) items.push(['Инициатива', signed(init)]);
    if (String(state.combat.speed == null ? '' : state.combat.speed) !== '') items.push(['Скорость', state.combat.speed]);
    var pp = passiveSkill('perception');
    if (pp != null) items.push(['Пассивное Восприятие', pp]);
    var pins = passiveSkill('insight');
    if (pins != null) items.push(['Пассивная Проницательность', pins]);
    var pinv = passiveSkill('investigation');
    if (pinv != null) items.push(['Пассивное Расследование', pinv]);
    items.push(['Кость мастерства', profDie(sumLevels())]);
    if (String(state.combat.hitDice == null ? '' : state.combat.hitDice) !== '') items.push(['Кость хитов', state.combat.hitDice]);

    html += '<div class="cb-stats__combat">';
    items.forEach(function (it) {
      html += '<span class="cb-combat-item"><span class="cb-combat-item__k">' + esc(it[0]) + '</span> <b>' + esc(it[1]) + '</b></span>';
    });
    html += '</div>';
    html += '</section>';
    return html;
  }

  // Раздел «Навыки» в листе — все навыки с бонусом и тем, из чего он складывается.
  function skillsSectionHtml() {
    var anyAbility = ABILITIES.some(function (a) { return numOrNull(state.abilities[a.key]) != null; });
    if (!anyAbility) return '';

    var die = profDie(sumLevels());
    var html = '<section class="cb-group cb-skills">' + groupTitle('Навыки', 'все навыки и что прибавляется');
    html += '<ul class="cb-skills__list">';
    SKILLS.forEach(function (s) {
      var lvl = state.skills[s.key] || 0;
      var mod = abilityMod(s.ab);
      var parts = [s.abShort + ' ' + signed(mod)];
      if (lvl >= 1) parts.push('владение ' + die);
      if (lvl >= 2) parts.push('экспертиза +' + die);
      html += '<li class="cb-skill-row' + (lvl >= 1 ? ' cb-skill-row--prof' : '') + '">'
        + '<span class="cb-skill-row__mark" aria-hidden="true">' + (lvl >= 1 ? '●' : '○') + '</span>'
        + '<span class="cb-skill-row__name">' + esc(s.name) + '</span>'
        + '<span class="cb-skill-row__calc">' + esc(parts.join(' · ')) + '</span>'
        + '<span class="cb-skill-row__bonus">' + esc(skillTotalText(s.key)) + '</span>'
        + '</li>';
    });
    html += '</ul>';
    html += '<p class="cb-skills__note">● — владение: к проверке прибавляется кость мастерства (к4…к12 по уровню). «Экспертиза» прибавляет ещё одну такую кость. ○ — без владения: только модификатор характеристики.</p>';
    html += '</section>';
    return html;
  }

  function renderOutput() {
    var out = q('#cbOutput');
    if (!out) return;

    var totalLevel = 0;
    state.classes.forEach(function (c) { totalLevel += clampInt(c.level, 1, 20); });
    var effectiveTotal = Math.min(totalLevel, 20);

    var race = findRace(state.race);
    var classNames = state.classes
      .filter(function (c) { return c.slug; })
      .map(function (c) {
        var k = data.classes[c.slug];
        var nm = k ? k.title : (data.classBySlug[c.slug] ? data.classBySlug[c.slug].title : c.slug);
        return nm + ' ' + c.level;
      });

    var html = '';

    /* Шапка листа */
    html += '<div class="cb-sheet">';
    html += '<h2 class="cb-sheet__name">' + esc(state.name || 'Безымянный герой') + '</h2>';
    html += '<p class="cb-sheet__meta">'
      + (race ? esc(race.title) : '<span class="cb-muted">вид не выбран</span>')
      + (classNames.length ? ' · ' + esc(classNames.join(' / ')) : '')
      + ' · суммарный уровень ' + effectiveTotal
      + ' · кость мастерства <strong>' + profDie(totalLevel) + '</strong>'
      + '</p>';
    var bioBits = [];
    if (state.bio.background) bioBits.push('Предыстория: ' + state.bio.background);
    if (state.bio.alignment) bioBits.push('Мировоззрение: ' + state.bio.alignment);
    if (bioBits.length) html += '<p class="cb-sheet__bio">' + esc(bioBits.join(' · ')) + '</p>';
    if (totalLevel > 20) {
      html += '<p class="cb-warn">Суммарный уровень больше 20 — правила мультикласса разрешают не более 20 уровней. Проверьте сами.</p>';
    }
    html += '</div>';

    /* Характеристики и боевые показатели */
    html += statsSectionHtml();

    /* Навыки */
    html += skillsSectionHtml();

    /* Вид */
    if (race) {
      var traits = parseRaceTraits(race.body);
      html += '<section class="cb-group">';
      html += groupTitle('Вид: ' + race.title);
      if (traits.length) {
        traits.forEach(function (t) { html += ability(t.name, '', t.desc); });
      } else {
        html += '<p class="cb-muted">Особенности вида не найдены — откройте <a href="../races/' + esc(race.slug) + '.html">страницу вида</a>.</p>';
      }
      html += '</section>';
    }

    /* Классы */
    state.classes.forEach(function (entry) {
      if (!entry.slug) return;
      var klass = data.classes[entry.slug];
      html += '<section class="cb-group">';
      if (!klass) {
        html += groupTitle('Класс', entry.slug) + '<p class="cb-muted">Загрузка…</p></section>';
        return;
      }
      var title = klass.title + ' — ' + entry.level + ' уровень';
      html += groupTitle(title, klass.subclassLabel ? 'классовые умения' : '');

      if (klass.error) {
        html += '<p class="cb-muted">Не удалось загрузить страницу класса.</p></section>';
        return;
      }

      var shown = 0;
      klass.features.forEach(function (f) {
        if (f.levels.length && Math.min.apply(null, f.levels) > entry.level) return;
        shown++;
        html += ability(f.name, levelsLabel(f.levels), f.html);
      });
      if (!shown) html += '<p class="cb-muted">На этом уровне умений нет.</p>';

      /* Подкласс */
      if (entry.level >= 3 && entry.subclass) {
        var sub = null;
        klass.subclasses.forEach(function (s) { if (s.id === entry.subclass) sub = s; });
        if (sub) {
          html += '<h4 class="cb-sub__title">' + esc(klass.subclassLabel || 'Подкласс') + ': ' + esc(sub.name)
            + (sub.tag ? ' <span class="cb-group__sub">' + esc(sub.tag) + '</span>' : '') + '</h4>';
          if (sub.intro) html += '<div class="cb-sub__intro">' + sub.intro + '</div>';
          var subShown = 0;
          sub.features.forEach(function (f) {
            if (f.levels.length && Math.min.apply(null, f.levels) > entry.level) return;
            subShown++;
            html += ability(f.name, levelsLabel(f.levels), f.html, 'cb-ability--sub');
          });
          if (!subShown) html += '<p class="cb-muted">Умения подкласса появляются на 3-м уровне и выше.</p>';
        }
      }

      html += '</section>';
    });

    /* Приёмы */
    var tricksHtml = '';
    var tricksBudget = '';
    state.classes.forEach(function (entry) {
      var klass = data.classes[entry.slug];
      if (!klass || !klass.tricks || !klass.tricks.length) return;
      var chosen = 0;
      klass.tricks.forEach(function (tier) {
        if (tier.level > entry.level) return;
        tier.items.forEach(function (it) {
          var id = trickId(entry.slug, it.name);
          if (state.tricks.indexOf(id) === -1) return;
          chosen++;
          tricksHtml += ability(it.name, it.req || levelsLabel([tier.level]), it.html, 'cb-ability--trick');
        });
      });
      var known = knownTricksFor(klass, entry.level);
      if (known != null) {
        var over = chosen > known;
        tricksBudget += '<p class="cb-budget' + (over ? ' cb-budget--over' : '') + '">'
          + esc(klass.title) + ': известно ' + known + ' · выбрано ' + chosen
          + (over ? ' — лишних ' + (chosen - known) : ' · можно ещё ' + (known - chosen)) + '.</p>';
      }
    });
    if (tricksBudget || tricksHtml) {
      html += '<section class="cb-group">' + groupTitle('Приёмы', 'выбранные') + tricksBudget + tricksHtml + '</section>';
    }

    /* Черты */
    var fInfo = featBudgetInfo();
    var featsHtml = '';
    state.feats.forEach(function (name) {
      var feat = null;
      (data.feats || []).forEach(function (f) { if (f.name === name) feat = f; });
      if (!feat) return;
      featsHtml += ability(feat.name, feat.catLabel, feat.html, 'cb-ability--feat');
    });
    if (fInfo.slots > 0 || fInfo.raceFeat || state.feats.length) {
      var fLeft = fInfo.slots - state.feats.length;
      var fLine = 'Доступно черт: ' + fInfo.slots + ' · выбрано ' + state.feats.length
        + (fLeft >= 0 ? ' · можно ещё ' + fLeft : ' — больше доступного на ' + (-fLeft));
      if (fInfo.raceFeat && fInfo.race) fLine += ' · вид «' + fInfo.race.title + '» даёт черту';
      html += '<section class="cb-group">' + groupTitle('Черты', 'выбранные')
        + '<p class="cb-budget' + (fLeft < 0 ? ' cb-budget--over' : '') + '">' + esc(fLine) + '.</p>'
        + featsHtml + '</section>';
    }

    /* Заметки */
    if (state.bio.notes) {
      html += '<section class="cb-group">' + groupTitle('Описание')
        + '<p class="cb-notes">' + esc(state.bio.notes) + '</p></section>';
    }

    out.innerHTML = html;

    updateFeatRules();
    updateFeatCount();
    updateSkillBonuses();
  }

  /* ─────────────── сохранение ─────────────── */

  function normalizeState(s) {
    if (!s || typeof s !== 'object') return;
    state.name = typeof s.name === 'string' ? s.name : '';
    state.race = typeof s.race === 'string' ? s.race : '';
    if (Array.isArray(s.classes) && s.classes.length) {
      state.classes = s.classes.map(function (c) {
        return { slug: String(c.slug || ''), level: clampInt(c.level, 1, 20), subclass: String(c.subclass || '') };
      });
    }
    state.tricks = Array.isArray(s.tricks) ? s.tricks.map(String) : [];
    state.feats = Array.isArray(s.feats) ? s.feats.map(String) : [];
    state.skills = {};
    if (s.skills && typeof s.skills === 'object') {
      SKILLS.forEach(function (sk) {
        var v = clampInt(s.skills[sk.key], 0, 2);
        if (v) state.skills[sk.key] = v;
      });
    }
    ABILITIES.forEach(function (a) {
      state.abilities[a.key] = (s.abilities && s.abilities[a.key] != null) ? String(s.abilities[a.key]) : '';
    });
    Object.keys(state.combat).forEach(function (k) {
      state.combat[k] = (s.combat && s.combat[k] != null) ? String(s.combat[k]) : '';
    });
    Object.keys(state.bio).forEach(function (k) {
      state.bio[k] = (s.bio && s.bio[k] != null) ? String(s.bio[k]) : '';
    });
  }

  function save() {
    var json = JSON.stringify(state);
    try { localStorage.setItem(STORAGE_KEY, json); } catch (e) { /* ignore */ }
    try {
      var enc = encodeURIComponent(json);
      if (location.hash !== '#p=' + enc) {
        history.replaceState(null, '', location.pathname + location.search + '#p=' + enc);
      }
    } catch (e) { /* ignore */ }
  }

  function shareUrl() {
    return location.origin + location.pathname + '#p=' + encodeURIComponent(JSON.stringify(state));
  }

  function load() {
    var restored = false;
    var m = location.hash.match(/^#p=(.+)$/);
    if (m) {
      try { normalizeState(JSON.parse(decodeURIComponent(m[1]))); restored = true; } catch (e) { /* ignore */ }
    }
    if (!restored) {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) { normalizeState(JSON.parse(raw)); restored = true; }
      } catch (e) { /* ignore */ }
    }
    if (!restored) state.classes = [{ slug: '', level: 1, subclass: '' }];
  }

  /* ─────────────── печать ─────────────── */

  function openAllDetails() {
    qa('#cbOutput details').forEach(function (d) {
      if (!d.open) { d.dataset.cbWasClosed = '1'; d.open = true; }
    });
  }
  function restoreDetails() {
    qa('#cbOutput details[data-cb-was-closed]').forEach(function (d) {
      d.open = false;
      delete d.dataset.cbWasClosed;
    });
  }

  /* ─────────────── события ─────────────── */

  function syncClassInputs() {
    // обновляем только состояния подклассов, не пересобирая строки целиком
    state.classes.forEach(function (entry, i) {
      var sel = q('.cb-subclass[data-i="' + i + '"]');
      if (!sel) return;
      var klass = data.classes[entry.slug];
      var valid = klass && klass.subclasses.length && entry.level >= 3;
      sel.disabled = !valid;
      if (valid && entry.subclass) sel.value = entry.subclass;
    });
  }

  function onClassSlugChange(i, slug) {
    var entry = state.classes[i];
    entry.slug = slug;
    entry.subclass = '';
    renderClassRows();
    if (slug) {
      ensureClass(slug).then(function () {
        renderClassRows();
        renderTricksPicker();
        renderOutput();
      });
    } else {
      renderTricksPicker();
      renderOutput();
    }
    save();
  }

  function ensureAllClasses() {
    var promises = state.classes
      .filter(function (c) { return c.slug; })
      .map(function (c) { return ensureClass(c.slug); });
    if (!promises.length) { renderOutput(); return; }
    Promise.all(promises).then(function () {
      renderClassRows();
      renderTricksPicker();
      renderOutput();
      save(); // могли убраться приёмы, ставшие недоступными
    });
  }

  function bind() {
    var raceSel = q('#cbRace');
    if (raceSel) raceSel.addEventListener('change', function () {
      state.race = this.value; renderOutput(); save();
    });

    var nameInput = q('#cbName');
    if (nameInput) nameInput.addEventListener('input', function () {
      state.name = this.value; renderOutput(); save();
    });

    var abBox = q('#cbAbilities');
    if (abBox) abBox.addEventListener('input', function (e) {
      var t = e.target;
      if (!t.classList || !t.classList.contains('cb-ab-input')) return;
      var key = t.getAttribute('data-key');
      state.abilities[key] = t.value;
      var mod = q('.cb-ab__mod[data-key="' + key + '"]');
      if (mod) mod.textContent = signed(abilityMod(key));
      renderOutput(); save();
    });

    var combatBox = q('#cbCombat');
    if (combatBox) combatBox.addEventListener('input', function (e) {
      var map = { cbHp: 'hp', cbHpMax: 'hpMax', cbAc: 'ac', cbSpeed: 'speed', cbInit: 'init', cbHitDice: 'hitDice' };
      var f = map[e.target.id];
      if (f) { state.combat[f] = e.target.value; renderOutput(); save(); }
    });

    var bioBox = q('#cbBio');
    if (bioBox) bioBox.addEventListener('input', function (e) {
      var map = { cbBackground: 'background', cbAlignment: 'alignment', cbNotes: 'notes' };
      var f = map[e.target.id];
      if (f) { state.bio[f] = e.target.value; renderOutput(); save(); }
    });

    var skillsBox = q('#cbSkills');
    if (skillsBox) {
      skillsBox.addEventListener('change', function (e) {
        var t = e.target;
        var key = t.getAttribute('data-key');
        if (!key) return;
        if (t.classList.contains('cb-skill-prof')) {
          if (t.checked) state.skills[key] = Math.max(1, state.skills[key] || 0);
          else delete state.skills[key];
        } else if (t.classList.contains('cb-skill-exp')) {
          state.skills[key] = t.checked ? 2 : 1;
        } else {
          return;
        }
        syncSkillRow(key);
        updateSkillBonuses();
        renderOutput();
        save();
      });
    }

    var classesBox = q('#cbClasses');
    if (classesBox) {
      classesBox.addEventListener('change', function (e) {
        var t = e.target;
        var i = parseInt(t.getAttribute('data-i'), 10);
        if (t.classList.contains('cb-class')) {
          onClassSlugChange(i, t.value);
        } else if (t.classList.contains('cb-level')) {
          state.classes[i].level = clampInt(t.value, 1, 20);
          t.value = state.classes[i].level;
          syncClassInputs();
          renderTricksPicker();
          renderOutput();
          save();
        } else if (t.classList.contains('cb-subclass')) {
          state.classes[i].subclass = t.value;
          renderOutput();
          save();
        }
      });
      classesBox.addEventListener('input', function (e) {
        var t = e.target;
        if (t.classList.contains('cb-level')) {
          var i = parseInt(t.getAttribute('data-i'), 10);
          state.classes[i].level = clampInt(t.value, 1, 20);
          syncClassInputs();
          renderTricksPicker();
          renderOutput();
          save();
        }
      });
      classesBox.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('.cb-remove') : null;
        if (!btn) return;
        var i = parseInt(btn.getAttribute('data-i'), 10);
        state.classes.splice(i, 1);
        if (!state.classes.length) state.classes.push({ slug: '', level: 1, subclass: '' });
        renderClassRows();
        renderTricksPicker();
        renderOutput();
        save();
      });
    }

    var addBtn = q('#cbAddClass');
    if (addBtn) addBtn.addEventListener('click', function () {
      state.classes.push({ slug: '', level: 1, subclass: '' });
      renderClassRows();
      renderOutput();
      save();
    });

    var tricksBox = q('#cbTricks');
    if (tricksBox) tricksBox.addEventListener('change', function (e) {
      var t = e.target;
      if (!t.classList || !t.classList.contains('cb-trick')) return;
      var v = t.value;
      var idx = state.tricks.indexOf(v);
      if (t.checked && idx === -1) state.tricks.push(v);
      if (!t.checked && idx !== -1) state.tricks.splice(idx, 1);
      var cnt = q('#cbTrickCount');
      if (cnt) cnt.textContent = state.tricks.length || '';
      updateTrickState();
      renderOutput();
      save();
    });

    var featsBox = q('#cbFeats');
    if (featsBox) {
      featsBox.addEventListener('change', function (e) {
        var t = e.target;
        if (t.classList && t.classList.contains('cb-feat')) {
          var v = t.value;
          var idx = state.feats.indexOf(v);
          if (t.checked && idx === -1) state.feats.push(v);
          if (!t.checked && idx !== -1) state.feats.splice(idx, 1);
          updateFeatCount();
          renderOutput();
          save();
        } else if (t.id === 'cbFeatCat') {
          data.featsCat = t.value; filterFeatList();
        }
      });
      featsBox.addEventListener('input', function (e) {
        if (e.target.id === 'cbFeatSearch') {
          data.featsSearch = e.target.value; filterFeatList();
        }
      });
    }

    var printBtn = q('#cbPrint');
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });

    var copyBtn = q('#cbCopy');
    if (copyBtn) copyBtn.addEventListener('click', function () {
      var url = shareUrl();
      var done = function () {
        var old = copyBtn.textContent;
        copyBtn.textContent = 'Ссылка скопирована ✓';
        setTimeout(function () { copyBtn.textContent = old; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { window.prompt('Скопируйте ссылку:', url); });
      } else {
        window.prompt('Скопируйте ссылку:', url);
      }
    });

    var resetBtn = q('#cbReset');
    if (resetBtn) resetBtn.addEventListener('click', function () {
      if (!window.confirm('Сбросить персонажа?')) return;
      state = {
        name: '', race: '', classes: [{ slug: '', level: 1, subclass: '' }], tricks: [], feats: [],
        abilities: { str: '', dex: '', con: '', int: '', wis: '', cha: '' },
        skills: {},
        combat: { hp: '', hpMax: '', ac: '', speed: '', init: '', hitDice: '' },
        bio: { background: '', alignment: '', notes: '' }
      };
      data.featsSearch = '';
      data.featsCat = '';
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
      if (nameInput) nameInput.value = '';
      if (raceSel) raceSel.value = '';
      renderStatsInputs();
      renderSkillsPicker();
      renderClassRows();
      renderTricksPicker();
      renderFeatsPicker();
      renderOutput();
      save();
    });

    window.addEventListener('beforeprint', openAllDetails);
    window.addEventListener('afterprint', restoreDetails);
  }

  /* ─────────────── запуск ─────────────── */

  function init() {
    load();

    var nameInput = q('#cbName');
    if (nameInput) nameInput.value = state.name;

    renderStatsInputs();
    renderSkillsPicker();
    renderRaceSelect();
    renderClassRows();
    renderFeatsPicker();
    renderTricksPicker();
    renderOutput();
    bind();

    loadClassIndex().then(function (list) {
      data.classIndex = list;
      list.forEach(function (c) { data.classBySlug[c.slug] = c; });
      renderClassRows();
      ensureAllClasses();
    });

    loadFeats().then(function () {
      renderFeatsPicker();
      renderOutput();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
