// ════════════════════════════════════════════════════════════
// ADMIN.JS — Jaipuria Symposium 2026
// ════════════════════════════════════════════════════════════

const SUPABASE_URL      = 'https://tkvrukemedlxjxrlzvhe.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrdnJ1a2VtZWRseGp4cmx6dmhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTA5MDIsImV4cCI6MjA4ODM2NjkwMn0.OjbL8UM8UsKjcPihNcLBEu-Ka9KLSVGD36Vh7OsZ80s'

let supabase      = null
let allSchools    = []
let allTeams      = {}
let adminRole     = null
let activeFilter  = 'all'
let searchQuery   = ''
let modalSchoolId = null
let realtimeSub   = null

const COMMITTEE_LABELS = {
  ERT: 'Economic Round Table',
  SHC: 'Social & Humanitarian Council',
  TIF: 'Tech & Innovation Forum',
  PCC: 'Political & Cultural Council',
}

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

  if (!supabase) { showLoadError('Database not configured.'); return }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { window.location.replace('login.html'); return }

  const { data: adminRow } = await supabase
    .from('admins').select('name, role, email').eq('user_id', session.user.id).maybeSingle()

  if (!adminRow) { window.location.replace('dashboard.html'); return }

  adminRole = adminRow.role
  setText('admin-nav-user', adminRow.name || adminRow.email)
  setText('admin-nav-role', adminRow.role === 'super_admin' ? 'Super Admin' : 'Manager')

  await loadAll()

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
    const inp = document.getElementById('code-input')
    const pos = inp.selectionStart
    inp.value = inp.value.toUpperCase()
    inp.setSelectionRange(pos, pos)
  })
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal() })

  document.getElementById('admin-loading').style.display = 'none'
  document.getElementById('admin-main').style.display    = 'block'

  setupRealtime()
  await pollUnreadCount()
  setupNotifRealtime()
  setInterval(pollUnreadCount, 30000)
})

// ════════════════════════════════════════
// LOAD ALL DATA
// ════════════════════════════════════════
async function loadAll() {
  try {
    const { data: schools, error: sErr } = await supabase
      .from('schools').select('*').order('created_at', { ascending: false })
    if (sErr) throw sErr
    allSchools = schools || []

    const { data: teams, error: tErr } = await supabase
      .from('teams').select('*').order('team_number', { ascending: true })
    if (tErr) throw tErr

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
  const total        = allSchools.length
  const local        = allSchools.filter(s => s.location_type === 'local').length
  const outstation   = allSchools.filter(s => s.location_type === 'outstation').length
  const confirmed    = allSchools.filter(s => s.status === 'confirmed').length
  const pending      = allSchools.filter(s => s.status === 'pending').length
  const participants = Object.values(allTeams).flat().length * 3

  setText('stat-total',        total)
  setText('stat-local',        local)
  setText('stat-outstation',   outstation)
  setText('stat-confirmed',    confirmed)
  setText('stat-pending',      pending)
  setText('stat-participants', participants)
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
    if (activeFilter === 'local'      && s.location_type !== 'local')      return false
    if (activeFilter === 'outstation' && s.location_type !== 'outstation') return false
    if (activeFilter === 'pending'    && s.status !== 'pending')           return false
    if (activeFilter === 'confirmed'  && s.status !== 'confirmed')         return false
    if (searchQuery) {
      const hay = [s.school_name, s.city, s.school_code||'', s.teacher_in_charge_name, s.email]
        .join(' ').toLowerCase()
      if (!hay.includes(searchQuery)) return false
    }
    return true
  })
}

