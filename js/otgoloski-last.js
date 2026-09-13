(function () {
  var container = document.getElementById('otgoloski-last');
  if (!container) return;

  function render(recap) {
    if (!recap) return;
    container.innerHTML = '';
    container.appendChild(document.importNode(recap, true));
    if (window.initTavernLightbox) {
      window.initTavernLightbox(container);
    }
  }

  if (!window.fetch || !window.DOMParser) {
    return;
  }

  fetch('otgoloski.html', { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error(String(res.status));
      return res.text();
    })
    .then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var raw = doc.querySelector('.recaps > .recap');
      render(raw ? raw.cloneNode(true) : null);
    })
    .catch(function () {
      return;
    });
})();