/* Главная «Мира Орвей»: кнопка случайной страницы и превью интерактивной карты.
   Данные для поиска подгружаются скриптом search-data.js, данные карты — скриптами
   static/map/data/main.js (orveymap) и static/map/data/bounds.js (orveyregions). */
(function () {
  'use strict';

  /* ---------- Случайная страница ---------- */
  var randomBtn = document.getElementById('randomPage');
  if (randomBtn) {
    randomBtn.addEventListener('click', function () {
      var urls = [];
      if (typeof WIKI_SEARCH_INDEX !== 'undefined' && WIKI_SEARCH_INDEX.length) {
        for (var i = 0; i < WIKI_SEARCH_INDEX.length; i++) {
          if (WIKI_SEARCH_INDEX[i].url) urls.push(WIKI_SEARCH_INDEX[i].url);
        }
      }
      if (!urls.length) {
        urls = [
          'alvaera.html', 'campaigns.html', 'faiths.html', 'kelarim.html',
          'oneshots.html', 'player-book.html', 'races.html', 'regions.html',
          'snezhnaya-pustosh.html', 'tools.html', 'usta-te.html',
          'weapons-kelarim.html', 'zadubravye.html', 'map.html'
        ];
      }
      window.location.href = urls[Math.floor(Math.random() * urls.length)];
    });
  }

  /* ---------- Превью карты ---------- */
  if (typeof L === 'undefined' || typeof orveymap === 'undefined' || typeof orveyregions === 'undefined') {
    return;
  }

  var canvas = document.getElementById('homeMap');
  if (!canvas) return;

  var MAXZOOM = 4;
  var cfg = {
    imgW: 4168,
    imgH: 2603,
    tiles: './static/maps/tiles/{z}/{x}/{y}.avif'
  };

  var map = L.map(canvas, {
    crs: L.CRS.Simple,
    maxZoom: MAXZOOM,
    minZoom: 1,
    zoomControl: false,
    scrollWheelZoom: false,
    keyboard: false,
    maxBoundsViscosity: 1,
    attributionControl: true
  });

  L.control.attribution({ position: 'bottomright' }).addTo(map);
  map.attributionControl.setPrefix('');
  map.attributionControl.addAttribution('мир © Таверна «Карточная Буря» · D&D 5e');

  function mapBounds() {
    var sw = map.unproject([0, cfg.imgH], MAXZOOM);
    var ne = map.unproject([cfg.imgW, 0], MAXZOOM);
    return L.latLngBounds(sw, ne);
  }

  var worldBounds = mapBounds();

  L.tileLayer(cfg.tiles, {
    tileSize: 512,
    preferCanvas: true,
    updateWhenIdle: false,
    reuseTiles: true,
    noWrap: true
  }).addTo(map);

  function pointToLayer(feature, latlng) {
    var newLatLng = map.unproject([latlng.lng, latlng.lat], MAXZOOM);
    return L.marker(newLatLng, {
      icon: L.icon({
        iconUrl: './static/map/distr/images/marker_' + feature.properties.cat + '.png',
        iconSize: [28, 28],
        iconAnchor: [14, 26],
        popupAnchor: [0, -24]
      }),
      riseOnHover: true,
      className: feature.properties.cat
    });
  }

  function onEachFeature(feature, layer) {
    var p = feature.properties;

    var html = '<div class="home-map__popup">' +
      '<div class="home-map__popup-title">' + (p.name || '') + '</div>' +
      (p.english ? '<div class="home-map__popup-sub">' + p.english + '</div>' : '') +
      (p.description ? '<div class="home-map__popup-desc">' + p.description + '</div>' : '') +
      (p.url ? '<a class="home-map__popup-link" target="_top" href="' + p.url + '">Читать в вики →</a>' : '') +
      '</div>';

    layer.bindPopup(html, { maxWidth: 260, autoPanPadding: [40, 40] });
    layer.bindTooltip(p.name, { sticky: true, permanent: false });
  }

  L.geoJSON(orveymap, {
    pointToLayer: pointToLayer,
    onEachFeature: onEachFeature
  }).addTo(map);

  var boundLayer = L.geoJSON(orveyregions, {
    coordsToLatLng: function (newcoords) {
      return map.unproject([newcoords[0], newcoords[1]], MAXZOOM);
    },
    style: function (feature) {
      return {
        fillColor: feature.properties.bg,
        weight: 2,
        color: '#ffffff',
        fillOpacity: 0.18
      };
    },
    onEachFeature: function (feature, layer) {
      layer.on({
        mouseover: function (e) {
          e.target.setStyle({ weight: 4, color: '#f7d51e', fillOpacity: 0.4 });
        },
        mouseout: function (e) {
          boundLayer.resetStyle(e.target);
        }
      });
      layer.bindTooltip(feature.properties.name, { sticky: true, permanent: true });
    }
  }).addTo(map);

  map.setMaxBounds(worldBounds);
  map.fitBounds(worldBounds);
})();