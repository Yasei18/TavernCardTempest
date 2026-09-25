/* Рендер расписания из EVENTS (js/events.js) в блок #scheduleList на главной.
   Показывает ближайшие события: прошедшие скрывает, ближайшее подсвечивает,
   у каждого выводит дату, вид, название и счётчик дней до события. */
(function () {
  var SCHEDULE_MAX = 9;

  var LABELS = {
    gathering: 'Сходка',
    youtube: 'YouTube',
    boosty: 'Boosty',
    twitch: 'Стрим',
    _default: 'Событие'
  };

  var ICONS = {
    gathering: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 8.997c0 5.25 7 13 7 13s7-7.75 7-13C19 5.13 15.87 2 12 2zm0 9.75A2.75 2.75 0 1 1 12 6a2.75 2.75 0 0 1 0 5.75z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    boosty: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.661 14.337 6.801 0h6.362L11.88 4.444l-.038.077-3.378 11.733h3.15c-1.321 3.289-2.35 5.867-3.086 7.733-5.816-.063-7.442-4.228-6.02-9.155M8.554 24l7.67-11.035h-3.25l2.83-7.073c4.852.508 7.137 4.33 5.791 8.952C20.16 19.81 14.344 24 8.68 24h-.127z"/></svg>',
    twitch: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>',
    _default: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z"/></svg>'
  };

  var ICON_CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13h-1.5v6l5.2 3.1.8-1.3-4.5-2.7z"/></svg>';

  document.addEventListener('DOMContentLoaded', function () {
    var listEl = document.getElementById('scheduleList');
    var emptyEl = document.getElementById('scheduleEmpty');
    if (!listEl) return;

    var events = (window.EVENTS && Array.isArray(EVENTS)) ? EVENTS : [];

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var dated = [];
    var undated = [];
    events.forEach(function (e) {
      var d = parseDate(e.date);
      if (!d) {
        /* Без даты — анонс «скоро»: всегда в конце расписания. */
        undated.push({ e: e, d: null });
      } else if (d.getTime() >= today.getTime()) {
        dated.push({ e: e, d: d });
      }
    });
    dated.sort(function (a, b) {
      return a.d.getTime() - b.d.getTime();
    });
    var upcoming = dated.concat(undated);

    if (!upcoming.length) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    var html = '';
    for (var i = 0; i < Math.min(upcoming.length, SCHEDULE_MAX); i++) {
      /* «Ближайшее» подсвечиваем только у ближайшей датированной сходки. */
      html += itemHtml(upcoming[i], i === 0 && dated.length > 0);
    }
    listEl.innerHTML = html;
    if (emptyEl) emptyEl.hidden = true;
  });

  function itemHtml(entry, isNext) {
    var e = entry.e;
    var d = entry.d;
    var type = LABELS[e.type] ? e.type : '_default';

    var day, month, weekday, inText, inMod, inIcon;
    var hasDate = !!d;
    if (hasDate) {
      day = d.getDate();
      month = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }).replace(/^\d+\s*/, '');
      weekday = capitalize(d.toLocaleDateString('ru-RU', { weekday: 'long' }));
      var counter = daysText(d);
      inText = counter.text;
      inMod = counter.mod;
      inIcon = ICON_CLOCK;
    } else {
      /* Без даты — вместо числа в «календаре» звезда и пометка «скоро». */
      day = '✦';
      month = 'скоро';
      weekday = '';
      inText = 'Дата уточняется';
      inMod = 'is-tbd';
      inIcon = '';
    }

    var kicker = (isNext ? 'Ближайшее · ' : '') + LABELS[type];
    if (e.time) kicker += ' · ' + e.time;

    var cls = 'schedule-item schedule-item--' + type + (isNext ? ' is-next' : '');

    var inner =
      '<div class="schedule-date">' +
        '<span class="schedule-day">' + day + '</span>' +
        '<span class="schedule-month">' + month + '</span>' +
        (weekday ? '<span class="schedule-weekday">' + weekday + '</span>' : '') +
        (e.time ? '<span class="schedule-time">' + escapeHtml(e.time) + '</span>' : '') +
      '</div>' +
      '<div class="schedule-card">' +
        '<span class="schedule-icon" aria-hidden="true">' + ICONS[type] + '</span>' +
        '<div class="schedule-main">' +
          '<p class="schedule-kicker">' + escapeHtml(kicker) + '</p>' +
          '<h3 class="schedule-title">' + escapeHtml(e.title) + '</h3>' +
          (e.desc ? '<p class="schedule-desc">' + escapeHtml(e.desc) + '</p>' : '') +
        '</div>' +
        '<p class="schedule-in ' + inMod + '">' + inIcon + '<span>' + escapeHtml(inText) + '</span></p>' +
      '</div>';

    return e.url
      ? '<a class="' + cls + '" href="' + escapeAttr(e.url) + '">' + inner + '</a>'
      : '<article class="' + cls + '">' + inner + '</article>';
  }

  function parseDate(str) {
    if (!str) return null;
    var d = new Date(String(str) + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }

  function daysText(d) {
    var start = new Date(d);
    start.setHours(0, 0, 0, 0);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var diff = Math.round((start - today) / 86400000);
    if (diff <= 0) return { text: 'Сегодня', mod: 'is-now' };
    if (diff === 1) return { text: 'Завтра', mod: 'is-now' };
    return {
      text: 'Через ' + diff + ' ' + plural(diff, 'день', 'дня', 'дней'),
      mod: diff <= 7 ? 'is-soon' : 'is-later'
    };
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  function plural(n, one, few, many) {
    var m10 = n % 10;
    var m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
})();