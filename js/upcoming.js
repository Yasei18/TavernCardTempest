/* Виджет «Ближайшая Буря» на главной: дата и счётчик дней до сходки.
   Данные берёт из UPCOMING_GATHERING (js/upcoming-gathering.js). */
document.addEventListener('DOMContentLoaded', function () {
  var elDate = document.getElementById('nextGatheringDate');
  var elIn = document.getElementById('nextGatheringIn');
  if (!elDate && !elIn) return;
  if (!window.UPCOMING_GATHERING || !UPCOMING_GATHERING.date) return;

  var g = UPCOMING_GATHERING;
  var target = new Date(g.date + 'T' + (g.time || '12:00') + ':00');
  if (isNaN(target.getTime())) return;

  var weekday = target.toLocaleDateString('ru-RU', { weekday: 'long' });
  var dayMonth = target.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  elDate.textContent = capitalize(weekday) + ', ' + dayMonth;

  var elPlace = document.getElementById('nextGatheringPlace');
  if (elPlace && g.place) elPlace.textContent = g.place;

  if (!elIn) return;

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var startTarget = new Date(target);
  startTarget.setHours(0, 0, 0, 0);
  var days = Math.round((startTarget - today) / 86400000);

  if (days < 0) {
    elIn.textContent = 'Дата уточняется — следи за анонсами в Шумном Зале';
  } else if (days === 0) {
    elIn.textContent = 'Сегодня! Ждём тебя с ' + (g.time || '12:00') + ':00.';
  } else if (days === 1) {
    elIn.textContent = 'Уже завтра — не забудь записаться!';
  } else {
    elIn.textContent = 'Через ' + days + ' ' + plural(days, 'день', 'дня', 'дней');
  }
});

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