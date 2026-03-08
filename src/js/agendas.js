// ════════════════════════════════════════
// AGENDAS.JS — Page-specific logic
// Committee card tilt + shine,
// GSAP hero entrance, ScrollTrigger
// stagger on committees + formats,
// theme banner parallax
// Jaipuria Symposium 2026
// ════════════════════════════════════════

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ════════════════════════════════════════
// PAGE HERO ENTRANCE
// Staggered GSAP timeline, delay 0.3s
// ════════════════════════════════════════
function initHeroEntrance() {
  const tl = gsap.timeline({ delay: 0.3 })

  tl.from('.breadcrumb',       { opacity: 0, y: 16, duration: 0.55, ease: 'power3.out' })
    .from('.page-hero .label', { opacity: 0, y: 14, duration: 0.5,  ease: 'power3.out' }, '-=0.3')
    .from('.page-hero .gold-line', { scaleX: 0, transformOrigin: 'left', duration: 0.45, ease: 'power3.out' }, '-=0.25')
    .from('.page-hero-title',  { opacity: 0, y: 40, duration: 0.85, ease: 'power4.out' }, '-=0.3')
    .from('.page-hero-sub',    { opacity: 0, y: 24, duration: 0.65, ease: 'power3.out' }, '-=0.5')
    .from('.hero-pills',       { opacity: 0, y: 16, duration: 0.55, ease: 'power3.out' }, '-=0.35')
}

// ════════════════════════════════════════
// COMMITTEE CARDS — 3D TILT + SHINE
// ════════════════════════════════════════
function initCardTilt() {
  // Skip on touch devices
  if (window.matchMedia('(hover: none)').matches) return

  const MAX_TILT = 7 // degrees

  document.querySelectorAll('.committee-card').forEach((card) => {
    const shine = card.querySelector('.card-shine')

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect()
      const cx   = rect.left + rect.width  / 2
      const cy   = rect.top  + rect.height / 2
      const dx   = (e.clientX - cx) / (rect.width  / 2)
      const dy   = (e.clientY - cy) / (rect.height / 2)

      card.style.transform = `perspective(900px) rotateX(${-dy * MAX_TILT}deg) rotateY(${dx * MAX_TILT}deg) translateY(-8px)`

      if (shine) {
        const sx = ((e.clientX - rect.left) / rect.width)  * 100
        const sy = ((e.clientY - rect.top)  / rect.height) * 100
        shine.style.setProperty('--mx', `${sx}%`)
        shine.style.setProperty('--my', `${sy}%`)
      }
    })

    card.addEventListener('mouseleave', () => {
      card.style.transform = ''
    })
  })
}

// ════════════════════════════════════════
// COMMITTEE CARDS — SCROLL STAGGER
// ════════════════════════════════════════
function initCommitteeStagger() {
  const cards = document.querySelectorAll('.committee-card')
  if (!cards.length) return

  gsap.fromTo(
    cards,
    { opacity: 0, y: 52 },
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.14,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.committees-grid',
        start: 'top 82%',
      },
    }
  )
}

// ════════════════════════════════════════
// FORMAT CARDS — SCROLL STAGGER
// ════════════════════════════════════════
function initFormatsStagger() {
  const cards = document.querySelectorAll('.format-card')
  if (!cards.length) return

  gsap.fromTo(
    cards,
    { opacity: 0, y: 36 },
    {
      opacity: 1,
      y: 0,
      duration: 0.7,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.formats-grid',
        start: 'top 84%',
      },
    }
  )
}

// ════════════════════════════════════════
// THEME BANNER — PARALLAX SCRUB
// ════════════════════════════════════════
function initThemeParallax() {
  const banner = document.querySelector('.theme-banner')
  if (!banner) return

  gsap.to('.theme-quote', {
    yPercent: -10,
    ease: 'none',
    scrollTrigger: {
      trigger: banner,
      start: 'top bottom',
      end:   'bottom top',
      scrub: 1.8,
    },
  })
}

// ════════════════════════════════════════
// CUSTOM CURSOR — dot + lagging ring
// ════════════════════════════════════════
function initCursor() {
  if (window.matchMedia('(hover: none)').matches) return

  const dot  = document.getElementById('cur-dot')
  const ring = document.getElementById('cur-ring')
  if (!dot || !ring) return

  let mouseX = 0, mouseY = 0
  let ringX  = 0, ringY  = 0

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX
    mouseY = e.clientY
    dot.style.left = `${mouseX}px`
    dot.style.top  = `${mouseY}px`
  })

  ;(function animateRing() {
    ringX += (mouseX - ringX) * 0.11
    ringY += (mouseY - ringY) * 0.11
    ring.style.left = `${ringX}px`
    ring.style.top  = `${ringY}px`
    requestAnimationFrame(animateRing)
  })()

  // Hover expansion
  const targets = 'a, button, .committee-card, .format-card, .btn, .filter-btn, .status-pill'
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(targets)) ring.classList.add('big')
  })
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(targets)) ring.classList.remove('big')
  })

  // Click pulse
  document.addEventListener('mousedown', () => ring.classList.add('clicking'))
  document.addEventListener('mouseup',   () => ring.classList.remove('clicking'))

  // Leave / enter window
  document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0' })
  document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '0.5' })
}

// ════════════════════════════════════════
// FONTS READY — reveal logo
// ════════════════════════════════════════
document.fonts.ready.then(() => {
  document.body.classList.add('fonts-ready')
})

// ════════════════════════════════════════
// BOOT
// ════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initHeroEntrance()
  initCardTilt()
  initCommitteeStagger()
  initFormatsStagger()
  initThemeParallax()
  initCursor()
})