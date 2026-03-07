import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ── Always start at top ──
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
window.scrollTo(0, 0)

// ════════════════════════════════════════
// SMOOTH SCROLL — Lenis
// ════════════════════════════════════════
const lenis = new Lenis({
  duration: 1.4,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothTouch: false,
})

lenis.scrollTo(0, { immediate: true })

function raf(time) {
  lenis.raf(time)
  ScrollTrigger.update()
  requestAnimationFrame(raf)
}
requestAnimationFrame(raf)

// ════════════════════════════════════════
// NAVBAR — scroll state + hamburger
// ════════════════════════════════════════
const navbar    = document.getElementById('navbar')
const hamburger = document.getElementById('hamburger')
const mobileMenu = document.getElementById('mobile-menu')

lenis.on('scroll', ({ scroll }) => {
  navbar?.classList.toggle('scrolled', scroll > 60)
})

hamburger?.addEventListener('click', () => {
  hamburger.classList.toggle('open')
  mobileMenu?.classList.toggle('open')
  document.body.style.overflow = mobileMenu?.classList.contains('open') ? 'hidden' : ''
})

document.querySelectorAll('.mobile-nav-links a').forEach((link) => {
  link.addEventListener('click', () => {
    hamburger?.classList.remove('open')
    mobileMenu?.classList.remove('open')
    document.body.style.overflow = ''
  })
})

// Active nav link highlight
const currentPage = window.location.pathname.split('/').pop() || 'index.html'
document.querySelectorAll('.nav-links a').forEach((link) => {
  if (link.getAttribute('href') === currentPage) link.classList.add('active')
})

// ════════════════════════════════════════
// SCROLL REVEAL — Intersection Observer
// ════════════════════════════════════════
function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
  )
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
}

window.addEventListener('load', initReveal)

// ════════════════════════════════════════
// STAT COUNTERS — animate on scroll into view
// ════════════════════════════════════════
function initCounters() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const el = entry.target
        const target = parseInt(el.dataset.target, 10)
        const duration = 1800
        const start = performance.now()
        function update(now) {
          const progress = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 4)
          el.textContent = Math.round(eased * target)
          if (progress < 1) requestAnimationFrame(update)
        }
        requestAnimationFrame(update)
        observer.unobserve(el)
      })
    },
    { threshold: 0.5 }
  )
  document.querySelectorAll('.stat-number[data-target]').forEach((el) => observer.observe(el))
}
initCounters()

// ════════════════════════════════════════
// MAGNETIC BUTTONS
// ════════════════════════════════════════
function initMagnetic() {
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect()
      const dx = e.clientX - (rect.left + rect.width / 2)
      const dy = e.clientY - (rect.top + rect.height / 2)
      el.style.transform = `translate(${dx * 0.32}px, ${dy * 0.32}px)`
      el.style.transition = 'transform 0.15s ease'
    })
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translate(0, 0)'
      el.style.transition = 'transform 0.5s var(--ease-smooth)'
    })
  })
}
initMagnetic()

// ════════════════════════════════════════
// DRAG CAROUSEL
// ════════════════════════════════════════
function initDragCarousel() {
  const carousel = document.getElementById('committees-carousel')
  if (!carousel) return
  let isDown = false, startX, scrollLeft

  carousel.addEventListener('mousedown', (e) => { isDown = true; startX = e.pageX - carousel.offsetLeft; scrollLeft = carousel.scrollLeft })
  carousel.addEventListener('mouseleave', () => { isDown = false })
  carousel.addEventListener('mouseup', () => { isDown = false })
  carousel.addEventListener('mousemove', (e) => {
    if (!isDown) return
    e.preventDefault()
    carousel.scrollLeft = scrollLeft - (e.pageX - carousel.offsetLeft - startX) * 2
  })
}
initDragCarousel()

// ════════════════════════════════════════
// PARALLAX — hero on scroll
// ════════════════════════════════════════
function initParallax() {
  gsap.to('#globe-container', {
    y: '-18%', ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
  })
  gsap.to('.hero-content', {
    y: '14%', opacity: 0.2, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
  })
}
initParallax()

// ════════════════════════════════════════
// HERO ENTRANCE — 0.3s delay, tight sequence
// ════════════════════════════════════════
function initHeroEntrance() {
  const tl = gsap.timeline({ delay: 0.3 })
  tl.from('.hero-label',   { opacity: 0, y: 16, duration: 0.55, ease: 'power3.out' })
    .from('.hero-line-1',  { opacity: 0, y: 40, duration: 0.65, ease: 'power4.out' }, '-=0.15')
    .from('.hero-line-2',  { opacity: 0, y: 40, duration: 0.65, ease: 'power4.out' }, '-=0.45')
    .from('.hero-tagline', { opacity: 0, y: 20, duration: 0.5,  ease: 'power3.out' }, '-=0.35')
    .from('.hero-date',    { opacity: 0, y: 14, duration: 0.45, ease: 'power3.out' }, '-=0.30')
    .from('.hero-actions', { opacity: 0, y: 14, duration: 0.45, ease: 'power3.out' }, '-=0.25')
    // Scroll indicator appears AFTER hero sequence, then hides on scroll
    .to('.scroll-indicator', { opacity: 0.6, duration: 0.6, ease: 'power2.out' }, '+=0.2')
}
initHeroEntrance()

// ════════════════════════════════════════
// SCROLL INDICATOR — hide when user scrolls
// ════════════════════════════════════════
const scrollIndicator = document.querySelector('.scroll-indicator')
lenis.on('scroll', ({ scroll }) => {
  if (!scrollIndicator) return
  if (scroll > 80) {
    scrollIndicator.style.opacity = '0'
    scrollIndicator.style.pointerEvents = 'none'
  } else {
    // Only restore if GSAP has already shown it (opacity was set to 0.6)
    // Check via a data flag set after entrance animation
    if (scrollIndicator.dataset.shown) {
      scrollIndicator.style.opacity = '0.6'
      scrollIndicator.style.pointerEvents = ''
    }
  }
})

// Mark indicator as shown after entrance animation completes
gsap.delayedCall(2.5, () => {
  if (scrollIndicator) scrollIndicator.dataset.shown = '1'
})

// ════════════════════════════════════════
// PAGE TRANSITIONS
// ════════════════════════════════════════
document.querySelectorAll('a[href]').forEach((link) => {
  const href = link.getAttribute('href')
  if (!href || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('http')) return
  link.addEventListener('click', (e) => {
    e.preventDefault()
    const overlay = document.createElement('div')
    overlay.className = 'page-transition-overlay'
    document.body.appendChild(overlay)
    requestAnimationFrame(() => {
      overlay.classList.add('active')
      setTimeout(() => { window.location.href = href }, 600)
    })
  })
})