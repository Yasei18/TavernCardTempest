# Таверна «Карточная Буря»

> Двери открыты для всякого путника! ⚜

Сайт сообщества настольных ролевых игр. Таверна — это место, где друзья собираются
за играми, вдохновляют жизнь в персонажей D&D под надзором ГМ и просто хорошо
проводят время.

## Что внутри

- **Главная** (`index.html`) — о Таверне, карточки направлений, команда и контакты.
- **Коллекция** (`games.html`) — каталог настольных игр с поиском, фильтрами по
  жанрам и списком дополнений.
- **Бури** — регулярные очные встречи: игры, ведущие, чай и печенье. Записаться
  можно на странице `booking.html`.
- **Отголоски Бури** (`otgoloski.html`) — отчёты и хроники прошедших встреч.
- **Орвей** (`wiki/`) — вики по авторскому игровому миру, где проходят наши
  кампании.

## Орвей — вики мира

- `wiki.html` — обзор мира и карта.
- `alvaera.html`, `kelarim.html`, `zadubravye.html`, `snezhnaya-pustosh.html` — регионы.
- `races.html` и `races/*.html` — 28 страниц рас, населяющих Орвей.

Шапка вики выполнена в фирменном синем стиле Таверны, а на мобильных (до 770px)
навигация превращается в выпадающее меню-бургер.

## Структура проекта

```
├── index.html          # Главная
├── booking.html        # Запись на Бури
├── otgoloski.html      # Отчёты с встреч
├── games.html          # Каталог игр
├── wiki/               # Вики мира Орвей
│   ├── wiki.html       # Обзор мира
│   ├── races.html      # Список рас
│   ├── races/          # Страницы рас
│   ├── faiths/         # Страницы верований
│   ├── player-book/    # Книга игрока
│   ├── alvaera.html    # Регион
│   ├── kelarim.html    # Регион
│   ├── zadubravye.html # Регион
│   ├── snezhnaya-pustosh.html # Регион
│   ├── js/main.js      # Мобильное меню и фишки вики
│   └── static/         # Стили и карта вики
├── css/                # Стили главного сайта
├── js/                 # Скрипты главного сайта
├── img/                # Изображения
├── fonts/              # Шрифты
└── scripts/build.js    # Сборка страниц рас/верований, поиска вики и данных конструктора
```

## Сборка

Вики генерируется из данных (`wiki/js/data.js`):

```bash
node scripts/build.js races     # wiki/races/*.html
node scripts/build.js faiths    # wiki/faiths/*.html
node scripts/build.js search    # wiki/js/search-data.js и browse-data.js
node scripts/build.js character # wiki/js/character-data.js (конструктор персонажа)
node scripts/build.js all       # всё вместе
```

## Мы в сети

- Telegram — [tavern_card_tempest](https://t.me/tavern_card_tempest)
- ВКонтакте — [taverncardtempest](https://vk.com/taverncardtempest)
- YouTube — [@CardTempestTavern](https://www.youtube.com/@CardTempestTavern)
- Twitch — [tavern_card_tempest](https://www.twitch.tv/tavern_card_tempest)
- Discord — [Шумный Зал](https://discord.gg/AAMw8UJCj5)

Присоединяйтесь к Буре! 🌪️
