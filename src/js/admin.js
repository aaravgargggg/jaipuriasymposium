// ════════════════════════════════════════════════════════════
// ADMIN.JS — Jaipuria Symposium 2026
// Admin panel: view all schools, search, filter,
// send school codes, realtime updates
// ════════════════════════════════════════════════════════════

// ─────────────────────────────────────────
// !! REPLACE THESE WITH YOUR REAL VALUES !!
// ─────────────────────────────────────────
const SUPABASE_URL      = 'https://tkvrukemedlxjxrlzvhe.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrdnJ1a2VtZWRseGp4cmx6dmhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTA5MDIsImV4cCI6MjA4ODM2NjkwMn0.OjbL8UM8UsKjcPihNcLBEu-Ka9KLSVGD36Vh7OsZ80s'
// ─────────────────────────────────────────

let supabase      = null
let allSchools    = []      // full dataset
let allTeams      = {}      // { schoolId: [teams] }
let adminRole     = null    // 'super_admin' | 'manager'
let activeFilter  = 'all'
let searchQuery   = ''
let modalSchoolId = null    // currently open modal
let realtimeSub   = null

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
    showLoadError('Database not configured.')
    return
  }

  // ── Auth guard ──
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    window.location.replace('login.html')
    return
  }

  // ── Must be an admin ──
  const { data: adminRow } = await supabase
    .from('admins')
    .select('name, role, email')
    .eq('user_id', session.user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!adminRow) {
    // Not an admin — redirect to school dashboard
    window.location.replace('dashboard.html')
    return
  }

  adminRole = adminRow.role
  setText('admin-nav-user', adminRow.name || adminRow.email)
  setText('admin-nav-role', adminRow.role === 'super_admin' ? 'Super Admin' : 'Manager')

  // ── Load data ──
  await loadAll()

  // ── Wire up UI ──
  document.getElementById('logout-btn').addEventListener('click', handleLogout)
  document.getElementById('search-input').addEventListener('input', onSearch)
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      activeFilter = btn.dataset.filter
      renderSchoolsList()
    })
  })
  document.getElementById('modal-close').addEventListener('click', closeModal)
  document.getElementById('school-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal()
  })
  document.getElementById('modal-send-btn').addEventListener('click', handleSendCode)
  document.getElementById('code-autofill-btn').addEventListener('click', autofillCode)
  document.getElementById('code-input').addEventListener('input', () => {
    clearCodeError()
    // Auto-uppercase as user types
    const inp = document.getElementById('code-input')
    const pos = inp.selectionStart
    inp.value = inp.value.toUpperCase()
    inp.setSelectionRange(pos, pos)
  })

  // ── Keyboard: close modal on Escape ──
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal()
  })

  // ── Show panel ──
  document.getElementById('admin-loading').style.display = 'none'
  document.getElementById('admin-main').style.display    = 'block'

  // ── Realtime: listen for any school update ──
  setupRealtime()
})

// ════════════════════════════════════════
// LOAD ALL DATA
// ════════════════════════════════════════
async function loadAll() {
  try {
    // Fetch all schools
    const { data: schools, error: sErr } = await supabase
      .from('schools')
      .select('*')
      .order('created_at', { ascending: false })

    if (sErr) throw sErr
    allSchools = schools || []

    // Fetch all teams
    const { data: teams, error: tErr } = await supabase
      .from('teams')
      .select('*')
      .order('team_number', { ascending: true })

    if (tErr) throw tErr

    // Group teams by school_id
    allTeams = {}
    ;(teams || []).forEach(t => {
      if (!allTeams[t.school_id]) allTeams[t.school_id] = []
      allTeams[t.school_id].push(t)
    })

    updateStats()
    renderSchoolsList()

  } catch (err) {
    console.error('Load error:', err)
  }
}

// ════════════════════════════════════════
// STATS BAR
// ════════════════════════════════════════
function updateStats() {
  const total      = allSchools.length
  const local      = allSchools.filter(s => s.location_type === 'local').length
  const outstation = allSchools.filter(s => s.location_type === 'outstation').length
  const confirmed  = allSchools.filter(s => s.status === 'confirmed').length
  const pending    = allSchools.filter(s => s.status === 'pending').length
  const delegates  = Object.values(allTeams).flat().length * 3

  setText('stat-total',      total)
  setText('stat-local',      local)
  setText('stat-outstation', outstation)
  setText('stat-confirmed',  confirmed)
  setText('stat-pending',    pending)
  setText('stat-delegates',  delegates)
}

