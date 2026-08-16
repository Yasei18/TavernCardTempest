// Реестр карт Орвея.
// Для каждой карты: заголовок, размер исходного изображения (пиксели при maxZoom=4),
// путь к тайлам, ссылки на данные точек и границ, имена JS-переменных и файлов для экспорта.
// Загружается ПОСЛЕ main.js, bounds.js, alvaera.js, pomerania.js.
var ORVEYMAPS = {
  "orvey": {
    "title": "Мир Орвей",
    "imgW": 4168,
    "imgH": 2603,
    "tiles": "./static/maps/tiles/{z}/{x}/{y}.png",
    "tilesRoot": "",
    "points": orveymap,
    "regions": orveyregions,
    "pointsFile": "main.js",
    "regionsFile": "bounds.js",
    "pointsVar": "orveymap",
    "regionsVar": "orveyregions"
  },
  "alvaera": {
    "title": "Аль'Ваэра",
    "imgW": 4252,
    "imgH": 2687,
    "tiles": "./static/maps/tiles/alvaera/{z}/{x}/{y}.png",
    "tilesRoot": "alvaera",
    "points": alvaeramap,
    "regions": alvaeraregions,
    "pointsFile": "alvaera.js",
    "regionsFile": "alvaera-bounds.js",
    "pointsVar": "alvaeramap",
    "regionsVar": "alvaeraregions"
  },
  "pomerania": {
    "title": "Померания",
    "imgW": 3508,
    "imgH": 2480,
    "tiles": "./static/maps/tiles/pomerania/{z}/{x}/{y}.png",
    "tilesRoot": "pomerania",
    "points": pomeraniamap,
    "regions": pomeraniaregions,
    "pointsFile": "pomerania.js",
    "regionsFile": "pomerania-bounds.js",
    "pointsVar": "pomeraniamap",
    "regionsVar": "pomeraniaregions"
  }
};
