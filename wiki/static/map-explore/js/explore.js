/* ============================================================
   EXPLORE MAP — Логика иммерсивной карты Орвея
   ============================================================ */
(function () {
  'use strict';

  var D = EXPLORE_DATA;
  var state = {
    scale: 1,
    minScale: 0.4,
    maxScale: 4,
    panX: 0,
    panY: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    panStartX: 0,
    panStartY: 0,
    activeRegion: null,
    panelOpen: false,
    imgW: 0,
    imgH: 0,
    dragDist: 0
  };
  var detailedMode = false;
  var detailedRegionId = null;

  /* ---------- DOM ---------- */
  var loading = document.getElementById('loading');
  var loadingBar = document.getElementById('loading-bar');
  var loadingText = document.getElementById('loading-text');
  var viewport = document.getElementById('map-viewport');
  var world = document.getElementById('map-world');
  var img = document.getElementById('map-img');
  var svgOverlay = document.getElementById('svg-overlay');
  var panel = document.getElementById('region-panel');
  var minimap = document.getElementById('minimap');
  var minimapImg = document.getElementById('minimap-img');
  var minimapVP = document.getElementById('minimap-viewport');
  var zoomInBtn = document.getElementById('zoom-in');
  var zoomOutBtn = document.getElementById('zoom-out');
  var zoomResetBtn = document.getElementById('zoom-reset');
  var backBtn = document.getElementById('btn-back');
  var labelsContainer = null;

  /* ---------- Loading ---------- */
  var loadProgress = 0;

  function setLoadProgress(pct) {
    loadProgress = Math.max(loadProgress, pct);
    loadingBar.style.width = loadProgress + '%';
  }

  function hideLoading() {
    setLoadProgress(100);
    loadingText.textContent = 'Готово';
    setTimeout(function () {
      loading.classList.add('hidden');
      world.classList.add('visible');
      fitToView();
    }, 400);
  }

  /* ---------- Init ---------- */
  function init() {
    setLoadProgress(10);
    loadingText.textContent = 'Загрузка карты…';

    img.onload = onImageLoaded;
    img.onerror = function () {
      loadingText.textContent = 'Ошибка загрузки изображения';
    };
    img.src = D.mapImage;
  }

  function onImageLoaded() {
    setLoadProgress(40);
    state.imgW = img.naturalWidth;
    state.imgH = img.naturalHeight;
    world.style.width = state.imgW + 'px';
    world.style.height = state.imgH + 'px';
    img.style.width = state.imgW + 'px';
    img.style.height = state.imgH + 'px';

    loadingText.textContent = 'Подготовка…';
    setLoadProgress(60);

    buildSVGOverlay();
    buildMarkers();
    buildRegionLabels();
    buildMinimap();
    initEditor();
    bindEvents();

    setLoadProgress(80);
    setTimeout(hideLoading, 200);
  }

  /* ---------- Active regions (world OR detailed sub-regions) ---------- */
  function getActiveRegions() {
    if (detailedMode) {
      var region = D.regions.find(function (r) { return r.id === detailedRegionId; });
      return (region && region.subRegions) || [];
    }
    return D.regions;
  }

  /* ---------- SVG Overlay ---------- */
  function buildSVGOverlay() {
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');

    getActiveRegions().forEach(function (r) {
      var poly = document.createElementNS(svgNS, 'polygon');
      poly.setAttribute('points', r.polygon);
      poly.setAttribute('fill', r.color);
      poly.classList.add('region-poly');
      if (detailedMode) poly.classList.add('detailed');
      poly.setAttribute('data-region', r.id);

      poly.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!editorActive) openRegion(r.id);
      });

      svg.appendChild(poly);
    });

    svgOverlay.innerHTML = '';
    svgOverlay.appendChild(svg);
  }

  /* ---------- Markers ---------- */
  function buildMarkers() {
    return;
    var container = document.createElement('div');
    container.id = 'markers-container';

    D.worldMarkers.forEach(function (m, i) {
      var el = document.createElement('div');
      el.className = 'map-marker';
      el.style.left = m.x + '%';
      el.style.top = m.y + '%';
      el.style.setProperty('--pulse-delay', (i * 0.3) + 's');

      el.innerHTML =
        '<div class="map-marker-dot"></div>' +
        '<div class="map-marker-tooltip">' + m.name + '</div>';

      el.addEventListener('click', function (e) {
        e.stopPropagation();
        if (editorActive) return;
        if (m.url) window.location.href = m.url;
      });

      container.appendChild(el);
    });

    world.appendChild(container);
  }

  function polygonCentroid(polygonStr) {
    var nums = polygonStr.trim().split(/[\s,]+/).map(Number);
    var sx = 0, sy = 0, n = nums.length / 2;
    for (var i = 0; i < nums.length; i += 2) { sx += nums[i]; sy += nums[i + 1]; }
    return { x: sx / n, y: sy / n };
  }

  /* ---------- Region Labels ---------- */
  function buildRegionLabels() {
    if (labelsContainer) labelsContainer.remove();
    var container = document.createElement('div');
    container.id = 'labels-container';
    labelsContainer = container;

    getActiveRegions().forEach(function (r) {
      var label = document.createElement('div');
      label.className = 'region-label';

      if (r.city) {
        // Надпись города-государства: крепится к точке города
        label.classList.add('region-label-city');
        label.style.left = r.city.x + '%';
        label.style.top = r.city.y + '%';
        label.innerHTML =
          '<div>' +
          '<div class="region-label-name" data-region="' + r.id + '">' + r.name + '</div>' +
          '<div class="region-label-sub">' + (r.subtitle || '') + '</div>' +
          '</div>' +
          '<div class="city-marker"></div>';

        var shiftX = r.labelShift || 0;
        var shiftY = r.labelShiftY || 0;
        if (shiftX || shiftY) {
          label.querySelector('div').style.transform =
            'translateX(' + shiftX + 'px) translateY(' + shiftY + 'px)';
        }
      } else {
        var c = polygonCentroid(r.polygon);
        var off = r.labelOffset || { x: 0, y: 0 };
        label.style.left = (c.x + off.x) + '%';
        label.style.top = (c.y + off.y) + '%';
        label.innerHTML =
          '<div class="region-label-name" data-region="' + r.id + '">' + r.name + '</div>' +
          '<div class="region-label-sub">' + r.subtitle + '</div>';
      }

      if (r.labelSize) {
        label.querySelector('.region-label-name').style.fontSize = (48 * r.labelSize) + 'px';
      }

      label.querySelector('.region-label-name').addEventListener('click', function (e) {
        e.stopPropagation();
        if (editorActive) return;
        openRegion(r.id);
      });

      function highlightPoly(regionId, on) {
        var poly = svgOverlay.querySelector('.region-poly[data-region="' + regionId + '"]');
        if (poly) poly.classList.toggle('label-hovered', on);
      }

      label.querySelector('.region-label-name').addEventListener('mouseenter', function () { highlightPoly(r.id, true); });
      label.querySelector('.region-label-name').addEventListener('mouseleave', function () { highlightPoly(r.id, false); });

      container.appendChild(label);
    });

    world.appendChild(container);
  }

  /* ---------- Minimap ---------- */
  function buildMinimap() {
    minimapImg.src = D.mapImage;
    updateMinimap();
  }

  function updateMinimap() {
    if (!state.imgW) return;

    var mw = minimap.offsetWidth;
    var mh = (state.imgH / state.imgW) * mw;
    minimapImg.style.height = mh + 'px';

    var vw = viewport.offsetWidth;
    var vh = viewport.offsetHeight;

    var viewW = (vw / state.scale / state.imgW) * 100;
    var viewH = (vh / state.scale / state.imgH) * 100;
    var viewX = (-state.panX / state.scale / state.imgW) * 100;
    var viewY = (-state.panY / state.scale / state.imgH) * 100;

    viewX = Math.max(0, Math.min(100 - viewW, viewX));
    viewY = Math.max(0, Math.min(100 - viewH, viewY));

    minimapVP.style.left = viewX + '%';
    minimapVP.style.top = viewY + '%';
    minimapVP.style.width = Math.min(100, viewW) + '%';
    minimapVP.style.height = Math.min(100, viewH) + '%';
  }

  /* ---------- Zoom / Pan ---------- */
  function fitToView() {
    var vw = viewport.offsetWidth;
    var vh = viewport.offsetHeight;

    var scaleX = vw / state.imgW;
    var scaleY = vh / state.imgH;
    state.scale = Math.min(scaleX, scaleY) * 0.95;
    state.minScale = state.scale * 0.3;
    state.maxScale = state.scale * 8;
    state.panX = (vw - state.imgW * state.scale) / 2;
    state.panY = (vh - state.imgH * state.scale) / 2;

    applyTransform(true);
  }

  function zoomTo(newScale, cx, cy, animate) {
    cx = cx || viewport.offsetWidth / 2;
    cy = cy || viewport.offsetHeight / 2;

    var oldScale = state.scale;
    newScale = Math.max(state.minScale, Math.min(state.maxScale, newScale));

    var dx = cx - state.panX;
    var dy = cy - state.panY;
    state.panX = cx - dx * (newScale / oldScale);
    state.panY = cy - dy * (newScale / oldScale);
    state.scale = newScale;

    applyTransform(animate !== false);
    updateMinimap();
  }

  function applyTransform(animate) {
    if (animate) {
      world.style.transition = 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)';
    } else {
      world.style.transition = 'none';
    }
    world.style.transform = 'translate(' + state.panX + 'px, ' + state.panY + 'px) scale(' + state.scale + ')';
  }

  function clampPan() {
    var vw = viewport.offsetWidth;
    var vh = viewport.offsetHeight;
    var imgScaledW = state.imgW * state.scale;
    var imgScaledH = state.imgH * state.scale;

    var minX = vw - imgScaledW - 50;
    var maxX = 50;
    var minY = vh - imgScaledH - 50;
    var maxY = 50;

    if (imgScaledW <= vw) {
      state.panX = (vw - imgScaledW) / 2;
    } else {
      state.panX = Math.max(minX, Math.min(maxX, state.panX));
    }

    if (imgScaledH <= vh) {
      state.panY = (vh - imgScaledH) / 2;
    } else {
      state.panY = Math.max(minY, Math.min(maxY, state.panY));
    }
  }

  /* ---------- Region Panel ---------- */
  function openRegion(id) {
    var region = getActiveRegions().find(function (r) { return r.id === id; });
    if (!region) return;

    state.activeRegion = id;

    // Подсветка полигона
    document.querySelectorAll('.region-poly').forEach(function (p) {
      if (p.getAttribute('data-region') === id) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    // Заполнение панели
    var header = panel.querySelector('.panel-header');
    header.style.borderTopColor = region.color;
    header.style.borderTopWidth = '3px';

    panel.querySelector('.panel-region-name').textContent = region.name;
    panel.querySelector('.panel-region-subtitle').textContent = region.subtitle;

    var body = panel.querySelector('.panel-body');
    var html = '<p class="panel-desc">' + region.shortDesc + '</p>';

    // Инфоблок
    var infoKeys = Object.keys(region.info || {});
    if (infoKeys.length) {
      html += '<div class="panel-info">';
      infoKeys.forEach(function (key) {
        html += '<div class="panel-info-row">' +
          '<span class="panel-info-label">' + key + '</span>' +
          '<span class="panel-info-value">' + region.info[key] + '</span>' +
          '</div>';
      });
      html += '</div>';
    }

    // Кнопки
    html += '<div class="panel-actions">';
    if (region.page) {
      html += '<a class="panel-action-btn" href="' + region.page + '">Читать полностью →</a>';
    }
    if (region.detailedMap) {
      html += '<button class="panel-action-btn" onclick="EXPLORE_MAP.drillDown(\'' + region.id + '\')">Подробная карта ✈</button>';
    } else if (region.mapPage) {
      html += '<a class="panel-action-btn" href="' + region.mapPage + '">Подробная карта</a>';
    }
    html += '<button class="panel-action-btn panel-action-back" onclick="EXPLORE_MAP.resetView()">← К обзору</button>';
    html += '</div>';

    body.innerHTML = html;
    panel.classList.add('open');
    state.panelOpen = true;
  }

  function closePanel() {
    panel.classList.remove('open');
    state.panelOpen = false;
    state.activeRegion = null;

    document.querySelectorAll('.region-poly').forEach(function (p) {
      p.classList.remove('active');
    });
  }

  function resetView() {
    closePanel();
    fitToView();
  }

  /* Вернуться на главную (мировую) карту из любого состояния. */
  function goHome() {
    if (detailedMode) {
      drillBack();
    } else {
      resetView();
    }
  }

  /* ---------- Drill Down (подробная карта региона) ---------- */
  var loadingLogo = document.getElementById('loading-logo');
  var loadingTextEl = document.getElementById('loading-text');

  function showDrillLoading(logo, text) {
    loadingLogo.textContent = logo;
    if (text) loadingTextEl.textContent = text;
    loadProgress = 0;
    loadingBar.style.width = '0%';
    loading.classList.remove('hidden');
    setLoadProgress(12);
  }

  function hideDrillLoading() {
    loadingTextEl.textContent = 'Готово';
    setLoadProgress(100);
    setTimeout(function () {
      loading.classList.add('hidden');
    }, 500);
  }

  function drillDown(id) {
    var region = D.regions.find(function (r) { return r.id === id; });
    if (!region || !region.detailedMap || detailedMode) return;

    closePanel();
    detailedMode = true;
    detailedRegionId = id;

    // 1) Плавный зум на фокус-область региона
    var vw = viewport.offsetWidth;
    var vh = viewport.offsetHeight;
    var regionW = (region.focus.w / 100) * state.imgW;
    var regionH = (region.focus.h / 100) * state.imgH;
    var regionCX = ((region.focus.x + region.focus.w / 2) / 100) * state.imgW;
    var regionCY = ((region.focus.y + region.focus.h / 2) / 100) * state.imgH;

    var targetScale = Math.min(vw / regionW, vh / regionH) * 0.85;
    targetScale = Math.max(state.minScale, Math.min(state.maxScale, targetScale));
    var targetPanX = vw / 2 - regionCX * targetScale;
    var targetPanY = vh / 2 - regionCY * targetScale;

    world.style.transition = 'transform 1.1s cubic-bezier(0.4, 0, 0.2, 1)';
    state.scale = targetScale;
    state.panX = targetPanX;
    state.panY = targetPanY;
    applyTransform(false);

    // 2) Экран загрузки с золотым прогресс-баром (как при загрузке страницы)
    setTimeout(function () {
      showDrillLoading(region.name, 'Загрузка подробной карты…');
      setTimeout(function () { setLoadProgress(40); }, 250);
      setTimeout(function () { setLoadProgress(75); }, 550);

      setTimeout(function () {
        img.onload = function () {
          world.style.transition = 'none';
          state.imgW = region.detailedMapWidth || 1400;
          state.imgH = region.detailedMapHeight || 885;
          world.style.width = state.imgW + 'px';
          world.style.height = state.imgH + 'px';
          img.style.width = state.imgW + 'px';
          img.style.height = state.imgH + 'px';
          fitToView();
          svgOverlay.style.display = '';
          buildSVGOverlay();
          buildRegionLabels();
          if (labelsContainer) labelsContainer.style.display = '';
          backBtn.style.display = '';
          minimapImg.src = region.detailedMap;
          updateMinimap();
          hideDrillLoading();
        };
        img.src = region.detailedMap;
      }, 1000);
    }, 1150);
  }

  function drillBack() {
    if (!detailedMode) return;
    var region = D.regions.find(function (r) { return r.id === detailedRegionId; });

    showDrillLoading(region ? region.name : 'Орвей', 'Возвращение на карту мира…');
    setTimeout(function () { setLoadProgress(50); }, 250);
    setTimeout(function () { setLoadProgress(85); }, 550);

    setTimeout(function () {
      img.onload = function () {
        world.style.transition = 'none';
        detailedMode = false;
        detailedRegionId = null;
        state.imgW = D.mapWidth;
        state.imgH = D.mapHeight;
        world.style.width = state.imgW + 'px';
        world.style.height = state.imgH + 'px';
        img.style.width = state.imgW + 'px';
        img.style.height = state.imgH + 'px';
        svgOverlay.style.display = '';
        buildSVGOverlay();
        buildRegionLabels();
        if (labelsContainer) labelsContainer.style.display = '';
        backBtn.style.display = 'none';
        fitToView();
        minimapImg.src = D.mapImage;
        updateMinimap();
        hideDrillLoading();
      };
      img.src = D.mapImage;
    }, 800);
  }

  /* ---------- Events ---------- */
  function bindEvents() {
    // Pan — mouse
    viewport.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      if (editorActive) {
        editorClick(e.clientX, e.clientY);
        return;
      }
      state.dragging = true;
      state.dragDist = 0;
      state.dragStartX = e.clientX;
      state.dragStartY = e.clientY;
      state.panStartX = state.panX;
      state.panStartY = state.panY;
      world.style.transition = 'none';
    });

    window.addEventListener('mousemove', function (e) {
      if (!state.dragging) return;
      var dx = e.clientX - state.dragStartX;
      var dy = e.clientY - state.dragStartY;
      state.dragDist = Math.max(state.dragDist, Math.hypot(dx, dy));
      state.panX = state.panStartX + dx;
      state.panY = state.panStartY + dy;
      applyTransform(false);
      updateMinimap();
    });

    window.addEventListener('mouseup', function () {
      if (state.dragging) {
        state.dragging = false;
        clampPan();
        applyTransform(true);
        updateMinimap();
      }
    });

    // Pan — touch
    var touchStartDist = 0;
    var touchStartScale = 1;

    viewport.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        state.dragging = true;
        state.dragDist = 0;
        state.dragStartX = e.touches[0].clientX;
        state.dragStartY = e.touches[0].clientY;
        state.panStartX = state.panX;
        state.panStartY = state.panY;
        world.style.transition = 'none';
      } else if (e.touches.length === 2) {
        state.dragging = false;
        touchStartDist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        touchStartScale = state.scale;
      }
    }, { passive: true });

    viewport.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1 && state.dragging) {
        var dx = e.touches[0].clientX - state.dragStartX;
        var dy = e.touches[0].clientY - state.dragStartY;
        state.dragDist = Math.max(state.dragDist, Math.hypot(dx, dy));
        state.panX = state.panStartX + dx;
        state.panY = state.panStartY + dy;
        applyTransform(false);
        updateMinimap();
      } else if (e.touches.length === 2) {
        var dist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        var cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        var cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        zoomTo(touchStartScale * (dist / touchStartDist), cx, cy, false);
      }
    }, { passive: true });

    viewport.addEventListener('touchend', function () {
      state.dragging = false;
      clampPan();
      applyTransform(true);
      updateMinimap();
    });

    // Zoom — wheel
    viewport.addEventListener('wheel', function (e) {
      e.preventDefault();
      var factor = e.deltaY < 0 ? 1.12 : 0.89;
      zoomTo(state.scale * factor, e.clientX, e.clientY);
    }, { passive: false });

    // Zoom buttons
    zoomInBtn.addEventListener('click', function () { zoomTo(state.scale * 1.5); });
    zoomOutBtn.addEventListener('click', function () { zoomTo(state.scale / 1.5); });
    zoomResetBtn.addEventListener('click', function () { fitToView(); });

    // Back from detailed map
    backBtn.addEventListener('click', function () { drillBack(); });

    // Home — вернуться на главную карту мира
    document.getElementById('btn-home').addEventListener('click', goHome);

    // Close panel
    panel.querySelector('.panel-close').addEventListener('click', function () {
      closePanel();
      fitToView();
    });

    // Click on empty map — close panel
    viewport.addEventListener('click', function (e) {
      if (state.dragDist > 5) return;
      if (e.target === viewport || e.target === world || e.target === img) {
        if (state.panelOpen) {
          closePanel();
          fitToView();
        }
      }
    });

    // Double-click zoom
    viewport.addEventListener('dblclick', function (e) {
      if (editorActive) return;
      zoomTo(state.scale * 1.8, e.clientX, e.clientY);
    });

    // Keyboard
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (detailedMode) {
          drillBack();
          return;
        }
        if (state.panelOpen) {
          closePanel();
          fitToView();
        }
      }
      if (e.key === '+' || e.key === '=') zoomTo(state.scale * 1.3);
      if (e.key === '-') zoomTo(state.scale / 1.3);
      if (e.key === '0') fitToView();
      if (e.key === 'd' || e.key === 'D' || e.key === 'ь' || e.key === 'В') toggleDebug();
      if (e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У') toggleEditor();
    });

    // Resize
    window.addEventListener('resize', function () {
      updateMinimap();
    });
  }

  /* ---------- Debug ---------- */
  var debugOn = false;

  function toggleDebug() {
    debugOn = !debugOn;
    document.querySelectorAll('.region-poly').forEach(function (p) {
      if (debugOn) {
        p.style.fillOpacity = '0.08';
        p.style.stroke = '#00ff88';
        p.style.strokeWidth = 1.5;
        p.style.strokeDasharray = '6 4';
      } else {
        p.style.fillOpacity = '';
        p.style.stroke = '';
        p.style.strokeWidth = '';
        p.style.strokeDasharray = '';
      }
    });
  }

  /* ---------- Bounds Editor ---------- */
  var editorActive = false;
  var editorMode = 'bounds';
  var editorRegionId = null;
  var editorCityId = null;
  var editorPts = {};
  var svgNS = 'http://www.w3.org/2000/svg';
  var editorGroup = null;

  function initEditor() {
    var sel = document.getElementById('be-region');
    var regions = getActiveRegions();
    regions.forEach(function (r) {
      var opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.name;
      sel.appendChild(opt);
    });
    editorRegionId = regions[0].id;

    var citySel = document.getElementById('be-city');
    D.worldMarkers.forEach(function (m) {
      var opt = document.createElement('option');
      opt.value = m.name;
      opt.textContent = m.name;
      citySel.appendChild(opt);
    });
    editorCityId = D.worldMarkers[0].name;

    function setEditorMode(mode) {
      editorMode = mode;
      var mk = mode === 'markers';
      document.getElementById('be-mode-bounds').classList.toggle('active', !mk);
      document.getElementById('be-mode-markers').classList.toggle('active', mk);
      document.getElementById('be-region-label').style.display = mk ? 'none' : '';
      document.getElementById('be-region').style.display = mk ? 'none' : '';
      document.getElementById('be-city-label').style.display = mk ? '' : 'none';
      document.getElementById('be-city').style.display = mk ? '' : 'none';
      document.getElementById('be-hint').innerHTML = mk
        ? 'Кликните по карте, чтобы поставить город. <b>Drag</b> — панорама.'
        : 'Кликайте по карте, чтобы добавить вершину границы. <b>Drag</b> — панорама.';
      redrawEditorPreview();
    }

    document.getElementById('be-mode-bounds').addEventListener('click', function () { setEditorMode('bounds'); });
    document.getElementById('be-mode-markers').addEventListener('click', function () { setEditorMode('markers'); });
    document.getElementById('be-city').addEventListener('change', function () {
      editorCityId = this.value;
      redrawEditorPreview();
    });

    setEditorMode('bounds');

    document.getElementById('btn-bounds').addEventListener('click', function () {
      var el = document.getElementById('bounds-editor');
      if (editorActive && el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        return;
      }
      toggleEditor();
    });
    document.getElementById('be-close').addEventListener('click', toggleEditor);
    document.getElementById('be-hide').addEventListener('click', function () {
      document.getElementById('bounds-editor').classList.add('hidden');
      document.getElementById('btn-bounds').classList.add('active');
    });
    document.getElementById('be-region').addEventListener('change', function () {
      editorRegionId = this.value;
      redrawEditorPreview();
    });
    document.getElementById('be-undo').addEventListener('click', function () {
      var key = editorMode === 'markers' ? 'city:' + editorCityId : editorRegionId;
      var arr = editorPts[key] || [];
      arr.pop();
      editorPts[key] = arr;
      redrawEditorPreview();
    });
    document.getElementById('be-clear').addEventListener('click', function () {
      var key = editorMode === 'markers' ? 'city:' + editorCityId : editorRegionId;
      editorPts[key] = [];
      redrawEditorPreview();
      document.getElementById('be-output').value = '';
    });
    document.getElementById('be-done').addEventListener('click', function () {
      var key = editorMode === 'markers' ? 'city:' + editorCityId : editorRegionId;
      var arr = editorPts[key] || [];
      var str = arr.map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
      document.getElementById('be-output').value = str;
    });
    document.getElementById('be-copy').addEventListener('click', function () {
      var t = document.getElementById('be-output');
      if (t.value && navigator.clipboard) {
        navigator.clipboard.writeText(t.value);
        document.getElementById('be-copy').textContent = 'Скопировано!';
        setTimeout(function () { document.getElementById('be-copy').textContent = 'Копировать'; }, 1500);
      }
    });
  }

  function populateRegionSelect() {
    var sel = document.getElementById('be-region');
    var regions = getActiveRegions();
    sel.innerHTML = '';
    regions.forEach(function (r) {
      var opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.name;
      sel.appendChild(opt);
    });
    if (regions.length) editorRegionId = regions[0].id;
    document.getElementById('be-map-label').textContent =
      'Карта: ' + (detailedMode ? 'Аль\u2019Ваэра — подробная' : 'Орвей — мир');
  }

  function toggleEditor() {
    if (editorActive) {
      editorActive = false;
      var el = document.getElementById('bounds-editor');
      el.classList.remove('visible', 'hidden');
      var btn = document.getElementById('btn-bounds');
      btn.classList.remove('active');
      viewport.style.cursor = 'grab';
      if (editorGroup) editorGroup.innerHTML = '';
    } else {
      editorActive = true;
      populateRegionSelect();
      document.getElementById('bounds-editor').classList.remove('hidden');
      document.getElementById('bounds-editor').classList.add('visible');
      document.getElementById('btn-bounds').classList.add('active');
      viewport.style.cursor = 'crosshair';
      if (!editorGroup) {
        editorGroup = document.createElementNS(svgNS, 'g');
        editorGroup.setAttribute('id', 'editor-svg-group');
      }
      svgOverlay.querySelector('svg').appendChild(editorGroup);
      redrawEditorPreview();
    }
  }

  function editorClick(screenX, screenY) {
    if (!editorActive) return false;

    var mapX = (screenX - state.panX) / (state.scale * state.imgW) * 100;
    var mapY = (screenY - state.panY) / (state.scale * state.imgH) * 100;
    mapX = Math.round(mapX * 100) / 100;
    mapY = Math.round(mapY * 100) / 100;
    mapX = Math.max(0, Math.min(100, mapX));
    mapY = Math.max(0, Math.min(100, mapY));

    var key = editorMode === 'markers' ? 'city:' + editorCityId : editorRegionId;
    if (!editorPts[key]) editorPts[key] = [];
    if (editorMode === 'markers') {
      editorPts[key] = [[mapX, mapY]];
    } else {
      editorPts[key].push([mapX, mapY]);
    }
    redrawEditorPreview();
    return true;
  }

  function redrawEditorPreview() {
    if (!editorGroup) return;
    editorGroup.innerHTML = '';
    var key = editorMode === 'markers' ? 'city:' + editorCityId : editorRegionId;
    var pts = editorPts[key] || [];
    if (pts.length === 0) return;

    if (editorMode === 'markers') {
      var m = document.createElementNS(svgNS, 'circle');
      m.setAttribute('cx', pts[0][0]);
      m.setAttribute('cy', pts[0][1]);
      m.setAttribute('r', 0.3);
      m.classList.add('be-preview-mark');
      editorGroup.appendChild(m);
      return;
    }

    if (pts.length >= 2) {
      var line = document.createElementNS(svgNS, 'polyline');
      line.setAttribute('points', pts.map(function (p) { return p.join(','); }).join(' '));
      line.classList.add('be-preview-line');
      editorGroup.appendChild(line);
    }
    pts.forEach(function (p) {
      var c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', p[0]);
      c.setAttribute('cy', p[1]);
      c.setAttribute('r', 0.15);
      c.classList.add('be-preview-pt');
      editorGroup.appendChild(c);
    });
  }

  /* ---------- Public API ---------- */
  window.EXPLORE_MAP = {
    openRegion: openRegion,
    closePanel: closePanel,
    resetView: resetView,
    goHome: goHome,
    drillDown: drillDown,
    drillBack: drillBack,
    zoomTo: zoomTo,
    fitToView: fitToView
  };

  /* ---------- Start ---------- */
  init();

})();