// ════════════════════════════════════════
// FILTER + SEARCH + RENDER
// ════════════════════════════════════════
function onSearch(e) {
  searchQuery = e.target.value.trim().toLowerCase()
  renderSchoolsList()
}

function getFilteredSchools() {
  return allSchools.filter(s => {
    // Filter tab
    if (activeFilter === 'local'      && s.location_type !== 'local')       return false
    if (activeFilter === 'outstation' && s.location_type !== 'outstation')  return false
    if (activeFilter === 'pending'    && s.status !== 'pending')             return false
    if (activeFilter === 'confirmed'  && s.status !== 'confirmed')           return false

    // Search
    if (searchQuery) {
      const haystack = [
        s.school_name,
        s.city,
        s.school_code || '',
        s.teacher_in_charge_name,
        s.email,
      ].join(' ').toLowerCase()
      if (!haystack.includes(searchQuery)) return false
    }

    return true
  })
}

function renderSchoolsList() {
  const filtered   = getFilteredSchools()
  const locals     = filtered.filter(s => s.location_type === 'local')
  const outstations = filtered.filter(s => s.location_type === 'outstation')

  // Update column counts
  setText('local-count',      `${locals.length}`)
  setText('outstation-count', `${outstations.length}`)

  // Render both columns
  renderColumn('local-list',      locals)
  renderColumn('outstation-list', outstations)
}

function renderColumn(containerId, schools) {
  const container = document.getElementById(containerId)

  if (schools.length === 0) {
    container.innerHTML = `<div class="column-empty">No schools here yet.</div>`
    return
  }

  container.innerHTML = schools.map(school => {
    const teams     = allTeams[school.id] || []
    const delegates = teams.length * 3
    const isConfirmed = school.status === 'confirmed'

    return `
      <div
        class="school-card ${isConfirmed ? 'confirmed' : 'pending'}"
        data-id="${school.id}"
        role="button"
        tabindex="0"
      >
        <div class="school-card-top">
          <div class="school-card-name">${esc(school.school_name)}</div>
          <span class="school-card-status ${isConfirmed ? 'confirmed' : 'pending'}">
            ${isConfirmed ? 'Confirmed' : 'Pending'}
          </span>
        </div>
        <div class="school-card-bottom">
          <div class="school-card-meta">
            <span class="school-card-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${esc(school.city)}
            </span>
            <span class="school-card-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              ${delegates} delegate${delegates !== 1 ? 's' : ''}
            </span>
            <span class="school-card-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              ${teams.length} team${teams.length !== 1 ? 's' : ''}
            </span>
          </div>
          ${school.school_code
            ? `<span class="school-card-code">${esc(school.school_code)}</span>`
            : ''}
        </div>
      </div>
    `
  }).join('')

  // Wire click handlers
  container.querySelectorAll('.school-card').forEach(card => {
    const id = card.dataset.id
    card.addEventListener('click', () => openModal(id))
    card.addEventListener('keydown', e => { if (e.key === 'Enter') openModal(id) })
  })
}

// ════════════════════════════════════════
// MODAL — open
// ════════════════════════════════════════
function openModal(schoolId) {
  const school = allSchools.find(s => s.id === schoolId)
  if (!school) return

  modalSchoolId = schoolId
  const teams = allTeams[schoolId] || []

  // Header
  const tag = document.getElementById('modal-location-tag')
  tag.textContent = school.location_type === 'local' ? '📍 Lucknow (Local)' : '✈️ Outstation'

  setText('modal-school-name', school.school_name)
  setText('modal-city', `${school.city}${school.address_line_2 ? ', ' + school.address_line_2 : ''}`)

  // Clear toast
  hideModalToast()

  // Code section
  renderModalCodeSection(school)

  // Info
  const addr = [school.address_line_1, school.address_line_2, school.city]
    .filter(Boolean).join(', ')

  setText('modal-tic-name',    school.teacher_in_charge_name)
  setText('modal-tic-phone',   school.teacher_in_charge_phone)
  setText('modal-tic-email',   school.email)
  setText('modal-escort-name', school.escort_teacher_name)
  setText('modal-escort-phone',school.escort_teacher_phone)
  setText('modal-address',     addr)
  setText('modal-reg-date',    formatDate(school.created_at))

  // Teams
  renderModalTeams(teams)

  // Show modal
  document.getElementById('school-modal').style.display = 'flex'
  document.body.style.overflow = 'hidden'

  // Focus code input
  setTimeout(() => document.getElementById('code-input')?.focus(), 100)
}

