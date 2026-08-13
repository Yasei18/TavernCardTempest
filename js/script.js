document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    links.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  var currentFile = location.pathname.split('/').pop();
  if (links) {
    links.querySelectorAll('a').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      var hashIndex = href.indexOf('#');
      var file = hashIndex === -1 ? href : href.slice(0, hashIndex);
      if (file === currentFile && hashIndex === -1) {
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  var yearEls = document.querySelectorAll('.js-year');
  for (var i = 0; i < yearEls.length; i++) {
    yearEls[i].textContent = new Date().getFullYear();
  }
});
