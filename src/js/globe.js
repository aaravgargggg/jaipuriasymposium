// ════════════════════════════════════════
// GLOBE.JS — Hero particle field +
// Three.js wireframe globe
// Jaipuria Symposium 2026
// ════════════════════════════════════════

import * as THREE from 'three'

// ════════════════════════════════════════
// PARTICLE FIELD — canvas 2D
// Connected gold dots that drift and
// link with faint lines when close
// ════════════════════════════════════════
function initParticles() {
  const canvas = document.getElementById('particle-canvas')
  if (!canvas) return

  const ctx      = canvas.getContext('2d')
  const isMobile = window.innerWidth < 768
  const COUNT    = isMobile ? 55 : 110
  const DIST     = isMobile ? 80 : 120
  const GOLD     = '201, 168, 76'

  let w, h, particles

  function resize() {
    w = canvas.width  = window.innerWidth
    h = canvas.height = window.innerHeight
  }

  class Particle {
    constructor() { this.reset() }

    reset() {
      this.x  = Math.random() * w
      this.y  = Math.random() * h
      this.vx = (Math.random() - 0.5) * 0.35
      this.vy = (Math.random() - 0.5) * 0.35
      this.r  = Math.random() * 1.4 + 0.4
      this.o  = Math.random() * 0.45 + 0.18
    }

    update() {
      this.x += this.vx
      this.y += this.vy
      if (this.x < -2 || this.x > w + 2) this.vx *= -1
      if (this.y < -2 || this.y > h + 2) this.vy *= -1
    }

    draw() {
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${GOLD}, ${this.o})`
      ctx.fill()
    }
  }

  resize()
  particles = Array.from({ length: COUNT }, () => new Particle())

  function loop() {
    ctx.clearRect(0, 0, w, h)

    for (let i = 0; i < particles.length; i++) {
      particles[i].update()
      particles[i].draw()

      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const d  = Math.sqrt(dx * dx + dy * dy)

        if (d < DIST) {
          const alpha = (1 - d / DIST) * 0.20
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.strokeStyle = `rgba(${GOLD}, ${alpha})`
          ctx.lineWidth   = 0.6
          ctx.stroke()
        }
      }
    }

    requestAnimationFrame(loop)
  }

  loop()

  window.addEventListener('resize', () => {
    resize()
    particles = Array.from({ length: COUNT }, () => new Particle())
  })
}

// ════════════════════════════════════════
// THREE.JS GLOBE — desktop only (≥1024px)
// Wireframe sphere with city dot markers,
// equatorial ring, and mouse-responsive
// tilt — rotates slowly over time
// ════════════════════════════════════════
function initGlobe() {
  const canvas = document.getElementById('globe-canvas')
  if (!canvas || window.innerWidth < 1024) return

  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(canvas.offsetWidth, canvas.offsetHeight)

  // ── Scene & Camera ──
  const scene  = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, canvas.offsetWidth / canvas.offsetHeight, 0.1, 100)
  camera.position.z = 2.8

  // ── Main wireframe globe ──
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(1, 42, 42),
    new THREE.MeshBasicMaterial({
      color: 0xC9A84C,
      wireframe: true,
      transparent: true,
      opacity: 0.20,
    })
  )
  scene.add(globe)

  // ── Outer glow shell ──
  const glowMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.015, 42, 42),
    new THREE.MeshBasicMaterial({
      color: 0xC9A84C,
      transparent: true,
      opacity: 0.03,
      side: THREE.BackSide,
    })
  )
  scene.add(glowMesh)

  // ── Equatorial ring ──
  const equator = new THREE.Mesh(
    new THREE.TorusGeometry(1.10, 0.0028, 8, 120),
    new THREE.MeshBasicMaterial({ color: 0xC9A84C, transparent: true, opacity: 0.28 })
  )
  equator.rotation.x = Math.PI / 2
  scene.add(equator)

  // ── City dots ──
  const CITIES = [
    { lat: 26.85,  lng:  80.95 }, // Lucknow (host)
    { lat: 28.6,   lng:  77.2  }, // Delhi
    { lat: 19.1,   lng:  72.9  }, // Mumbai
    { lat: 12.97,  lng:  77.6  }, // Bengaluru
    { lat: 51.5,   lng:  -0.1  }, // London
    { lat: 48.85,  lng:   2.35 }, // Paris
    { lat: 52.5,   lng:  13.4  }, // Berlin
    { lat: 40.71,  lng: -74.0  }, // New York
    { lat: 37.77,  lng:-122.4  }, // San Francisco
    { lat: 35.68,  lng: 139.7  }, // Tokyo
    { lat:  1.35,  lng: 103.8  }, // Singapore
    { lat: -33.87, lng: 151.2  }, // Sydney
    { lat: 25.2,   lng:  55.3  }, // Dubai
    { lat: 31.23,  lng: 121.5  }, // Shanghai
    { lat: 55.75,  lng:  37.6  }, // Moscow
    { lat: -23.55, lng: -46.6  }, // São Paulo
  ]

  const dotGeo = new THREE.SphereGeometry(0.016, 8, 8)
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xF0C060 })

  CITIES.forEach(({ lat, lng }) => {
    const phi   = (90 - lat) * (Math.PI / 180)
    const theta = (lng + 180) * (Math.PI / 180)
    const dot   = new THREE.Mesh(dotGeo, dotMat)
    dot.position.set(
      -Math.sin(phi) * Math.cos(theta),
       Math.cos(phi),
       Math.sin(phi) * Math.sin(theta)
    )
    scene.add(dot)
  })

  // ── Lucknow highlight dot (brighter) ──
  const hostDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xFFDD88 })
  )
  const hostPhi   = (90 - 26.85) * (Math.PI / 180)
  const hostTheta = (80.95 + 180) * (Math.PI / 180)
  hostDot.position.set(
    -Math.sin(hostPhi) * Math.cos(hostTheta),
     Math.cos(hostPhi),
     Math.sin(hostPhi) * Math.sin(hostTheta)
  )
  scene.add(hostDot)

  // ── Mouse influence ──
  let targetRotY = 0, currentRotY = 0

  document.addEventListener('mousemove', (e) => {
    targetRotY = (e.clientX / window.innerWidth - 0.5) * 0.55
  })

  // ── Resize ──
  window.addEventListener('resize', () => {
    if (window.innerWidth < 1024) {
      renderer.domElement.style.display = 'none'
      return
    }
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight)
    camera.aspect = canvas.offsetWidth / canvas.offsetHeight
    camera.updateProjectionMatrix()
  })

  // ── Animation loop ──
  const clock = new THREE.Clock()

  ;(function animate() {
    requestAnimationFrame(animate)
    const t = clock.getElapsedTime()

    // Slow auto-rotation
    globe.rotation.y    = t * 0.07
    equator.rotation.z  = t * 0.04
    glowMesh.rotation.y = t * 0.07

    // Mouse tilt
    currentRotY += (targetRotY - currentRotY) * 0.04
    globe.rotation.x    = currentRotY * 0.28
    glowMesh.rotation.x = currentRotY * 0.28

    // Pulse glow
    glowMesh.material.opacity = 0.025 + Math.sin(t * 1.4) * 0.015

    renderer.render(scene, camera)
  })()
}

// ── Boot ──
initParticles()
initGlobe()