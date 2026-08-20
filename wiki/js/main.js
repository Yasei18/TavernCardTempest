const headerEl = document.getElementById("header")

window.addEventListener("scroll", function () {
  if (!headerEl) return
  const scrollPos = window.scrollY

  if (scrollPos > 100) {
    headerEl.classList.add("header_mini")
  } else {
    headerEl.classList.remove("header_mini")
  }
})

const navToggle = document.getElementById("navToggle")
const navLinks = document.getElementById("nav")

if (navToggle && navLinks) {
  navToggle.addEventListener("click", function () {
    const isOpen = navLinks.classList.toggle("open")
    navToggle.classList.toggle("open", isOpen)
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false")
  })

  navLinks.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      navLinks.classList.remove("open")
      navToggle.classList.remove("open")
      navToggle.setAttribute("aria-expanded", "false")
    })
  })

  const dropbtns = navLinks.querySelectorAll(".dropdown .dropbtn")
  dropbtns.forEach(function (dropbtn) {
    dropbtn.addEventListener("click", function () {
      const dropdown = dropbtn.closest(".dropdown")
      dropdown.classList.toggle("open")
    })
  })
}

const lightboxLinks = document.querySelectorAll(".js-map-open, .js-art-open")

if (lightboxLinks.length > 0) {
  const lightbox = document.createElement("div")
  lightbox.className = "map-lightbox"
  document.body.appendChild(lightbox)

  const lightboxImg = document.createElement("img")
  lightboxImg.alt = "Карта"
  lightbox.appendChild(lightboxImg)

  function openLightbox(src) {
    lightboxImg.src = src
    lightbox.classList.add("open")
    document.body.style.overflow = "hidden"
  }

  function closeLightbox() {
    lightbox.classList.remove("open")
    document.body.style.overflow = ""
  }

  lightboxLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault()
      lightboxImg.alt = link.getAttribute("data-lightbox-title") || "Карта"
      openLightbox(link.getAttribute("href"))
    })
  })

  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox || e.target === lightboxImg) {
      closeLightbox()
    }
  })

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeLightbox()
    }
  })
}

document.querySelectorAll(".js-year").forEach(function (el) {
  el.textContent = new Date().getFullYear()
})

document.querySelectorAll('a[href="#header"]').forEach(function (link) {
  link.addEventListener("click", function (e) {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: "smooth" })
  })
})

const backTop = document.getElementById("backTop")
if (backTop) {
  function onBackTopScroll() {
    backTop.classList.toggle("is-visible", window.scrollY > 400)
  }
  window.addEventListener("scroll", onBackTopScroll, { passive: true })
  onBackTopScroll()
  backTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" })
  })
}

const wikiSidebar = document.querySelector(".wiki-sidebar")
if (wikiSidebar) {
  let sidebarTop = -1
  function updateSidebarTop() {
    const top = headerEl.offsetHeight + 16
    if (top !== sidebarTop) {
      sidebarTop = top
      wikiSidebar.style.top = top + "px"
    }
  }
  window.addEventListener("scroll", updateSidebarTop, { passive: true })
  window.addEventListener("resize", updateSidebarTop)
  updateSidebarTop()
}

document.querySelectorAll('a[href^="#"]:not([href="#header"])').forEach(function (link) {
  link.addEventListener("click", function (e) {
    const hash = link.getAttribute("href")
    if (!hash || hash.length < 2) return
    const target = document.getElementById(hash.slice(1))
    if (!target) return
    const details = target.closest("details.wiki-tab")
    if (details && !details.open) {
      details.open = true
    }
    e.preventDefault()
    const offset = headerEl.offsetHeight + 16
    const top = target.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" })
    highlightTarget(target)
  })
})

function highlightTarget(target) {
  target.classList.remove("wiki-tab-highlight")
  void target.offsetWidth
  target.classList.add("wiki-tab-highlight")
  setTimeout(function () {
    target.classList.remove("wiki-tab-highlight")
  }, 2000)
}

(function () {
  var layout = document.body.getAttribute("data-layout")
  if (!layout) return

  var socials = document.createElement("aside")
  socials.className = "wiki-socials"
  socials.innerHTML =
    '<a href="https://t.me/tavern_card_tempest" target="_blank" rel="noopener" title="Telegram" aria-label="Telegram">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>' +
    '</a>' +
    '<a href="https://www.youtube.com/@CardTempestTavern" target="_blank" rel="noopener" title="YouTube" aria-label="YouTube">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' +
    '</a>' +
    '<a href="https://boosty.to/taverncardtempest" target="_blank" rel="noopener" title="Boosty" aria-label="Boosty">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.661 14.337 6.801 0h6.362L11.88 4.444l-.038.077-3.378 11.733h3.15c-1.321 3.289-2.35 5.867-3.086 7.733-5.816-.063-7.442-4.228-6.02-9.155M8.554 24l7.67-11.035h-3.25l2.83-7.073c4.852.508 7.137 4.33 5.791 8.952C20.16 19.81 14.344 24 8.68 24h-.127z"/></svg>' +
    '</a>'
  document.body.appendChild(socials)

  function positionSocials() {
    if (layout === "wiki") {
      var wikiPage = document.querySelector(".wiki-page")
      var container = wikiPage ? wikiPage.querySelector(".wiki-container") : null
      if (container) {
        var rect = container.getBoundingClientRect()
        socials.style.left = Math.max(16, rect.left - 52) + "px"
        return
      }
    }
    socials.style.left = ""
  }
  positionSocials()
  window.addEventListener("resize", positionSocials)
})()

