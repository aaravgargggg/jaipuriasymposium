// ════════════════════════════════════════
// CURSOR.JS — Custom gold cursor
// Works on desktop only; hides on touch
// Jaipuria Symposium 2026
// ════════════════════════════════════════

const dot  = document.getElementById('cur-dot')
const ring = document.getElementById('cur-ring')

// Only run on non-touch, pointer-capable devices
if (dot && ring && window.matchMedia('(pointer: fine)').matches) {

  let mouseX = 0, mouseY = 0
  let ringX  = 0, ringY  = 0
  let hidden = false

  // ── Move dot instantly ──
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX
    mouseY = e.clientY
    dot.style.left = mouseX + 'px'
    dot.style.top  = mouseY + 'px'
    if (hidden) {
      dot.style.opacity  = '1'
      ring.style.opacity = '0.5'
      hidden = false
    }
  })

  // ── Ring follows with lerp ──
  ;(function animateRing() {
    ringX += (mouseX - ringX) * 0.11
    ringY += (mouseY - ringY) * 0.11
    ring.style.left = ringX + 'px'
    ring.style.top  = ringY + 'px'
    requestAnimationFrame(animateRing)
  })()

  // ── Interactive targets ──
  const TARGETS = 'a, button, .tilt-card, .committee-card, .stat-card, .format-card, .school-card, .team-card, input, textarea, select, label, .filter-tab, .modal-close, .btn-remove-team'

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(TARGETS)) {
      ring.classList.add('big')
      dot.style.transform = 'translate(-50%, -50%) scale(1.5)'
    }
  })

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(TARGETS)) {
      ring.classList.remove('big')
      dot.style.transform = 'translate(-50%, -50%) scale(1)'
    }
  })

  document.addEventListener('mousedown', () => {
    ring.classList.add('clicking')
    dot.style.transform = 'translate(-50%, -50%) scale(0.7)'
  })

  document.addEventListener('mouseup', () => {
    ring.classList.remove('clicking')
    dot.style.transform = 'translate(-50%, -50%) scale(1)'
  })

  // ── Hide when cursor leaves window ──
  document.addEventListener('mouseleave', () => {
    dot.style.opacity  = '0'
    ring.style.opacity = '0'
    hidden = true
  })

  document.addEventListener('mouseenter', () => {
    dot.style.opacity  = '1'
    ring.style.opacity = '0.5'
    hidden = false
  })

} else if (dot && ring) {
  // Touch device — remove cursor elements
  dot.remove()
  ring.remove()
  document.body.style.cursor = 'auto'
}