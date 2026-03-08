// ════════════════════════════════════════
// MAIN.JS — Core page logic
// Smooth scroll (Lenis), GSAP animations,
// scroll reveal, stat counters, magnetic
// buttons, drag carousel, parallax,
// hero entrance, page transitions
// Jaipuria Symposium 2026
// ════════════════════════════════════════

import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Always start at top (back-forward cache)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
window.scrollTo(0, 0)

// ════════════════════════════════════════
// SMOOTH SCROLL — Lenis
// ════════════════════════════════════════
const lenis = new Lenis({
  duration:    1.4,
  easing:      (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothTouch: false,
  touchMultiplier: 2,
})

// Always start at top
lenis.scrollTo(0, { immediate: true })

// RAF loop — also drives ScrollTrigger
function raf(time) {
  lenis.raf(time)
  ScrollTrigger.update()
  requestAnimationFrame(raf)
}
requestAnimationFrame(raf)

// ════════════════════════════════════════
// NAVBAR — scroll state + hamburger
// ════════════════════════════════════════
const navbar     = document.getElementById('navbar')
const hamburger  = document.getElementById('hamburger')
const mobileMenu = document.getElementById('mobile-menu')

lenis.on('scroll', ({ scroll }) => {
  if (navbar) navbar.classList.toggle('scrolled', scroll > 60)
})

hamburger?.addEventListener('click', () => {
  const isOpen = hamburger.classList.toggle('open')
  mobileMenu?.classList.toggle('open', isOpen)
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

// Close mobile menu on link click
document.querySelectorAll('.mobile-nav-links a').forEach((link) => {
  link.addEventListener('click', () => {
    hamburger?.classList.remove('open')
    mobileMenu?.classList.remove('open')
    document.body.style.overflow = ''
  })
})

// Active nav link highlight
const currentPage = window.location.pathname.split('/').pop() || 'index.html'
document.querySelectorAll('#navbar .nav-links a, .mobile-nav-links a').forEach((link) => {
  const href = link.getAttribute('href')
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    link.classList.add('nav-active')
  }
})

// ════════════════════════════════════════
// SCROLL REVEAL — IntersectionObserver
// Elements with .reveal class animate in
// when they enter the viewport
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
    { threshold: 0.07, rootMargin: '0px 0px -40px 0px' }
  )
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
}

window.addEventListener('load', initReveal)

// ════════════════════════════════════════
// STAT COUNTERS — animate numbers up
// Triggered once when element enters view
// ════════════════════════════════════════
function initCounters() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const el       = entry.target
        const target   = parseInt(el.dataset.target, 10)
        const duration = 1800
        const start    = performance.now()

        function update(now) {
          const progress = Math.min((now - start) / duration, 1)
          const eased    = 1 - Math.pow(1 - progress, 4)
          el.textContent = Math.round(eased * target)
          if (progress < 1) requestAnimationFrame(update)
          else el.textContent = target
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
// Subtle pull toward cursor on hover
// ════════════════════════════════════════
function initMagnetic() {
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect()
      const dx   = e.clientX - (rect.left + rect.width  / 2)
      const dy   = e.clientY - (rect.top  + rect.height / 2)
      el.style.transform  = `translate(${dx * 0.28}px, ${dy * 0.28}px)`
      el.style.transition = 'transform 0.12s ease'
    })

    el.addEventListener('mouseleave', () => {
      el.style.transform  = 'translate(0, 0)'
      el.style.transition = 'transform 0.5s var(--ease-smooth)'
    })
  })
}
initMagnetic()

// ════════════════════════════════════════
// DRAG CAROUSEL — committees section
// ════════════════════════════════════════
function initDragCarousel() {
  const carousel = document.getElementById('committees-carousel')
  if (!carousel) return

  let isDown = false, startX, scrollLeft

  carousel.addEventListener('mousedown', (e) => {
    isDown     = true
    startX     = e.pageX - carousel.offsetLeft
    scrollLeft = carousel.scrollLeft
    carousel.style.cursor = 'grabbing'
  })

  carousel.addEventListener('mouseleave', () => {
    isDown = false
    carousel.style.cursor = 'grab'
  })

  carousel.addEventListener('mouseup', () => {
    isDown = false
    carousel.style.cursor = 'grab'
  })

  carousel.addEventListener('mousemove', (e) => {
    if (!isDown) return
    e.preventDefault()
    const x    = e.pageX - carousel.offsetLeft
    const walk = (x - startX) * 1.8
    carousel.scrollLeft = scrollLeft - walk
  })

  // Touch scroll — native, just prevent vertical scroll bleed
  carousel.addEventListener('touchstart', () => {}, { passive: true })
}
initDragCarousel()

