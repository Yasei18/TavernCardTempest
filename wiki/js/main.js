const headerEl = document.getElementById("header")

window.addEventListener("scroll", function () {
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

  const dropbtn = navLinks.querySelector(".dropdown .dropbtn")
  if (dropbtn) {
    dropbtn.addEventListener("click", function () {
      const dropdown = dropbtn.closest(".dropdown")
      dropdown.classList.toggle("open")
    })
  }
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

