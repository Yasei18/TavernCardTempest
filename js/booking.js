var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwX3xN3NZHwtR_0zZJ_qUrencxADQYdzhiEDfjtLDqrLQ-liacmtYEy40XH4rU3trIvrg/exec';
var SITE_SECRET = '6LdKDIctAAAAAMk4kwuGrcFY4UXDuhZVUUhNBXdC';
/* ВАЖНО: SITE_SECRET лежит в публичном коде сайта, поэтому он лишь отпугивает
   случайных ботов. Настоящая защита от спама — reCAPTCHA ниже.
   Если ключ меняется — обновите и здесь, и в таблице (меню «Таверна» → «Ключ сайта»). */

/* reCAPTCHA v3 (рекомендуется): вставьте сюда SITE-ключ с
   https://www.google.com/recaptcha/admin (тип v3, «невидимый»).
   SECRET-ключ сохраните в таблице: меню «Таверна» → «Ключ reCAPTCHA».
   Пока SITE-ключ пустой — капча отключена, форма работает как раньше. */
var RECAPTCHA_SITE_KEY = '6LdKDIctAAAAAMk4kwuGrcFY4UXDuhZVUUhNBXdC';

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('bookingForm');
  var firstTime = document.getElementById('firstTime');
  var inviterFields = document.getElementById('inviterFields');
  var status = document.getElementById('formStatus');
  var gatheringSelect = document.getElementById('gathering');

  function addGatheringOption(label, date) {
    var opt = document.createElement('option');
    opt.value = label;
    var text = label;
    if (date && text.indexOf(date) === -1) {
      text += ' — ' + date;
    }
    opt.textContent = text;
    opt.setAttribute('data-date', date || '');
    gatheringSelect.appendChild(opt);
  }

  /* Пересобирает список сходок, сохраняя текущий выбор пользователя.
     «Пока не определился» не дублируется, даже если пришёл из таблицы. */
  function buildGatheringList(list) {
    var current = gatheringSelect.value;
    gatheringSelect.innerHTML = '';

    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Выбери Бурю…';
    gatheringSelect.appendChild(placeholder);

    var hasUndecided = false;
    for (var i = 0; i < list.length; i++) {
      var label = list[i] && list[i].label ? list[i].label : '';
      if (!label) continue;
      if (label === 'Пока не определился') hasUndecided = true;
      addGatheringOption(label, (list[i] && list[i].date) || '');
    }
    if (!hasUndecided) addGatheringOption('Пока не определился', '');

    var index = -1;
    for (var j = 0; j < gatheringSelect.options.length; j++) {
      if (gatheringSelect.options[j].value === current) { index = j; break; }
    }
    gatheringSelect.selectedIndex = index >= 0 ? index : 0;
  }

  /* Разбор даты из строки: DD.MM.YYYY или YYYY-MM-DD. */
  function parseGatheringDate(str) {
    if (!str) return null;
    var m = String(str).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    m = String(str).match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    return null;
  }

  /* Отсекаем прошедшие и тестовые сходки из таблицы, сортируем от ближайшей.
     «Пока не определился» всегда добавляем последней строкой. */
  var TEST_GATHERING_RE = /(тест|test|пробн|пример|demo|уч[её]бн)/i;

  function sanitizeGatherings(list) {
    if (!list) return [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var seen = {};
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (item) {
      var label = item && item.label ? String(item.label).trim() : '';
      if (!label) return;
      if (label === 'Пока не определился') return;
      if (TEST_GATHERING_RE.test(label)) return;
      var date = item && item.date ? String(item.date).trim() : '';
      var d = parseGatheringDate(date || label);
      if (d && d.getTime() < today.getTime()) return;
      if (seen[label]) return;
      seen[label] = true;
      out.push({ label: label, date: date });
    });
    out.sort(function (a, b) {
      var da = parseGatheringDate(a.date || a.label);
      var db = parseGatheringDate(b.date || b.label);
      if (da && db) return da.getTime() - db.getTime();
      if (da) return -1;
      if (db) return 1;
      return a.label.localeCompare(b.label, 'ru');
    });
    out.push({ label: 'Пока не определился', date: '' });
    return out;
  }

  /* Список сходок берём только из Google-таблицы (вкладки «Сходка …»):
     ни резервного списка, ни кеша — в таблице всегда актуальные даты.
     Кеш-бастер в URL и cache: 'no-store' обходят агрессивное кеширование
     мобильных браузеров, из-за которого список мог не обновляться. */
  if (gatheringSelect) {
    fetch(WEB_APP_URL + '?action=sheets&_=' + Date.now(), { cache: 'no-store' })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.result === 'ok' && data.gatherings && data.gatherings.length) {
          buildGatheringList(sanitizeGatherings(data.gatherings));
        }
      })
      .catch(function () {
        /* пока не получена таблица — в списке остаётся только плейсхолдер */
      });
  }

  /* «@» сам подставляется на бэкенде — в форме не заставляем и не позволяем
     вводить его, иначе никнейм дублируется (@@никнейм). */
  function stripAt(input) {
    if (!input) return;
    input.addEventListener('input', function () {
      if (input.value.charAt(0) === '@') {
        input.value = input.value.replace(/^@+/, '');
      }
    });
  }
  stripAt(document.getElementById('telegram'));
  stripAt(document.getElementById('inviterTelegram'));

  firstTime.addEventListener('change', function () {
    inviterFields.classList.toggle('hidden', !firstTime.checked);
  });

  var telegramHint = document.getElementById('telegramHint');
  if (telegramHint) {
    telegramHint.addEventListener('click', function () {
      var hint = telegramHint.closest('.field-hint');
      var open = hint.classList.toggle('open');
      telegramHint.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var button = form.querySelector('button[type="submit"]');
    var statusMsg = document.getElementById('formStatus');

    if (form.website && form.website.value.trim()) {
      button.disabled = true;
      statusMsg.className = 'form-status success';
      statusMsg.textContent = 'Хозяин Таверны получил вашу весть! Место за вами. До встречи за игровым столом!';
      form.reset();
      button.disabled = false;
      return;
    }

    var chosenDate = '';
    if (gatheringSelect && gatheringSelect.selectedIndex > 0) {
      chosenDate = gatheringSelect.options[gatheringSelect.selectedIndex].getAttribute('data-date') || '';
    }

    var payload = {
      name: form.name.value.trim(),
      telegram: form.telegram.value.trim().replace(/^@+/, ''),
      gathering: gatheringSelect ? gatheringSelect.value : '',
      gatheringDate: chosenDate,
      firstTime: firstTime.checked,
      inviterName: inviterFields.classList.contains('hidden') ? '' : form.inviterName.value.trim(),
      inviterTelegram: inviterFields.classList.contains('hidden') ? '' : form.inviterTelegram.value.trim().replace(/^@+/, ''),
      gameWish: form.gameWish.value.trim(),
      website: form.website.value.trim(),
      secret: SITE_SECRET
    };

    var send = function (captchaToken) {
      if (captchaToken) {
        payload.captchaToken = captchaToken;
      }
      button.disabled = true;
      status.className = 'form-status';
      status.textContent = 'Отправляем весть в Таверну…';

      fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (data && data.result === 'ok') {
            status.classList.add('success');
            status.textContent = data.message || 'Хозяин Таверны получил вашу весть! Место за вами. До встречи за игровым столом!';
            form.reset();
            inviterFields.classList.add('hidden');
          } else {
            throw new Error(data && data.message ? data.message : 'bad response');
          }
        })
        .catch(function (err) {
          status.classList.add('error');
          status.textContent = (err && err.message && err.message !== 'bad response')
            ? err.message
            : 'Не удалось отправить весть. Попробуйте ещё раз или напишите в Шумный Зал: @TavernCardTempest_Chat';
        })
        .finally(function () {
          button.disabled = false;
        });
    };

    /* Получение токена reCAPTCHA v3 (если капча включена) и отправка формы. */
    var sendWithCaptcha = function () {
      if (!RECAPTCHA_SITE_KEY) {
        send('');
        return;
      }
      var script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=' + encodeURIComponent(RECAPTCHA_SITE_KEY);
      script.async = true;
      script.onload = function () {
        try {
          grecaptcha.ready(function () {
            grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'booking' })
              .then(function (token) { send(token); })
              .catch(function () { send(''); });
          });
        } catch (e) {
          send('');
        }
      };
      script.onerror = function () { send(''); };
      document.head.appendChild(script);
    };

    /* Если этот ник уже регистрировался на выбранную Бурю — не шлём повторно. */
    var checkDuplicate = function () {
      if (!payload.telegram || !payload.gathering || payload.gathering === 'Пока не определился') {
        sendWithCaptcha();
        return;
      }
      fetch(WEB_APP_URL + '?action=check&gathering=' + encodeURIComponent(payload.gathering) + '&telegram=' + encodeURIComponent(payload.telegram))
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (data && data.result === 'ok' && data.exists) {
            status.className = 'form-status success';
            status.textContent = 'Вы уже возвестили о визите на эту Бурю — спасибо, что перепроверили!';
            form.reset();
            inviterFields.classList.add('hidden');
          } else {
            sendWithCaptcha();
          }
        })
        .catch(function () {
          sendWithCaptcha();
        });
    };

    checkDuplicate();
  });
});