// ════════════════════════════════════════
// PARALLAX — hero on scroll
// Globe drifts upward, content fades
// ════════════════════════════════════════
function initParallax() {
  const globe = document.getElementById('globe-container')
  const heroContent = document.querySelector('.hero-content')

  if (globe) {
    gsap.to(globe, {
      y: '-20%',
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    })
  }

  if (heroContent) {
    gsap.to(heroContent, {
      y: '12%',
      opacity: 0.15,
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    })
  }
}
initParallax()

// ════════════════════════════════════════
// HERO ENTRANCE — staggered reveal
// Tight GSAP timeline on page load
// ════════════════════════════════════════
function initHeroEntrance() {
  // Only run on the home page (hero exists)
  if (!document.querySelector('.hero-heading')) return

  const tl = gsap.timeline({ delay: 0.25 })

  tl.from('.hero-eyebrow',    { opacity: 0, y: 14, duration: 0.5,  ease: 'power3.out' })
    .from('.hero-line-1',     { opacity: 0, y: 44, duration: 0.65, ease: 'power4.out' }, '-=0.1')
    .from('.hero-line-2',     { opacity: 0, y: 44, duration: 0.65, ease: 'power4.out' }, '-=0.42')
    .from('.hero-theme-line', { opacity: 0, y: 20, duration: 0.5,  ease: 'power3.out' }, '-=0.35')
    .from('.hero-date',       { opacity: 0, y: 14, duration: 0.45, ease: 'power3.out' }, '-=0.28')
    .from('.hero-venue',      { opacity: 0, y: 10, duration: 0.4,  ease: 'power3.out' }, '-=0.30')
    .from('.hero-actions',    { opacity: 0, y: 14, duration: 0.45, ease: 'power3.out' }, '-=0.25')
    .from('.hero-countdown',  { opacity: 0, y: 20, duration: 0.5,  ease: 'power3.out' }, '-=0.20')
    // Scroll indicator fades in last
    .to('.scroll-indicator',  { opacity: 0.6, duration: 0.6, ease: 'power2.out' }, '+=0.3')
}
initHeroEntrance()

// ════════════════════════════════════════
// SCROLL INDICATOR — hides on scroll
// ════════════════════════════════════════
const scrollIndicator = document.querySelector('.scroll-indicator')
if (scrollIndicator) {
  lenis.on('scroll', ({ scroll }) => {
    if (scroll > 80) {
      scrollIndicator.style.opacity = '0'
    } else if (scrollIndicator.dataset.shown) {
      scrollIndicator.style.opacity = '0.6'
    }
  })

  gsap.delayedCall(2.8, () => {
    scrollIndicator.dataset.shown = '1'
  })
}

// ════════════════════════════════════════
// PAGE TRANSITIONS — wipe overlay
// All internal links trigger a black
// wipe before navigation
// ════════════════════════════════════════
function initPageTransitions() {
  // Reveal page on load (wipe out)
  const overlay = document.querySelector('.page-transition-overlay')
  if (overlay) {
    overlay.classList.remove('active')
  }

  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href')

    // Skip external, anchors, mailto, tel
    if (!href
      || href.startsWith('#')
      || href.startsWith('mailto')
      || href.startsWith('tel')
      || href.startsWith('http')
      || href.startsWith('//')
      || link.target === '_blank'
    ) return

    link.addEventListener('click', (e) => {
      e.preventDefault()

      const el = document.querySelector('.page-transition-overlay')
      if (!el) {
        window.location.href = href
        return
      }

      el.classList.add('active')

      setTimeout(() => {
        window.location.href = href
      }, 400)
    })
  })
}
initPageTransitions()

// ════════════════════════════════════════
// COMMITTEE CARD BODY — reveal on hover
// (small enhancement; entirely CSS driven
//  but JS can add class for more control)
// ════════════════════════════════════════
document.querySelectorAll('.committee-card').forEach((card) => {
  card.addEventListener('mouseenter', () => card.classList.add('hovered'))
  card.addEventListener('mouseleave', () => card.classList.remove('hovered'))
})

// ════════════════════════════════════════
// REGISTER BUTTON — smart redirect
// If user is already logged in (Supabase
// session in localStorage), redirect to
// dashboard instead of register page.
// ════════════════════════════════════════
;(function() {
  const btn = document.getElementById('nav-register-btn')
  if (!btn) return

  // Check for Supabase session (stored as sb-<projectRef>-auth-token)
  const SUPABASE_URL = 'https://tkvrukemedlxjxrlzvhe.supabase.co'
  const projectRef = SUPABASE_URL.split('//')[1].split('.')[0]
  const sessionKey = `sb-${projectRef}-auth-token`

  try {
    const raw = localStorage.getItem(sessionKey)
    if (raw) {
      const session = JSON.parse(raw)
      if (session && session.access_token) {
        btn.href = 'dashboard.html'
        btn.textContent = 'My Dashboard'
      }
    }
  } catch (_) { /* silent fail */ }
})()