function renderSchoolsList() {
  const filtered    = getFilteredSchools()
  const locals      = filtered.filter(s => s.location_type === 'local')
  const outstations = filtered.filter(s => s.location_type === 'outstation')
  setText('local-count',      `${locals.length}`)
  setText('outstation-count', `${outstations.length}`)
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
    const teams       = allTeams[school.id] || []
    const participants = teams.length * 3
    const isConfirmed = school.status === 'confirmed'
    return `
      <div class="school-card ${isConfirmed ? 'confirmed' : 'pending'}" data-id="${school.id}" role="button" tabindex="0">
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
              ${participants} participant${participants !== 1 ? 's' : ''}
            </span>
            <span class="school-card-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              ${teams.length} team${teams.length !== 1 ? 's' : ''}
            </span>
          </div>
          ${school.school_code ? `<span class="school-card-code">${esc(school.school_code)}</span>` : ''}
        </div>
      </div>`
  }).join('')

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
  const teams   = allTeams[schoolId] || []

  const tag = document.getElementById('modal-location-tag')
  tag.textContent = school.location_type === 'local' ? '📍 Lucknow (Local)' : '✈️ Outstation'

  setText('modal-school-name', school.school_name)
  setText('modal-city', `${school.city}${school.address_line_2 ? ', ' + school.address_line_2 : ''}`)

  hideModalToast()
  renderModalCodeSection(school)

  const addr = [school.address_line_1, school.address_line_2, school.city].filter(Boolean).join(', ')
  setText('modal-tic-name',     school.teacher_in_charge_name)
  setText('modal-tic-phone',    school.teacher_in_charge_phone)
  setText('modal-tic-email',    school.email)
  setText('modal-escort-name',  school.escort_teacher_name)
  setText('modal-escort-phone', school.escort_teacher_phone)
  setText('modal-address',      addr)
  setText('modal-reg-date',     formatDate(school.created_at))

  renderModalTeams(teams)

  document.getElementById('school-modal').style.display = 'flex'
  document.body.style.overflow = 'hidden'
  setTimeout(() => document.getElementById('code-input')?.focus(), 100)
}

function renderModalCodeSection(school) {
  const sentDiv  = document.getElementById('modal-code-sent')
  const inputDiv = document.getElementById('modal-code-input-row')

  if (school.code_sent && school.school_code) {
    sentDiv.style.display = 'block'
    setText('modal-code-display', school.school_code)
    setText('modal-code-sent-at', school.code_sent_at
      ? `Sent on ${formatDate(school.code_sent_at)}` : 'Code has been sent.')
    document.getElementById('code-input').value = school.school_code
  } else {
    sentDiv.style.display = 'none'
    document.getElementById('code-input').value = ''
  }

  inputDiv.style.display = 'flex'
  clearCodeError()
}

// ════════════════════════════════════════
// RENDER TEAMS — preferences + allot panel
// ════════════════════════════════════════
function renderModalTeams(teams) {
  const countEl      = document.getElementById('modal-teams-count')
  const listEl       = document.getElementById('modal-teams-list')
  const participants = teams.length * 3

  countEl.textContent = `${teams.length} team${teams.length !== 1 ? 's' : ''} · ${participants} participant${participants !== 1 ? 's' : ''}`

  if (teams.length === 0) {
    listEl.innerHTML = `<p style="color:var(--silver-mist);font-size:13px;font-family:var(--font-ui);text-align:center;padding:20px 0;">No teams registered.</p>`
    return
  }

  listEl.innerHTML = teams.map(team => {
    const allotted   = team.committee
    const pref1      = team.preference_1 || '—'
    const pref2      = team.preference_2 || '—'
    const pref3      = team.preference_3 || '—'
    const teamCode   = team.team_code || ''
    const codeSent   = team.team_code_sent

    return `
      <div class="modal-team-card" id="team-card-${team.id}">
        <div class="modal-team-header">
          <span class="modal-team-num">Team ${team.team_number}</span>
          ${allotted
            ? `<span class="modal-team-committee allotted">${esc(COMMITTEE_LABELS[allotted] || allotted)}</span>`
            : `<span class="modal-team-committee pending-allot">Council not allotted yet</span>`}
        </div>

        <!-- Preferences -->
        <div class="modal-team-prefs">
          <span class="modal-team-pref-label">Preferences:</span>
          <span class="modal-team-pref">1st: <strong>${pref1}</strong></span>
          <span class="modal-team-pref">2nd: <strong>${pref2}</strong></span>
          <span class="modal-team-pref">3rd: <strong>${pref3}</strong></span>
        </div>

        <!-- Participants -->
        <div class="modal-participants">
          ${[1, 2, 3].map(p => `
            <div class="modal-participant-row">
              <span class="modal-participant-name">${esc(team[`participant_${p}_name`])}</span>
              <span class="modal-participant-class">Class ${esc(team[`participant_${p}_class`])}</span>
            </div>`).join('')}
        </div>

        <!-- Allot council + team code -->
        <div class="modal-team-allot" id="allot-${team.id}">
          <div class="modal-team-allot-row">
            <div class="select-wrap" style="flex:1;">
              <select class="admin-code-input" id="allot-council-${team.id}" style="width:100%;font-size:13px;">
                <option value="" disabled ${!allotted ? 'selected' : ''}>Allot council…</option>
                <option value="ERT" ${allotted==='ERT'?'selected':''}>ERT — Economic Round Table</option>
                <option value="SHC" ${allotted==='SHC'?'selected':''}>SHC — Social & Humanitarian</option>
                <option value="TIF" ${allotted==='TIF'?'selected':''}>TIF — Tech & Innovation</option>
                <option value="PCC" ${allotted==='PCC'?'selected':''}>PCC — Political & Cultural</option>
              </select>
            </div>
            <div class="admin-input-wrap" style="flex:1;">
              <input
                class="admin-code-input mono"
                type="text"
                id="allot-code-${team.id}"
                placeholder="Team code e.g. JS-T0001"
                value="${esc(teamCode)}"
                maxlength="12"
                autocomplete="off"
                style="width:100%;"
              />
              <button class="code-autofill-btn" title="Auto-generate team code"
                onclick="autofillTeamCode('${team.id}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </button>
            </div>
            <button class="btn btn-primary" style="font-size:12px;padding:8px 16px;white-space:nowrap;"
              onclick="handleAllotTeam('${team.id}')">
              ${codeSent ? 'Update' : 'Allot & Send'}
            </button>
          </div>
          ${codeSent
            ? `<p style="font-size:11px;font-family:var(--font-mono);color:var(--chamber-gold);margin-top:6px;">
                ✓ Code sent${team.team_code_sent_at ? ' · ' + formatDate(team.team_code_sent_at) : ''}
               </p>`
            : ''}
          <div class="form-error" id="err-allot-${team.id}" style="margin-top:4px;"></div>
        </div>
      </div>`
  }).join('')
}

