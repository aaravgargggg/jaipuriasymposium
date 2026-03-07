// ════════════════════════════════════════
// CUSTOM CURSOR
// ════════════════════════════════════════

const dot  = document.getElementById('cur-dot')
const ring = document.getElementById('cur-ring')

if (dot && ring && !('ontouchstart' in window)) {
  let mouseX = 0, mouseY = 0
  let ringX = 0,  ringY = 0

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX
    mouseY = e.clientY
    dot.style.left = mouseX + 'px'
    dot.style.top  = mouseY + 'px'
  })

  ;(function animateRing() {
    ringX += (mouseX - ringX) * 0.12
    ringY += (mouseY - ringY) * 0.12
    ring.style.left = ringX + 'px'
    ring.style.top  = ringY + 'px'
    requestAnimationFrame(animateRing)
  })()

  const targets = 'a, button, .tilt-card, .committee-card, .stat-card, .format-card, input, textarea, select, .btn'

  document.addEventListener('mouseover', (e) => { if (e.target.closest(targets)) ring.classList.add('big') })
  document.addEventListener('mouseout',  (e) => { if (e.target.closest(targets)) ring.classList.remove('big') })
  document.addEventListener('mousedown', () => ring.classList.add('clicking'))
  document.addEventListener('mouseup',   () => ring.classList.remove('clicking'))
  document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0' })
  document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '0.5' })
} else if (dot && ring) {
  // Touch device — hide cursor elements
  dot.style.display  = 'none'
  ring.style.display = 'none'
  document.body.style.cursor = 'auto'
}