// ════════════════════════════════════════
// LOGIN.JS — Jaipuria Symposium 2026
// ════════════════════════════════════════

// ─────────────────────────────────────────
// !! REPLACE THESE WITH YOUR REAL VALUES !!
// ─────────────────────────────────────────
const SUPABASE_URL      = 'https://tkvrukemedlxjxrlzvhe.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrdnJ1a2VtZWRseGp4cmx6dmhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTA5MDIsImV4cCI6MjA4ODM2NjkwMn0.OjbL8UM8UsKjcPihNcLBEu-Ka9KLSVGD36Vh7OsZ80s'
// ─────────────────────────────────────────

let supabase = null

async function initSupabase() {
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  } catch (e) {
    console.warn('Supabase init failed:', e.message)
  }
}

// ════════════════════════════════════════
// BOOT
// ════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {

  await initSupabase()

  // Already logged in? Go straight to dashboard
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Check if admin → redirect to admin panel instead
        const { data: adminRow } = await supabase
          .from('admins')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (adminRow) {
          window.location.replace('admin.html')
        } else {
          window.location.replace('dashboard.html')
        }
        return
      }
    } catch (_) {}
  }

  // Wire password toggle
  document.getElementById('toggle-login-pass')?.addEventListener('click', () => {
    const inp  = document.getElementById('login-password')
    const icon = document.querySelector('#toggle-login-pass svg')
    const show = inp.type === 'password'
    inp.type            = show ? 'text' : 'password'
    icon.style.opacity  = show ? '1' : '0.4'
  })

  // Wire form submit
  document.getElementById('login-form').addEventListener('submit', handleLogin)

  // Clear errors on input
  document.getElementById('login-email').addEventListener('input', () => clearErr('err-login-email'))
  document.getElementById('login-password').addEventListener('input', () => clearErr('err-login-password'))
})

// ════════════════════════════════════════
// VALIDATION
// ════════════════════════════════════════
function clearErr(id) {
  const el = document.getElementById(id)
  if (el) { el.textContent = ''; el.classList.remove('visible') }
  const inputId = id.replace(/^err-/, '')
  const inp     = document.getElementById(inputId)
  if (inp) inp.classList.remove('error')
}

function setErr(id, msg) {
  const el = document.getElementById(id)
  if (el) { el.textContent = msg; el.classList.add('visible') }
  const inputId = id.replace(/^err-/, '')
  const inp     = document.getElementById(inputId)
  if (inp) { inp.classList.add('error'); inp.classList.remove('valid') }
}

function validate() {
  let valid = true

  const email = document.getElementById('login-email').value.trim()
  const pass  = document.getElementById('login-password').value

  if (!email) {
    setErr('err-login-email', 'Email address is required.')
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setErr('err-login-email', 'Please enter a valid email address.')
    valid = false
  } else {
    document.getElementById('login-email').classList.add('valid')
  }

  if (!pass) {
    setErr('err-login-password', 'Password is required.')
    valid = false
  }

  return valid
}

// ════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════
async function handleLogin(e) {
  e.preventDefault()
  if (!validate()) return

  setLoading(true)
  hideAlerts()

  const email    = document.getElementById('login-email').value.trim().toLowerCase()
  const password = document.getElementById('login-password').value

  try {
    if (!supabase) throw new Error('Database not configured. Please contact the organiser.')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // Supabase returns "Invalid login credentials" for wrong email/pass
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        throw new Error('Incorrect email or password. Please check and try again.')
      }
      throw new Error(error.message)
    }

    // Check if this user is an admin
    const { data: adminRow } = await supabase
      .from('admins')
      .select('role')
      .eq('user_id', data.user.id)
      .maybeSingle()

    showSuccess()

    setTimeout(() => {
      if (adminRow) {
        window.location.replace('admin.html')
      } else {
        window.location.replace('dashboard.html')
      }
    }, 1200)

  } catch (err) {
    console.error('Login error:', err)
    showErrorBanner(err.message || 'Login failed. Please try again.')
    setLoading(false)
  }
}

// ════════════════════════════════════════
// UI HELPERS
// ════════════════════════════════════════
function setLoading(on) {
  const btn     = document.getElementById('login-btn')
  const label   = document.getElementById('login-label')
  const arrow   = document.getElementById('login-arrow')
  const spinner = document.getElementById('login-spinner')
  btn.disabled          = on
  label.textContent     = on ? 'Logging in…' : 'Log In'
  arrow.style.display   = on ? 'none' : 'inline'
  spinner.style.display = on ? 'inline-block' : 'none'
}

function hideAlerts() {
  document.getElementById('login-error').style.display   = 'none'
  document.getElementById('login-success').style.display = 'none'
}

function showErrorBanner(msg) {
  const el = document.getElementById('login-error')
  document.getElementById('login-error-msg').textContent = msg
  el.style.display = 'flex'
}

function showSuccess() {
  setLoading(false)
  hideAlerts()
  document.getElementById('login-success').style.display = 'flex'
}