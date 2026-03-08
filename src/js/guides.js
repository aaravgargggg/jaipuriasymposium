// ══════════════════════════════════════
//  guides.js — Jaipuria Symposium 2026
// ══════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Universal reveal — adds .in to ALL .reveal elements
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return
      e.target.classList.add('in')
      revealObs.unobserve(e.target)
    })
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' })

  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el))


  // ── 2. Doc cards — inline stagger fade
  const docCards = document.querySelectorAll('.doc-card')
  const docObs = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (!e.isIntersecting) return
      setTimeout(() => {
        e.target.style.opacity = '1'
        e.target.style.transform = 'translateY(0) scale(1)'
      }, i * 70)
      docObs.unobserve(e.target)
    })
  }, { threshold: 0.08 })

  docCards.forEach(card => {
    card.style.opacity = '0'
    card.style.transform = 'translateY(24px) scale(0.97)'
    card.style.transition = 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)'
    docObs.observe(card)
  })


  // ── 3. BG guide card — 3D tilt + shine on hover
  document.querySelectorAll('.bg-guide-card').forEach(card => {
    const shine = card.querySelector('.card-shine')
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect()
      const x  = e.clientX - rect.left
      const y  = e.clientY - rect.top
      const cx = rect.width  / 2
      const cy = rect.height / 2
      const rotY =  ((x - cx) / cx) * 6
      const rotX = -((y - cy) / cy) * 6
      card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`
      if (shine) {
        shine.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(201,168,76,0.13) 0%, transparent 55%)`
        shine.style.opacity = '1'
      }
    })
    card.addEventListener('mouseleave', () => {
      card.style.transform = ''
      if (shine) shine.style.opacity = '0'
    })
  })


  // ── 4. Magnetic buttons
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect()
      const x = e.clientX - r.left - r.width  / 2
      const y = e.clientY - r.top  - r.height / 2
      el.style.transform = `translate(${x * 0.22}px, ${y * 0.22}px)`
    })
    el.addEventListener('mouseleave', () => { el.style.transform = '' })
  })

})