function renderModalCodeSection(school) {
  const sentDiv  = document.getElementById('modal-code-sent')
  const inputDiv = document.getElementById('modal-code-input-row')

  if (school.code_sent && school.school_code) {
    sentDiv.style.display = 'block'
    setText('modal-code-display', school.school_code)
    setText('modal-code-sent-at', school.code_sent_at
      ? `Sent on ${formatDate(school.code_sent_at)}`
      : 'Code has been sent.')
    // Pre-fill input so admin can update it
    document.getElementById('code-input').value = school.school_code
  } else {
    sentDiv.style.display = 'none'
    document.getElementById('code-input').value = ''
  }

  inputDiv.style.display = 'flex'
  clearCodeError()
}

function renderModalTeams(teams) {
  const countEl   = document.getElementById('modal-teams-count')
  const listEl    = document.getElementById('modal-teams-list')
  const delegates = teams.length * 3

  countEl.textContent = `${teams.length} team${teams.length !== 1 ? 's' : ''} · ${delegates} delegate${delegates !== 1 ? 's' : ''}`

  const committeeLabels = {
    ERT: 'Economic Round Table',
    SHC: 'Social & Humanitarian Council',
    TIF: 'Tech & Innovation Forum',
    PCC: 'Political & Cultural Council',
  }

  if (teams.length === 0) {
    listEl.innerHTML = `<p style="color:var(--silver-mist);font-size:13px;font-family:var(--font-ui);text-align:center;padding:20px 0;">No teams registered.</p>`
    return
  }

  listEl.innerHTML = teams.map(team => `
    <div class="modal-team-card">
      <div class="modal-team-header">
        <span class="modal-team-num">Team ${team.team_number}</span>
        <span class="modal-team-committee">${committeeLabels[team.committee] || team.committee}</span>
      </div>
      <div class="modal-participants">
        ${[1, 2, 3].map(p => `
          <div class="modal-participant-row">
            <span class="modal-participant-name">${esc(team[`participant_${p}_name`])}</span>
            <span class="modal-participant-class">Class ${esc(team[`participant_${p}_class`])}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')
}

// ════════════════════════════════════════
// MODAL — close
// ════════════════════════════════════════
function closeModal() {
  document.getElementById('school-modal').style.display = 'none'
  document.body.style.overflow = ''
  modalSchoolId = null
}

// ════════════════════════════════════════
// SEND CODE
// ════════════════════════════════════════
async function handleSendCode() {
  clearCodeError()

  const codeInput = document.getElementById('code-input')
  const code      = codeInput.value.trim().toUpperCase()

  // Validate
  if (!code) {
    showCodeError('Please enter a school code.')
    codeInput.focus()
    return
  }
  if (code.length < 4) {
    showCodeError('Code must be at least 4 characters.')
    codeInput.focus()
    return
  }
  if (!/^[A-Z0-9]+$/.test(code)) {
    showCodeError('Code must contain only letters and numbers.')
    codeInput.focus()
    return
  }

  // Check code not already used by another school
  const existing = allSchools.find(s => s.school_code === code && s.id !== modalSchoolId)
  if (existing) {
    showCodeError(`Code "${code}" is already assigned to ${existing.school_name}.`)
    return
  }

  setSendLoading(true)
  hideModalToast()

  try {
    // ── Call the send_school_code DB function ──
    const { data: result, error: fnErr } = await supabase
      .rpc('send_school_code', {
        p_school_id:   modalSchoolId,
        p_school_code: code,
      })

    if (fnErr) throw new Error(fnErr.message)
    if (!result?.success) throw new Error(result?.error || 'Unknown error from database.')

    // ── Send WhatsApp (placeholder — log for now) ──
    console.log('WhatsApp placeholder → send to:', result.teacher_in_charge_phone, {
      schoolName: result.school_name,
      schoolCode: result.school_code,
      city:       result.city,
    })

    // ── Update local state immediately ──
    const idx = allSchools.findIndex(s => s.id === modalSchoolId)
    if (idx !== -1) {
      allSchools[idx] = {
        ...allSchools[idx],
        school_code: code,
        code_sent:   true,
        code_sent_at: new Date().toISOString(),
        status:      'confirmed',
      }
    }

    // ── Update modal UI ──
    renderModalCodeSection(allSchools[idx])
    updateStats()
    renderSchoolsList()

    showModalToast(`✓ Code ${code} sent to ${result.school_name}`, 'success')

  } catch (err) {
    console.error('Send code error:', err)
    showModalToast(`Error: ${err.message}`, 'error')
  } finally {
    setSendLoading(false)
  }
}

// ════════════════════════════════════════
// AUTO-FILL CODE
// ════════════════════════════════════════
function autofillCode() {
  // Find the highest existing JS code number
  const usedNums = allSchools
    .map(s => s.school_code)
    .filter(c => c && /^JS\d+$/.test(c))
    .map(c => parseInt(c.replace('JS', ''), 10))
    .filter(n => !isNaN(n))

  const next   = usedNums.length > 0 ? Math.max(...usedNums) + 1 : 1
  const code   = 'JS' + String(next).padStart(4, '0')
  const input  = document.getElementById('code-input')
  input.value  = code
  input.focus()
  clearCodeError()
}

// ════════════════════════════════════════
// REALTIME — live updates from all schools
// ════════════════════════════════════════
function setupRealtime() {
  if (realtimeSub) supabase.removeChannel(realtimeSub)

  realtimeSub = supabase
    .channel('admin-schools-watch')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'schools' },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          // New school registered
          allSchools.unshift(payload.new)
          updateStats()
          renderSchoolsList()
        } else if (payload.eventType === 'UPDATE') {
          // School updated (e.g. code sent from another admin session)
          const idx = allSchools.findIndex(s => s.id === payload.new.id)
          if (idx !== -1) {
            allSchools[idx] = { ...allSchools[idx], ...payload.new }
          }
          updateStats()
          renderSchoolsList()
          // If this school's modal is open, refresh it
          if (modalSchoolId === payload.new.id) {
            renderModalCodeSection(allSchools.find(s => s.id === modalSchoolId))
          }
        } else if (payload.eventType === 'DELETE') {
          allSchools = allSchools.filter(s => s.id !== payload.old.id)
          updateStats()
          renderSchoolsList()
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'teams' },
      (payload) => {
        // New team added
        const t = payload.new
        if (!allTeams[t.school_id]) allTeams[t.school_id] = []
        allTeams[t.school_id].push(t)
        updateStats()
        renderSchoolsList()
      }
    )
    .subscribe()
}

