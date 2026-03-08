// ══════════════════════════════════════
//  about.js — Jaipuria Symposium 2026
//  Behaviour specific to about-symposium.html
//  Depends on: Lenis + GSAP loaded via main.js
// ══════════════════════════════════════

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Animated stat counters ──────────────────────────
  // Targets [data-count] elements — both the main stats row
  // and the JS 2025 past-stats section
  const statEls = document.querySelectorAll('[data-count]')

  const statObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return

      const el     = entry.target
      const target = parseInt(el.dataset.count, 10)
      const suffix = el.dataset.suffix || ''
      const dur    = 1800
      const start  = performance.now()

      ;(function tick(now) {
        const progress = Math.min((now - start) / dur, 1)
        const ease     = 1 - Math.pow(1 - progress, 3) // cubic ease-out
        el.textContent = Math.floor(ease * target) + suffix
        if (progress < 1) requestAnimationFrame(tick)
      })(start)

      statObserver.unobserve(el)
    })
  }, { threshold: 0.5 })

  statEls.forEach(el => statObserver.observe(el))


  // ── 2. Pillar cards — staggered entrance ──────────────
  const pillarCards = document.querySelectorAll('.pillar-card')

  const pillarObserver = new IntersectionObserver(entries => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return
      setTimeout(() => {
        entry.target.classList.add('in')
      }, i * 120)
      pillarObserver.unobserve(entry.target)
    })
  }, { threshold: 0.15 })

  pillarCards.forEach(card => {
    // ensure .reveal class is present for the CSS transition
    card.classList.add('reveal')
    pillarObserver.observe(card)
  })


  // ── 3. Edition banner — subtle parallax on scroll ─────
  const editionBanner = document.querySelector('.edition-banner')

  if (editionBanner) {
    gsap.to(editionBanner, {
      yPercent: -4,
      ease: 'none',
      scrollTrigger: {
        trigger: editionBanner,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5
      }
    })
  }


  // ── 4. Message cards — reveal with stagger ────────────
  const messageCards = document.querySelectorAll('.message-card')

  const messageObserver = new IntersectionObserver(entries => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return
      setTimeout(() => entry.target.classList.add('in'), i * 160)
      messageObserver.unobserve(entry.target)
    })
  }, { threshold: 0.1 })

  messageCards.forEach(card => {
    card.classList.add('reveal')
    messageObserver.observe(card)
  })


  // ── 5. Theme section — word highlight on scroll ───────
  // Each theme word card fades in with a gold pulse
  const themeCards = document.querySelectorAll('.theme-word-card')

  const themeObserver = new IntersectionObserver(entries => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return
      gsap.fromTo(entry.target,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.8, delay: i * 0.15, ease: 'power3.out' }
      )
      themeObserver.unobserve(entry.target)
    })
  }, { threshold: 0.2 })

  themeCards.forEach(card => {
    gsap.set(card, { opacity: 0 })
    themeObserver.observe(card)
  })


  // ── 6. Past edition photo grid — stagger reveal ───────
  const pastPhotos = document.querySelectorAll('.past-edition-photo')

  const photoObserver = new IntersectionObserver(entries => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return
      gsap.fromTo(entry.target,
        { opacity: 0, scale: 0.96 },
        { opacity: 1, scale: 1, duration: 0.9, delay: i * 0.1, ease: 'power2.out' }
      )
      photoObserver.unobserve(entry.target)
    })
  }, { threshold: 0.1 })

  pastPhotos.forEach(photo => {
    gsap.set(photo, { opacity: 0 })
    photoObserver.observe(photo)
  })


  // ── 7. Highlight dots — sequential pulse on reveal ────
  const highlightList = document.querySelector('.past-edition-highlights')

  if (highlightList) {
    const listObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      const items = highlightList.querySelectorAll('li')
      items.forEach((item, i) => {
        gsap.fromTo(item,
          { opacity: 0, x: -16 },
          { opacity: 1, x: 0, duration: 0.6, delay: i * 0.08, ease: 'power2.out' }
        )
      })
      listObserver.unobserve(highlightList)
    }, { threshold: 0.2 })

    listObserver.observe(highlightList)
    gsap.set(highlightList.querySelectorAll('li'), { opacity: 0 })
  }


  // ── 8. Mission / Vision cards — hover quote reveal ────
  // Subtle lift on the quote border glow
  const mvCards = document.querySelectorAll('.mv-card')

  mvCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card.querySelector('h3'), {
        color: '#F5F0E8',
        duration: 0.3,
        ease: 'power1.out'
      })
    })
    card.addEventListener('mouseleave', () => {
      gsap.to(card.querySelector('h3'), {
        color: '#F5F0E8',
        duration: 0.3
      })
    })
  })


  // ── 9. Edition badge — slow rotation on scroll ────────
  const editionBadge = document.querySelector('.edition-badge')

  if (editionBadge) {
    gsap.to(editionBadge, {
      rotation: 8,
      ease: 'none',
      scrollTrigger: {
        trigger: '.edition-banner',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 2
      }
    })
  }


  // ── 10. CTA section — gold glow pulse on button ───────
  const ctaPrimary = document.querySelector('.cta-section .btn-primary')

  if (ctaPrimary) {
    gsap.to(ctaPrimary, {
      boxShadow: '0 0 40px rgba(201,168,76,0.5)',
      repeat: -1,
      yoyo: true,
      duration: 1.8,
      ease: 'sine.inOut'
    })
  }

})