// ════════════════════════════════════════
// ALLOT TEAM COUNCIL + CODE
// ════════════════════════════════════════
async function handleAllotTeam(teamId) {
  const councilEl = document.getElementById(`allot-council-${teamId}`)
  const codeEl    = document.getElementById(`allot-code-${teamId}`)
  const errEl     = document.getElementById(`err-allot-${teamId}`)

  const council  = councilEl?.value
  const teamCode = codeEl?.value.trim().toUpperCase()

  errEl.textContent = ''
  errEl.classList.remove('visible')

  if (!council) {
    errEl.textContent = 'Please select a council.'
    errEl.classList.add('visible')
    return
  }

  if (!teamCode || teamCode.length < 4) {
    errEl.textContent = 'Enter valid team code (min 4 chars).'
    errEl.classList.add('visible')
    return
  }

  const allTeamsList = Object.values(allTeams).flat()
  const existing = allTeamsList.find(t => t.team_code === teamCode && t.id !== teamId)
  if (existing) {
    errEl.textContent = `Code "${teamCode}" already used.`
    errEl.classList.add('visible')
    return
  }

  const btn = document.querySelector(`#allot-${teamId} .btn-primary`)
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…' }

  try {
    const team = allTeamsList.find(t => t.id === teamId)
    const school = allSchools.find(s => s.id === team.school_id)

    // 1️⃣ Update DB via RPC
    const { data, error } = await supabase.rpc('allot_team_council', {
      p_team_id: teamId,
      p_committee: council,
      p_team_code: teamCode,
    })

    if (error) throw error
    if (!data?.success) throw new Error(data?.error || 'Failed')

    // 2️⃣ SEND EMAIL (USING SAME API)
    const res = await fetch(`${SUPABASE_URL}/functions/v1/school-code-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        school_name: school.school_name,
        teacher_in_charge_name: school.teacher_in_charge_name,
        email: school.email,

        // 🔥 NEW DATA
        team_code: teamCode,
        committee: council,
        team_number: team.team_number,

        logoUrl: 'https://www.jaipuriasymposium.org/assets/images/logo.png',
      }),
    })

    const emailRes = await res.json().catch(() => null)
    if (!res.ok) throw new Error(emailRes?.error || 'Email failed')

    // 3️⃣ Update local state
    for (const sid in allTeams) {
      const idx = allTeams[sid].findIndex(t => t.id === teamId)
      if (idx !== -1) {
        allTeams[sid][idx] = {
          ...allTeams[sid][idx],
          committee: council,
          team_code: teamCode,
          team_code_sent: true,
          team_code_sent_at: new Date().toISOString(),
        }
        break
      }
    }

    renderModalTeams(allTeams[modalSchoolId] || [])
    updateStats()
    renderSchoolsList()

    showModalToast(`✓ ${teamCode} sent successfully`, 'success')

  } catch (err) {
    errEl.textContent = err.message
    errEl.classList.add('visible')
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Allot & Send' }
  }
}

function autofillTeamCode(teamId) {
  const allTeamsList = Object.values(allTeams).flat()
  const usedNums = allTeamsList
    .map(t => t.team_code)
    .filter(c => c && /^JS-T\d+$/.test(c))
    .map(c => parseInt(c.replace('JS-T', ''), 10))
    .filter(n => !isNaN(n))

  const next = usedNums.length > 0 ? Math.max(...usedNums) + 1 : 1
  const code = 'JS-T' + String(next).padStart(4, '0')
  const el   = document.getElementById(`allot-code-${teamId}`)
  if (el) { el.value = code; el.focus() }
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
// SEND SCHOOL CODE
// ════════════════════════════════════════
async function handleSendCode() {
  clearCodeError()
  const school = allSchools.find(s => s.id === modalSchoolId)
  if (!school) { showModalToast('School not found.', 'error'); return }

  const codeInput = document.getElementById('code-input')
  const code      = codeInput.value.trim().toUpperCase()

  if (!code)           { showCodeError('Please enter a school code.'); codeInput.focus(); return }
  if (code.length < 4) { showCodeError('Code must be at least 4 characters.'); codeInput.focus(); return }
  if (!/^[A-Z0-9]+$/.test(code)) { showCodeError('Code must contain only letters and numbers.'); codeInput.focus(); return }

  const existing = allSchools.find(s => s.school_code === code && s.id !== modalSchoolId)
  if (existing) { showCodeError(`Code "${code}" is already assigned to ${existing.school_name}.`); return }

  setSendLoading(true)
  hideModalToast()

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/school-code-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({
        school_name:            school.school_name,
        school_code:            code,
        teacher_in_charge_name: school.teacher_in_charge_name,
        email:                  school.email,
        logoUrl:                'https://www.jaipuriasymposium.org/assets/images/logo.png',
      }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.error || data?.message || 'Server error')

    const { error: updateErr } = await supabase.from('schools').update({
      school_code: code, code_sent: true,
      code_sent_at: new Date().toISOString(), status: 'confirmed',
    }).eq('id', modalSchoolId)
    if (updateErr) throw updateErr

    const idx = allSchools.findIndex(s => s.id === modalSchoolId)
    if (idx !== -1) {
      allSchools[idx] = { ...allSchools[idx], school_code: code, code_sent: true,
        code_sent_at: new Date().toISOString(), status: 'confirmed' }
    }

    renderModalCodeSection(allSchools[idx])
    updateStats()
    renderSchoolsList()
    showModalToast(`✓ Code ${code} sent to ${school.school_name}`, 'success')
  } catch (err) {
    console.error('Send code error:', err)
    showModalToast(`Error: ${err.message}`, 'error')
  } finally {
    setSendLoading(false)
  }
}

function autofillCode() {
  const usedNums = allSchools
    .map(s => s.school_code)
    .filter(c => c && /^JS\d+$/.test(c))
    .map(c => parseInt(c.replace('JS', ''), 10))
    .filter(n => !isNaN(n))
  const next  = usedNums.length > 0 ? Math.max(...usedNums) + 1 : 1
  const code  = 'JS' + String(next).padStart(4, '0')
  const input = document.getElementById('code-input')
  input.value = code
  input.focus()
  clearCodeError()
}

// ════════════════════════════════════════
// REALTIME
// ════════════════════════════════════════
function setupRealtime() {
  if (realtimeSub) supabase.removeChannel(realtimeSub)

  realtimeSub = supabase.channel('admin-schools-watch')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schools' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        allSchools.unshift(payload.new)
        updateStats(); renderSchoolsList()
      } else if (payload.eventType === 'UPDATE') {
        const idx = allSchools.findIndex(s => s.id === payload.new.id)
        if (idx !== -1) allSchools[idx] = { ...allSchools[idx], ...payload.new }
        updateStats(); renderSchoolsList()
        if (modalSchoolId === payload.new.id)
          renderModalCodeSection(allSchools.find(s => s.id === modalSchoolId))
      } else if (payload.eventType === 'DELETE') {
        allSchools = allSchools.filter(s => s.id !== payload.old.id)
        updateStats(); renderSchoolsList()
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'teams' }, (payload) => {
      const t = payload.new
      if (!allTeams[t.school_id]) allTeams[t.school_id] = []
      allTeams[t.school_id].push(t)
      updateStats(); renderSchoolsList()
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams' }, async (payload) => {
      const teamId = payload.new.id
      const { data: freshTeam } = await supabase.from('teams').select('*').eq('id', teamId).maybeSingle()
      if (!freshTeam) return
      const sid = freshTeam.school_id
      if (!allTeams[sid]) allTeams[sid] = []
      const idx = allTeams[sid].findIndex(x => x.id === teamId)
      if (idx !== -1) allTeams[sid][idx] = freshTeam
      else allTeams[sid].push(freshTeam)
      if (modalSchoolId === sid) renderModalTeams(allTeams[sid])
      renderSchoolsList()
    })
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
  el.textContent = msg; el.classList.add('visible')
  document.getElementById('code-input').classList.add('error')
}

function clearCodeError() {
  const el = document.getElementById('err-code-input')
  el.textContent = ''; el.classList.remove('visible')
  document.getElementById('code-input').classList.remove('error')
}

function showModalToast(msg, type = 'success') {
  const el = document.getElementById('modal-toast')
  el.textContent = msg
  el.className   = `modal-toast ${type}`
  el.style.display = 'block'
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  if (type === 'success') setTimeout(hideModalToast, 4000)
}

function hideModalToast() {
  document.getElementById('modal-toast').style.display = 'none'
}

function showLoadError(msg) {
  document.getElementById('admin-loading').innerHTML = `
    <div style="text-align:center;padding:40px;">
      <p style="color:#f87171;font-family:var(--font-ui);font-size:15px;">${esc(msg)}</p>
      <a href="login.html" style="color:var(--chamber-gold);font-family:var(--font-ui);font-size:13px;margin-top:12px;display:inline-block;">← Back to Login</a>
    </div>`
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
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ════════════════════════════════════════
// EXPORT TO EXCEL
// ════════════════════════════════════════
document.getElementById('export-excel-btn').addEventListener('click', () => {
  document.getElementById('export-modal').classList.add('open')
})
document.getElementById('export-modal-close').addEventListener('click', () => {
  document.getElementById('export-modal').classList.remove('open')
})
document.getElementById('export-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open')
})

document.querySelectorAll('.export-option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const type    = btn.dataset.export
    const labelEl = btn.querySelector('.export-option-label')
    const orig    = labelEl.textContent
    btn.classList.add('exporting')
    labelEl.textContent = 'Generating...'
    try { runExport(type) }
    catch(e) { console.error('Export error:', e); alert('Export failed.') }
    finally {
      btn.classList.remove('exporting')
      labelEl.textContent = orig
      document.getElementById('export-modal').classList.remove('open')
    }
  })
})

function runExport(type) {
  if (COMMITTEE_LABELS[type]) exportByCouncil(type)
  else                        exportSchools(type)
}

function exportSchools(filter) {
  let schools   = allSchools
  let sheetName = 'All Schools'
  let fileName  = 'JS2026_All_Schools'

  if (filter === 'local') {
    schools = allSchools.filter(s => s.location_type === 'local')
    sheetName = 'Lucknow Schools'; fileName = 'JS2026_Lucknow_Schools'
  } else if (filter === 'outstation') {
    schools = allSchools.filter(s => s.location_type === 'outstation')
    sheetName = 'Outstation Schools'; fileName = 'JS2026_Outstation_Schools'
  }

  if (!schools.length) { alert('No data to export.'); return }

  const SCHOOL_COLS = [
    'S.No','School Name','Teacher-in-Charge','TIC Phone',
    'Escort Teacher','Escort Phone','Email','City',
    'Type','School Code','Status','Registered On',
  ]
  const TEAM_COLS = [
    'Team #','Team Code','Allotted Council',
    'Pref 1','Pref 2','Pref 3',
    'Participant 1','Class',
    'Participant 2','Class ',
    'Participant 3','Class  ',
  ]
  const ALL_COLS = [...SCHOOL_COLS, ...TEAM_COLS]

  const aoa = [ALL_COLS]
  const merges = []
  let sNo = 1, rowIdx = 1

  schools.forEach(school => {
    const teams    = allTeams[school.id] || []
    const teamRows = teams.length > 0 ? teams : [null]
    const startRow = rowIdx

    teamRows.forEach((team, ti) => {
      const schoolPart = ti === 0 ? [
        sNo,
        school.school_name             || '',
        school.teacher_in_charge_name  || '',
        school.teacher_in_charge_phone || '',
        school.escort_teacher_name     || '',
        school.escort_teacher_phone    || '',
        school.email                   || '',
        school.city                    || '',
        school.location_type === 'local' ? 'Lucknow' : 'Outstation',
        school.school_code             || '',
        school.status                  || '',
        school.created_at ? new Date(school.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '',
      ] : new Array(SCHOOL_COLS.length).fill('')

      const teamPart = team ? [
        team.team_number         || (ti + 1),
        team.team_code           || '',
        team.committee           || 'Not allotted',
        team.preference_1        || '',
        team.preference_2        || '',
        team.preference_3        || '',
        team.participant_1_name  || '',
        team.participant_1_class || '',
        team.participant_2_name  || '',
        team.participant_2_class || '',
        team.participant_3_name  || '',
        team.participant_3_class || '',
      ] : new Array(TEAM_COLS.length).fill('')

      aoa.push([...schoolPart, ...teamPart])
      rowIdx++
    })

    if (teamRows.length > 1) {
      for (let c = 0; c < SCHOOL_COLS.length; c++)
        merges.push({ s: { r: startRow, c }, e: { r: rowIdx - 1, c } })
    }
    sNo++
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!merges'] = merges
  ws['!cols']   = autoColWidths(aoa)
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31))
  XLSX.writeFile(wb, fileName + '_' + today() + '.xlsx')
}

function exportByCouncil(council) {
  const COLS = [
    'S.No','School Code','School Name','Allotted Council','Team #','Team Code',
    'Pref 1','Pref 2','Pref 3',
    'Participant 1','Class',
    'Participant 2','Class ',
    'Participant 3','Class  ',
  ]
  const aoa = [COLS]
  let sNo   = 1

  allSchools.forEach(school => {
    const teams = (allTeams[school.id] || []).filter(t => t.committee === council)
    teams.forEach(team => {
      aoa.push([
        sNo++,
        school.school_code       || '',
        school.school_name       || '',
        team.committee           || '',
        team.team_number         || '',
        team.team_code           || '',
        team.preference_1        || '',
        team.preference_2        || '',
        team.preference_3        || '',
        team.participant_1_name  || '',
        team.participant_1_class || '',
        team.participant_2_name  || '',
        team.participant_2_class || '',
        team.participant_3_name  || '',
        team.participant_3_class || '',
      ])
    })
  })

  if (aoa.length <= 1) { alert('No teams allotted to ' + council + ' yet.'); return }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols']   = autoColWidths(aoa)
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, ws, council)
  XLSX.writeFile(wb, 'JS2026_Council_' + council + '_' + today() + '.xlsx')
}

function autoColWidths(aoa) {
  if (!aoa.length) return []
  return Array.from({ length: aoa[0].length }, (_, c) => ({
    wch: Math.min(40, Math.max(8, ...aoa.map(r => String(r[c] == null ? '' : r[c]).length)) + 2)
  }))
}

function today() {
  const d = new Date()
  return String(d.getDate()).padStart(2,'0') + '-' +
         String(d.getMonth()+1).padStart(2,'0') + '-' + d.getFullYear()
}

// ════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════
let allNotifications = []
let notifPanelOpen   = false

document.getElementById('notif-bell-btn').addEventListener('click', () => {
  notifPanelOpen = !notifPanelOpen
  const panel = document.getElementById('notif-panel')
  panel.style.display = notifPanelOpen ? 'flex' : 'none'
  if (notifPanelOpen) loadNotifications().then(() => markAllRead())
})

document.getElementById('notif-panel-close').addEventListener('click', () => {
  notifPanelOpen = false
  document.getElementById('notif-panel').style.display = 'none'
})

document.addEventListener('click', e => {
  if (!notifPanelOpen) return
  const panel = document.getElementById('notif-panel')
  const bell  = document.getElementById('notif-bell-btn')
  if (!panel.contains(e.target) && !bell.contains(e.target)) {
    notifPanelOpen = false
    panel.style.display = 'none'
  }
})

async function loadNotifications() {
  const body = document.getElementById('notif-panel-body')
  body.innerHTML = '<div class="notif-empty" style="color:var(--silver-mist)">Loading…</div>'
  const { data, error } = await supabase
    .from('team_edit_notifications').select('*')
    .order('created_at', { ascending: false }).limit(50)
  if (error) {
    body.innerHTML = `<div class="notif-empty" style="color:#f87171">Failed to load: ${esc(error.message)}</div>`
    return
  }
  allNotifications = data || []
  renderNotifications()
}

function renderNotifications() {
  const body = document.getElementById('notif-panel-body')
  if (!allNotifications.length) {
    body.innerHTML = '<div class="notif-empty">No team edits yet.</div>'
    return
  }
  const fieldLabels = {
    participant_1_name: 'P1 Name', participant_1_class: 'P1 Class',
    participant_2_name: 'P2 Name', participant_2_class: 'P2 Class',
    participant_3_name: 'P3 Name', participant_3_class: 'P3 Class',
  }
  body.innerHTML = allNotifications.map(n => {
    const changes     = n.changes || {}
    const changeRows  = Object.entries(changes).map(([field, { old: o, new: nv }]) => `
      <div class="notif-change-row">
        <span class="notif-change-field">${fieldLabels[field] || field}</span>
        <span class="notif-change-old">${esc(o) || '—'}</span>
        <span class="notif-change-arrow">→</span>
        <span class="notif-change-new">${esc(nv) || '—'}</span>
      </div>`).join('')
    return `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" data-notif-id="${n.id}">
        <div class="notif-item-top">
          <div style="display:flex;align-items:flex-start;gap:8px;">
            ${!n.is_read ? '<div class="notif-unread-dot"></div>' : '<div style="width:7px;flex-shrink:0;"></div>'}
            <span class="notif-item-school">${esc(n.school_name)}</span>
          </div>
          <span class="notif-item-time">${formatTimeAgo(n.created_at)}</span>
        </div>
        <div class="notif-item-meta">
          ${n.school_code ? `<span style="color:var(--chamber-gold);font-family:var(--font-mono);">${esc(n.school_code)}</span> · ` : ''}
          Team ${n.team_number} · ${esc(n.committee)} · by ${esc(n.changed_by)}
        </div>
        <div class="notif-changes">${changeRows}</div>
      </div>`
  }).join('')
}

async function markAllRead() {
  const unreadIds = allNotifications.filter(n => !n.is_read).map(n => n.id)
  if (!unreadIds.length) return
  await supabase.from('team_edit_notifications').update({ is_read: true }).in('id', unreadIds)
  allNotifications.forEach(n => { n.is_read = true })
  setBadge(0)
  if (notifPanelOpen) renderNotifications()
}

async function pollUnreadCount() {
  const { count, error } = await supabase
    .from('team_edit_notifications').select('*', { count: 'exact', head: true }).eq('is_read', false)
  if (error) console.warn('pollUnreadCount error:', error.message)
  else setBadge(count || 0)
}

function setBadge(count) {
  const badge = document.getElementById('notif-badge')
  const bell  = document.getElementById('notif-bell-btn')
  if (count > 0) {
    badge.textContent   = count > 99 ? '99+' : count
    badge.style.display = 'flex'
    bell.classList.add('has-unread')
  } else {
    badge.style.display = 'none'
    bell.classList.remove('has-unread')
  }
}

function setupNotifRealtime() {
  supabase.channel('admin-notif-watch')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_edit_notifications' }, (payload) => {
      allNotifications.unshift(payload.new)
      if (notifPanelOpen) { renderNotifications(); markAllRead() }
      else pollUnreadCount()
    })
    .subscribe((status, err) => { if (err) console.warn('Notif realtime error:', err.message) })
}

function formatTimeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}