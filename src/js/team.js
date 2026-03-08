// ════════════════════════════════════════
// TEAM.JS — Split-panel interactions
// Directors / Deputies / Tech Team
// Jaipuria Symposium 2026
// ════════════════════════════════════════

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

// ════════════════════════════════════
// HERO ENTRANCE
// ════════════════════════════════════
function initHeroEntrance() {
  const tl = gsap.timeline({ delay: 0.28 })
  tl.from('.breadcrumb',           { opacity: 0, y: 16, duration: 0.55, ease: 'power3.out' })
    .from('.page-hero .label',     { opacity: 0, y: 14, duration: 0.5,  ease: 'power3.out' }, '-=0.28')
    .from('.page-hero .gold-line', { scaleX: 0, transformOrigin: 'left', duration: 0.45, ease: 'power3.out' }, '-=0.22')
    .from('.page-hero-title',      { opacity: 0, y: 44, duration: 0.85, ease: 'power4.out' }, '-=0.3')
    .from('.page-hero-sub',        { opacity: 0, y: 24, duration: 0.65, ease: 'power3.out' }, '-=0.5')
}

// ════════════════════════════════════
// SPLIT PANELS — directors / deputies
// ════════════════════════════════════
function initSplitStage(stageEl) {
  if (!stageEl) return
  const halves = stageEl.querySelectorAll('.split-half')

  halves.forEach((half) => {
    half.addEventListener('click', () => {
      const alreadyActive = half.classList.contains('active')
      halves.forEach((h) => h.classList.remove('active'))
      if (!alreadyActive) half.classList.add('active')
    })

    // keyboard
    half.setAttribute('tabindex', '0')
    half.setAttribute('role', 'button')
    half.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); half.click() }
    })
  })

  // click outside to deactivate
  document.addEventListener('click', (e) => {
    if (!stageEl.contains(e.target)) halves.forEach((h) => h.classList.remove('active'))
  })
}

// ════════════════════════════════════
// TECH PANELS — many members
// ════════════════════════════════════
function initTechStage() {
  const stage = document.querySelector('.tech-stage')
  if (!stage) return
  const panels = stage.querySelectorAll('.tech-panel')

  panels.forEach((panel) => {
    panel.addEventListener('click', () => {
      const alreadyActive = panel.classList.contains('active')
      panels.forEach((p) => p.classList.remove('active'))
      if (!alreadyActive) panel.classList.add('active')
    })

    panel.setAttribute('tabindex', '0')
    panel.setAttribute('role', 'button')
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); panel.click() }
    })
  })

  document.addEventListener('click', (e) => {
    if (!stage.contains(e.target)) panels.forEach((p) => p.classList.remove('active'))
  })
}

// ════════════════════════════════════
// DIVIDER LINES — animate in on scroll
// ════════════════════════════════════
function initDividers() {
  document.querySelectorAll('.team-divider-row').forEach((row) => {
    const lines = row.querySelectorAll('.tdivider-line')
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        lines.forEach((l) => l.classList.add('visible'))
        obs.disconnect()
      }
    }, { threshold: 0.4 })
    obs.observe(row)
  })
}

// ════════════════════════════════════
// SCROLL STAGGER — advisors
// ════════════════════════════════════
function initScrollAnimations() {
  const cards = document.querySelectorAll('.advisor-card')
  if (cards.length) {
    gsap.fromTo(cards,
      { opacity: 0, y: 36 },
      {
        opacity: 1, y: 0,
        duration: 0.72, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.advisors-grid', start: 'top 84%' },
      }
    )
  }

  // Preamble sections
  document.querySelectorAll('.team-preamble').forEach((el) => {
    gsap.fromTo(el,
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 87%' } }
    )
  })
}

// ════════════════════════════════════
// CURSOR
// ════════════════════════════════════
function initCursor() {
  if (window.matchMedia('(hover: none)').matches) return
  const dot  = document.getElementById('cur-dot')
  const ring = document.getElementById('cur-ring')
  if (!dot || !ring) return

  let mx = 0, my = 0, rx = 0, ry = 0

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY
    dot.style.left = `${mx}px`; dot.style.top = `${my}px`
  })

  ;(function loop() {
    rx += (mx - rx) * 0.11
    ry += (my - ry) * 0.11
    ring.style.left = `${rx}px`; ring.style.top = `${ry}px`
    requestAnimationFrame(loop)
  })()

  const hoverSel = 'a, button, .split-half, .tech-panel, .advisor-card, .btn'
  document.addEventListener('mouseover',  (e) => { if (e.target.closest(hoverSel)) ring.classList.add('big') })
  document.addEventListener('mouseout',   (e) => { if (e.target.closest(hoverSel)) ring.classList.remove('big') })
  document.addEventListener('mousedown',  () => ring.classList.add('clicking'))
  document.addEventListener('mouseup',    () => ring.classList.remove('clicking'))
  document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0' })
  document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '0.5' })
}

// ════════════════════════════════════
// FONTS READY
// ════════════════════════════════════
document.fonts.ready.then(() => document.body.classList.add('fonts-ready'))

// ════════════════════════════════════
// BOOT
// ════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initHeroEntrance()
  initSplitStage(document.querySelector('.directors-stage'))
  initSplitStage(document.querySelector('.deputies-stage'))
  initTechStage()
  initDividers()
  initScrollAnimations()
  initCursor()
})