// ════════════════════════════════════════
// LOGOUT
// ════════════════════════════════════════
async function handleLogout() {
  const btn = document.getElementById('logout-btn')
  btn.disabled = true
  if (realtimeSub) supabase.removeChannel(realtimeSub)
  await supabase.auth.signOut()
  window.location.replace('login.html')
}

// ════════════════════════════════════════
// UI HELPERS
// ════════════════════════════════════════

function setSendLoading(on) {
  const btn     = document.getElementById('modal-send-btn')
  const label   = document.getElementById('modal-send-label')
  const arrow   = document.getElementById('modal-send-arrow')
  const spinner = document.getElementById('modal-send-spinner')
  btn.disabled          = on
  label.textContent     = on ? 'Sending…' : 'Update & Send'
  arrow.style.display   = on ? 'none' : 'inline'
  spinner.style.display = on ? 'inline-block' : 'none'
}

function showCodeError(msg) {
  const el = document.getElementById('err-code-input')
  el.textContent = msg
  el.classList.add('visible')
  document.getElementById('code-input').classList.add('error')
}

function clearCodeError() {
  const el = document.getElementById('err-code-input')
  el.textContent = ''
  el.classList.remove('visible')
  document.getElementById('code-input').classList.remove('error')
}

function showModalToast(msg, type = 'success') {
  const el    = document.getElementById('modal-toast')
  el.textContent = msg
  el.className   = `modal-toast ${type}`
  el.style.display = 'block'
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  // Auto-hide success after 4s
  if (type === 'success') {
    setTimeout(hideModalToast, 4000)
  }
}

function hideModalToast() {
  const el = document.getElementById('modal-toast')
  el.style.display = 'none'
}

function showLoadError(msg) {
  document.getElementById('admin-loading').innerHTML = `
    <div style="text-align:center;padding:40px;">
      <p style="color:#f87171;font-family:var(--font-ui);font-size:15px;">${esc(msg)}</p>
      <a href="login.html" style="color:var(--chamber-gold);font-family:var(--font-ui);font-size:13px;margin-top:12px;display:inline-block;">← Back to Login</a>
    </div>
  `
}

function setText(id, val) {
  const el = document.getElementById(id)
  if (el) el.textContent = val ?? '—'
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function esc(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}