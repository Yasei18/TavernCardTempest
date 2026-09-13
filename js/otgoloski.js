document.addEventListener('DOMContentLoaded', function () {
  var recaps = Array.prototype.slice.call(document.querySelectorAll('.recap'));
  if (recaps.length > 1) {
    var wrap = document.querySelector('.recaps') || document.querySelector('.section-dark .container');
    if (wrap) {
      var idx = document.createElement('div');
      idx.className = 'recap-index';
      recaps.forEach(function (r) {
        var a = document.createElement('a');
        a.href = '#' + r.id;
        a.className = 'recap-index-link';
        a.title = (r.querySelector('.recap-head h2') || {}).textContent || r.id;
        var kick = r.querySelector('.recap-kicker');
        a.textContent = kick ? kick.textContent.replace(/^Отголосок\s*·\s*/i, '') : r.id;
        idx.appendChild(a);
      });
      wrap.parentNode.insertBefore(idx, wrap);
    }
  }
});
