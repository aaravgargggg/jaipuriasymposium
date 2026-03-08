// ════════════════════════════════════════
// TILT.JS — 3D perspective card tilt
// Desktop only, uses CSS custom props
// for the card-shine radial gradient
// Jaipuria Symposium 2026
// ════════════════════════════════════════

// Skip on touch devices
if (window.matchMedia('(pointer: fine)').matches) {

  function initTilt(selector) {
    document.querySelectorAll(selector).forEach((card) => {
      const shine = card.querySelector('.card-shine')

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect()
        const cx   = rect.left + rect.width  / 2
        const cy   = rect.top  + rect.height / 2
        const rotX = -((e.clientY - cy) / (rect.height / 2)) * 10
        const rotY =  ((e.clientX - cx) / (rect.width  / 2)) * 10

        card.style.transform  = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(8px)`
        card.style.transition = 'transform 0.08s ease'

        if (shine) {
          const mx = ((e.clientX - rect.left) / rect.width)  * 100
          const my = ((e.clientY - rect.top)  / rect.height) * 100
          shine.style.setProperty('--mx', `${mx}%`)
          shine.style.setProperty('--my', `${my}%`)
        }
      })

      card.addEventListener('mouseleave', () => {
        card.style.transform  = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)'
        card.style.transition = 'transform 0.5s var(--ease-smooth)'
        // Fade out shine
        if (shine) shine.style.opacity = '0'
      })

      card.addEventListener('mouseenter', () => {
        if (shine) shine.style.opacity = '1'
      })
    })
  }

  // Run on DOM ready (if deferred) or immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initTilt('.tilt-card'))
  } else {
    initTilt('.tilt-card')
  }
}