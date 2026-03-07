// ════════════════════════════════════════
// DASHBOARD.JS — Jaipuria Symposium 2026
// School dashboard with realtime code updates
// ════════════════════════════════════════

// ─────────────────────────────────────────
// !! REPLACE THESE WITH YOUR REAL VALUES !!
// ─────────────────────────────────────────
const SUPABASE_URL      = 'https://tkvrukemedlxjxrlzvhe.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrdnJ1a2VtZWRseGp4cmx6dmhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTA5MDIsImV4cCI6MjA4ODM2NjkwMn0.OjbL8UM8UsKjcPihNcLBEu-Ka9KLSVGD36Vh7OsZ80s'
// ─────────────────────────────────────────

let supabase      = null
let realtimeSub   = null
let currentSchool = null

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

  if (!supabase) {
    showError('Database not configured.')
    return
  }

  // Auth guard — must be logged in
  const { data: { session }, error: sessionErr } = await supabase.auth.getSession()

  if (sessionErr || !session) {
    window.location.replace('login.html')
    return
  }

  // Wire logout
  document.getElementById('logout-btn').addEventListener('click', handleLogout)

  // Load data
  await loadDashboard(session.user.id)
})

// ════════════════════════════════════════
// LOAD DASHBOARD
// ════════════════════════════════════════
async function loadDashboard(userId) {
  try {

    // ── Fetch school record ──
    const { data: school, error: schoolErr } = await supabase
      .from('schools')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (schoolErr || !school) {
      // Edge case: auth user exists but school record doesn't
      // Could happen if registration was interrupted
      showError('Could not find your school registration. Please contact the organiser.')
      return
    }

    currentSchool = school

    // ── Fetch teams ──
    const { data: teams, error: teamsErr } = await supabase
      .from('teams')
      .select('*')
      .eq('school_id', school.id)
      .order('team_number', { ascending: true })

    if (teamsErr) {
      console.warn('Could not load teams:', teamsErr.message)
    }

    // ── Render everything ──
    renderDashboard(school, teams || [])

    // ── Set up realtime subscription ──
    // Listens for changes to this school's row — fires when admin sends code
    setupRealtime(school.id)

    // ── Show dashboard ──
    document.getElementById('dash-loading').style.display = 'none'
    document.getElementById('dash-main').style.display    = 'block'

  } catch (err) {
    console.error('Dashboard load error:', err)
    showError(err.message || 'Could not load dashboard.')
  }
}

// ════════════════════════════════════════
// RENDER
// ════════════════════════════════════════
function renderDashboard(school, teams) {

  // ── Nav ──
  setText('nav-school-name', school.school_name)

  // ── Welcome ──
  setText('welcome-school-name', school.school_name)
  setText('welcome-city', `${school.city} · ${capitalize(school.location_type)}`)

  // ── Code card ──
  renderCodeCard(school)

  // ── Info sidebar ──
  setText('info-school', school.school_name)
  setText('info-city',   `${school.city} (${capitalize(school.location_type)})`)
  setText('info-tic',    school.teacher_in_charge_name)
  setText('info-phone',  school.teacher_in_charge_phone)
  setText('info-email',  school.email)
  setText('info-escort', school.escort_teacher_name)
  setText('info-date',   formatDate(school.created_at))

  // ── Teams ──
  renderTeams(teams)
}

function renderCodeCard(school) {
  const card      = document.getElementById('code-card')
  const pending   = document.getElementById('code-pending')
  const confirmed = document.getElementById('code-confirmed')
  const badge     = document.getElementById('status-badge')
  const statusTxt = document.getElementById('status-text')

  if (school.code_sent && school.school_code) {
    // ── CONFIRMED ──
    card.classList.add('confirmed')
    pending.style.display   = 'none'
    confirmed.style.display = 'block'

    setText('code-display', school.school_code)
    setText('code-sent-at', school.code_sent_at
      ? `Code sent on ${formatDate(school.code_sent_at)}`
      : 'Code has been sent to your email and WhatsApp.')

    badge.className = 'dash-status-badge confirmed'
    statusTxt.textContent = 'Confirmed'

  } else {
    // ── PENDING ──
    card.classList.remove('confirmed')
    pending.style.display   = 'block'
    confirmed.style.display = 'none'

    badge.className = 'dash-status-badge pending'
    statusTxt.textContent = 'Pending'
  }
}

