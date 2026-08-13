var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwX3xN3NZHwtR_0zZJ_qUrencxADQYdzhiEDfjtLDqrLQ-liacmtYEy40XH4rU3trIvrg/exec';
var SITE_SECRET = 'ef31e4c66d49fa162f40e7515e93b1e7';

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

  function renderGatherings(list) {
    for (var i = 0; i < list.length; i++) {
      addGatheringOption(list[i].label, list[i].date || '');
    }
    addGatheringOption('Пока не определился', '');
  }

  function renderFallbackGatherings() {
    if (typeof GATHERINGS !== 'undefined' && GATHERINGS.length) {
      renderGatherings(GATHERINGS);
    } else {
      addGatheringOption('Пока не определился', '');
    }
  }

  /* Список сходок приходит из Google-таблицы (вкладки «Сходка …»).
     Если таблица не ответила — используем резервный список из js/gatherings.js. */
  if (gatheringSelect) {
    fetch(WEB_APP_URL + '?action=sheets')
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.result === 'ok' && data.gatherings && data.gatherings.length) {
          renderGatherings(data.gatherings);
        } else {
          renderFallbackGatherings();
        }
      })
      .catch(function () {
        renderFallbackGatherings();
      });
  }

  firstTime.addEventListener('change', function () {
    inviterFields.classList.toggle('hidden', !firstTime.checked);
  });

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
      telegram: form.telegram.value.trim(),
      gathering: gatheringSelect ? gatheringSelect.value : '',
      gatheringDate: chosenDate,
      firstTime: firstTime.checked,
      inviterName: inviterFields.classList.contains('hidden') ? '' : form.inviterName.value.trim(),
      inviterTelegram: inviterFields.classList.contains('hidden') ? '' : form.inviterTelegram.value.trim(),
      gameWish: form.gameWish.value.trim(),
      website: form.website.value.trim(),
      secret: SITE_SECRET
    };

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
          throw new Error('bad response');
        }
      })
      .catch(function () {
        status.classList.add('error');
        status.textContent = 'Не удалось отправить весть. Попробуйте ещё раз или напишите в Шумный Зал: @TavernCardTempest_Chat';
      })
      .finally(function () {
        button.disabled = false;
      });
  });
});
