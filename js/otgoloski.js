document.addEventListener('DOMContentLoaded', function () {
  var links = document.querySelectorAll('[data-lightbox]');
  if (!links.length) return;

  var overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.innerHTML =
    '<button class="lightbox-close" type="button" aria-label="Закрыть">&times;</button>' +
    '<button class="lightbox-prev" type="button" aria-label="Предыдущее фото">‹</button>' +
    '<img class="lightbox-img" alt="">' +
    '<button class="lightbox-next" type="button" aria-label="Следующее фото">›</button>' +
    '<p class="lightbox-count"></p>';
  document.body.appendChild(overlay);

  var img = overlay.querySelector('.lightbox-img');
  var count = overlay.querySelector('.lightbox-count');
  var group = [];
  var index = 0;

  function show(i) {
    if (!group.length) return;
    index = (i + group.length) % group.length;
    var link = group[index];
    img.src = link.getAttribute('href');
    img.alt = link.getAttribute('data-caption') || '';
    count.textContent = (index + 1) + ' / ' + group.length;
  }

  function open(link) {
    group = Array.prototype.filter.call(links, function (l) {
      return l.getAttribute('data-lightbox') === link.getAttribute('data-lightbox');
    });
    index = group.indexOf(link);
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    show(index);
  }

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    img.removeAttribute('src');
  }

  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      open(link);
    });
  });

  overlay.querySelector('.lightbox-close').addEventListener('click', close);
  overlay.querySelector('.lightbox-prev').addEventListener('click', function () { show(index - 1); });
  overlay.querySelector('.lightbox-next').addEventListener('click', function () { show(index + 1); });

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });
});
