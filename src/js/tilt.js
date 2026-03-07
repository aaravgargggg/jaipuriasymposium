// ════════════════════════════════════════
// 3D CARD TILT — desktop only
// ════════════════════════════════════════

if (!('ontouchstart' in window)) {
  document.querySelectorAll('.tilt-card').forEach((card) => {
    const shine = card.querySelector('.card-shine')

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect()
      const cx = rect.left + rect.width  / 2
      const cy = rect.top  + rect.height / 2
      const rotX = -((e.clientY - cy) / (rect.height / 2)) * 11
      const rotY =  ((e.clientX - cx) / (rect.width  / 2)) * 11

      card.style.transform  = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(6px)`
      card.style.transition = 'transform 0.1s ease'

      if (shine) {
        shine.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width)  * 100}%`)
        shine.style.setProperty('--my', `${((e.clientY - rect.top)  / rect.height) * 100}%`)
      }
    })

    card.addEventListener('mouseleave', () => {
      card.style.transform  = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0px)'
      card.style.transition = 'transform 0.5s var(--ease-smooth)'
    })
  })
}