function renderTeams(teams) {
  const container = document.getElementById('teams-list')
  const countBadge = document.getElementById('team-count-badge')

  countBadge.textContent = `${teams.length} ${teams.length === 1 ? 'team' : 'teams'}`

  if (teams.length === 0) {
    container.innerHTML = `
      <div class="teams-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="margin:0 auto 12px;display:block;opacity:0.4;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        No teams registered yet.
      </div>`
    return
  }

  const committeeLabels = {
    ERT: 'Economic Round Table',
    SHC: 'Social & Humanitarian Council',
    TIF: 'Tech & Innovation Forum',
    PCC: 'Political & Cultural Council',
  }

  container.innerHTML = teams.map(team => `
    <div class="team-card">
      <div class="team-card-header">
        <span class="team-card-num">Team ${team.team_number}</span>
        <span class="team-card-committee">${committeeLabels[team.committee] || team.committee}</span>
      </div>
      <div class="team-participants">
        ${[1, 2, 3].map(p => `
          <div class="participant-item">
            <span class="participant-name">${esc(team[`participant_${p}_name`])}</span>
            <span class="participant-class">Class ${esc(team[`participant_${p}_class`])}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')
}

// ════════════════════════════════════════
// REALTIME — fires when admin sends code
// ════════════════════════════════════════
function setupRealtime(schoolId) {
  // Clean up any existing subscription
  if (realtimeSub) {
    supabase.removeChannel(realtimeSub)
  }

  realtimeSub = supabase
    .channel(`school-${schoolId}`)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'schools',
        filter: `id=eq.${schoolId}`,
      },
      (payload) => {
        // Admin just updated this school's record
        const updated = payload.new
        currentSchool = { ...currentSchool, ...updated }

        // Animate the code card update
        renderCodeCard(currentSchool)

        // If code was just sent, show a toast
        if (updated.code_sent && updated.school_code) {
          showToast(`🎉 Your school code is ready: ${updated.school_code}`)
        }
      }
    )
    .subscribe()
}

// ════════════════════════════════════════
// LOGOUT
// ════════════════════════════════════════
async function handleLogout() {
  const btn = document.getElementById('logout-btn')
  btn.disabled     = true
  btn.textContent  = 'Logging out…'

  // Clean up realtime
  if (realtimeSub) supabase.removeChannel(realtimeSub)

  await supabase.auth.signOut()
  window.location.replace('login.html')
}

// ════════════════════════════════════════
// TOAST NOTIFICATION
// ════════════════════════════════════════
function showToast(msg) {
  // Remove existing toast
  document.getElementById('dash-toast')?.remove()

  const toast = document.createElement('div')
  toast.id    = 'dash-toast'
  toast.style.cssText = `
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: var(--navy-card);
    border: 1px solid var(--chamber-gold);
    color: var(--ivory-white);
    font-family: var(--font-ui);
    font-size: 14px;
    padding: 14px 28px;
    border-radius: var(--radius-pill);
    box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(201,168,76,0.2);
    z-index: 9000;
    opacity: 0;
    transition: all 0.35s ease;
    white-space: nowrap;
    max-width: 90vw;
    text-align: center;
  `
  toast.textContent = msg
  document.body.appendChild(toast)

  requestAnimationFrame(() => {
    toast.style.opacity   = '1'
    toast.style.transform = 'translateX(-50%) translateY(0)'
  })

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    toast.style.opacity   = '0'
    toast.style.transform = 'translateX(-50%) translateY(12px)'
    setTimeout(() => toast.remove(), 400)
  }, 5000)
}

// ════════════════════════════════════════
// ERROR STATE
// ════════════════════════════════════════
function showError(msg) {
  document.getElementById('dash-loading').innerHTML = `
    <div style="text-align:center;padding:40px 20px;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="1.5" style="margin:0 auto 16px;display:block;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      <p style="color:#f87171;font-family:var(--font-ui);font-size:15px;margin-bottom:8px;">${esc(msg)}</p>
      <p style="color:var(--silver-mist);font-size:13px;font-family:var(--font-ui);">
        Please <a href="login.html" style="color:var(--chamber-gold);">log in again</a> or contact the organiser.
      </p>
    </div>
  `
}

// ════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════
function setText(id, val) {
  const el = document.getElementById(id)
  if (el) el.textContent = val ?? '—'
}

function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

// Simple HTML escape to prevent XSS
function esc(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}