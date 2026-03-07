import * as THREE from 'three'

// ════════════════════════════════════════
// PARTICLE FIELD
// ════════════════════════════════════════
function initParticles() {
  const canvas = document.getElementById('particle-canvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const isMobile = window.innerWidth < 768
  const COUNT = isMobile ? 55 : 120
  const DIST  = isMobile ? 80 : 120
  const GOLD  = '201, 168, 76'
  let w, h, particles

  function resize() {
    w = canvas.width  = window.innerWidth
    h = canvas.height = window.innerHeight
  }

  class P {
    constructor() { this.reset() }
    reset() {
      this.x  = Math.random() * w
      this.y  = Math.random() * h
      this.vx = (Math.random() - 0.5) * 0.38
      this.vy = (Math.random() - 0.5) * 0.38
      this.r  = Math.random() * 1.4 + 0.5
      this.o  = Math.random() * 0.5 + 0.2
    }
    update() {
      this.x += this.vx; this.y += this.vy
      if (this.x < 0 || this.x > w) this.vx *= -1
      if (this.y < 0 || this.y > h) this.vy *= -1
    }
    draw() {
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${GOLD}, ${this.o})`
      ctx.fill()
    }
  }

  resize()
  particles = Array.from({ length: COUNT }, () => new P())

  ;(function loop() {
    ctx.clearRect(0, 0, w, h)
    for (let i = 0; i < particles.length; i++) {
      particles[i].update()
      particles[i].draw()
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const d  = Math.sqrt(dx * dx + dy * dy)
        if (d < DIST) {
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.strokeStyle = `rgba(${GOLD}, ${(1 - d / DIST) * 0.22})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }
    requestAnimationFrame(loop)
  })()

  window.addEventListener('resize', () => { resize(); particles = Array.from({ length: COUNT }, () => new P()) })
}

// ════════════════════════════════════════
// THREE.JS GLOBE — desktop only
// ════════════════════════════════════════
function initGlobe() {
  const canvas = document.getElementById('globe-canvas')
  if (!canvas || window.innerWidth < 1024) return

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(canvas.offsetWidth, canvas.offsetHeight)

  const scene  = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, canvas.offsetWidth / canvas.offsetHeight, 0.1, 100)
  camera.position.z = 2.8

  // Wireframe globe
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(1, 40, 40),
    new THREE.MeshBasicMaterial({ color: 0xc9a84c, wireframe: true, transparent: true, opacity: 0.22 })
  )
  scene.add(globe)

  // Outer glow shell
  const outer = new THREE.Mesh(
    new THREE.SphereGeometry(1.01, 40, 40),
    new THREE.MeshBasicMaterial({ color: 0xc9a84c, transparent: true, opacity: 0.03, side: THREE.BackSide })
  )
  scene.add(outer)

  // City node dots
  const cities = [
    { lat: 26.85, lng: 80.95 }, // Lucknow
    { lat: 51.5,  lng: -0.1  }, // London
    { lat: 40.7,  lng: -74.0 }, // New York
    { lat: 35.7,  lng: 139.7 }, // Tokyo
    { lat: 48.9,  lng: 2.3   }, // Paris
    { lat: 1.3,   lng: 103.8 }, // Singapore
    { lat: -33.9, lng: 151.2 }, // Sydney
    { lat: 19.1,  lng: 72.9  }, // Mumbai
    { lat: 25.2,  lng: 55.3  }, // Dubai
    { lat: 31.2,  lng: 121.5 }, // Shanghai
    { lat: 28.6,  lng: 77.2  }, // Delhi
    { lat: 55.8,  lng: 37.6  }, // Moscow
  ]

  const dotGeo = new THREE.SphereGeometry(0.018, 8, 8)
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xf0c060 })

  cities.forEach(({ lat, lng }) => {
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

  // Equator ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.003, 8, 100),
    new THREE.MeshBasicMaterial({ color: 0xc9a84c, transparent: true, opacity: 0.28 })
  )
  ring.rotation.x = Math.PI / 2
  scene.add(ring)

  let targetRotY = 0, currentRotY = 0
  document.addEventListener('mousemove', (e) => {
    targetRotY = (e.clientX / window.innerWidth - 0.5) * 0.5
  })

  window.addEventListener('resize', () => {
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight)
    camera.aspect = canvas.offsetWidth / canvas.offsetHeight
    camera.updateProjectionMatrix()
  })

  const clock = new THREE.Clock()
  ;(function animate() {
    requestAnimationFrame(animate)
    const t = clock.getElapsedTime()
    globe.rotation.y = t * 0.08
    currentRotY += (targetRotY - currentRotY) * 0.05
    globe.rotation.x = currentRotY * 0.3
    outer.material.opacity = 0.03 + Math.sin(t * 1.5) * 0.015
    renderer.render(scene, camera)
  })()
}

initParticles()
initGlobe()