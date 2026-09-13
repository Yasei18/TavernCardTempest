window.initTavernLightbox = (function () {
  var overlay = null;
  var img = null;
  var count = null;
  var caption = null;
  var group = [];
  var index = 0;

  function buildOverlay() {
    if (overlay && document.body.contains(overlay)) {
      return overlay;
    }
    var el = document.createElement('div');
    el.className = 'lightbox';
    el.innerHTML =
      '<button class="lightbox-close" type="button" aria-label="Закрыть">&times;</button>' +
      '<button class="lightbox-prev" type="button" aria-label="Предыдущее фото">‹</button>' +
      '<img class="lightbox-img" alt="">' +
      '<button class="lightbox-next" type="button" aria-label="Следующее фото">›</button>' +
      '<p class="lightbox-count"></p>' +
      '<p class="lightbox-caption"></p>';
    document.body.appendChild(el);
    overlay = el;
    img = el.querySelector('.lightbox-img');
    count = el.querySelector('.lightbox-count');
    caption = el.querySelector('.lightbox-caption');

    el.querySelector('.lightbox-close').addEventListener('click', close);
    el.querySelector('.lightbox-prev').addEventListener('click', function () { show(index - 1); });
    el.querySelector('.lightbox-next').addEventListener('click', function () { show(index + 1); });

    el.addEventListener('click', function (e) {
      if (e.target === el) close();
    });

    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });

    return el;
  }

  function show(i) {
    if (!group.length) return;
    index = (i + group.length) % group.length;
    var link = group[index];
    img.src = link.getAttribute('href');
    img.alt = link.getAttribute('data-caption') || '';
    count.textContent = (index + 1) + ' / ' + group.length;
    caption.textContent = link.getAttribute('data-caption') || '';
  }

  function open(link) {
    group = Array.prototype.filter.call(document.querySelectorAll('[data-lightbox]'), function (l) {
      return !l.getAttribute('data-lb-disabled') &&
        l.getAttribute('data-lightbox') === link.getAttribute('data-lightbox');
    });
    index = group.indexOf(link);
    buildOverlay().classList.add('open');
    document.body.style.overflow = 'hidden';
    show(index);
  }

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    img.removeAttribute('src');
  }

  return function (root) {
    root = root || document;
    buildOverlay();
    var links = root.querySelectorAll('[data-lightbox]');
    for (var i = 0; i < links.length; i += 1) {
      (function (link) {
        if (link.getAttribute('data-lb-bound')) return;
        link.setAttribute('data-lb-bound', '1');
        link.addEventListener('click', function (e) {
          e.preventDefault();
          open(link);
        });
      })(links[i]);
    }
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  window.initTavernLightbox(document);
});