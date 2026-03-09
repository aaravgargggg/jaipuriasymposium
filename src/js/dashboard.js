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
let currentTeams  = []
let editTeamId    = null

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
  } catch (e) { console.warn('Supabase init failed:', e.message) }
}

document.addEventListener('DOMContentLoaded', async () => {
  await initSupabase()
  if (!supabase) { showError('Database not configured.'); return }

  const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
  if (sessionErr || !session) { window.location.replace('login.html'); return }

  document.getElementById('logout-btn').addEventListener('click', handleLogout)
  document.getElementById('edit-modal-close').addEventListener('click', closeEditModal)
  document.getElementById('edit-modal-cancel').addEventListener('click', closeEditModal)
  document.getElementById('edit-modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeEditModal()
  })
  document.getElementById('edit-modal-save').addEventListener('click', handleSaveEdit)
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeEditModal() })

  await loadDashboard(session.user.id)
})

async function loadDashboard(userId) {
  try {
    const { data: school, error: schoolErr } = await supabase
      .from('schools').select('*').eq('user_id', userId).single()
    if (schoolErr || !school) { showError('Could not find your school registration. Please contact the organiser.'); return }
    currentSchool = school

    const { data: teams } = await supabase
      .from('teams').select('*').eq('school_id', school.id).order('team_number', { ascending: true })
    currentTeams = teams || []

    renderDashboard(school, currentTeams)
    setupRealtime(school.id)
    document.getElementById('dash-loading').style.display = 'none'
    document.getElementById('dash-main').style.display    = 'block'
  } catch (err) { showError(err.message || 'Could not load dashboard.') }
}

function renderDashboard(school, teams) {
  setText('nav-school-name', school.school_name)
  setText('welcome-school-name', school.school_name)
  setText('welcome-city', `${school.city} · ${capitalize(school.location_type)}`)
  renderCodeCard(school)
  setText('info-school', school.school_name)
  setText('info-city',   `${school.city} (${capitalize(school.location_type)})`)
  setText('info-tic',    school.teacher_in_charge_name)
  setText('info-phone',  school.teacher_in_charge_phone)
  setText('info-email',  school.email)
  setText('info-escort', school.escort_teacher_name)
  setText('info-date',   formatDate(school.created_at))
  renderTeams(teams)
}

function renderCodeCard(school) {
  const card = document.getElementById('code-card')
  const pending = document.getElementById('code-pending')
  const confirmed = document.getElementById('code-confirmed')
  const badge = document.getElementById('status-badge')
  const statusTxt = document.getElementById('status-text')
  if (school.code_sent && school.school_code) {
    card.classList.add('confirmed')
    pending.style.display = 'none'; confirmed.style.display = 'block'
    setText('code-display', school.school_code)
    setText('code-sent-at', school.code_sent_at ? `Code sent on ${formatDate(school.code_sent_at)}` : 'Code has been sent.')
    badge.className = 'dash-status-badge confirmed'; statusTxt.textContent = 'Confirmed'
  } else {
    card.classList.remove('confirmed')
    pending.style.display = 'block'; confirmed.style.display = 'none'
    badge.className = 'dash-status-badge pending'; statusTxt.textContent = 'Pending'
  }
}

function renderTeams(teams) {
  const container = document.getElementById('teams-list')
  const countBadge = document.getElementById('team-count-badge')
  countBadge.textContent = `${teams.length} ${teams.length === 1 ? 'team' : 'teams'}`
  if (teams.length === 0) {
    container.innerHTML = `<div class="teams-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="margin:0 auto 12px;display:block;opacity:0.4;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>No teams registered yet.</div>`
    return
  }
  container.innerHTML = teams.map(team => `
    <div class="team-card" id="team-card-${team.id}">
      <div class="team-card-header">
        <span class="team-card-num">Team ${team.team_number}</span>
        <span class="team-card-committee">${COMMITTEE_LABELS[team.committee] || team.committee}</span>
        <button class="team-edit-btn" data-team-id="${team.id}" title="Edit team details">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
      </div>
      <div class="team-participants">
        ${[1, 2, 3].map(p => `
          <div class="participant-item">
            <span class="participant-name">${esc(team[`participant_${p}_name`])}</span>
            <span class="participant-class">Class ${esc(team[`participant_${p}_class`])}</span>
          </div>`).join('')}
      </div>
    </div>`).join('')
  container.querySelectorAll('.team-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.teamId))
  })
}

// ── Edit Modal ──────────────────────────────────────────
function openEditModal(teamId) {
  const team = currentTeams.find(t => t.id === teamId)
  if (!team) return
  editTeamId = teamId
  document.getElementById('edit-modal-team-num').textContent  = `Team ${team.team_number}`
  document.getElementById('edit-modal-committee').textContent = COMMITTEE_LABELS[team.committee] || team.committee

  // Set text inputs immediately
  ;[1, 2, 3].forEach(p => {
    document.getElementById(`edit-p${p}-name`).value = team[`participant_${p}_name`] || ''
  })

  clearEditErrors()
  document.getElementById('edit-save-status').textContent = ''
  document.getElementById('edit-save-status').className   = 'edit-save-status'
  document.getElementById('edit-modal-overlay').classList.add('open')

  // Set select values AFTER modal is open — browser resets selects during CSS transitions
  setTimeout(() => {
    ;[1, 2, 3].forEach(p => {
      const sel = document.getElementById(`edit-p${p}-class`)
      sel.value = team[`participant_${p}_class`] || ''
      // Force it in case the option wasn't matched
      if (sel.value === '' && team[`participant_${p}_class`]) {
        Array.from(sel.options).forEach(opt => {
          if (opt.value === String(team[`participant_${p}_class`])) opt.selected = true
        })
      }
    })
    document.getElementById('edit-p1-name').focus()
  }, 80)
}

function closeEditModal() {
  document.getElementById('edit-modal-overlay').classList.remove('open')
  editTeamId = null
}

function clearEditErrors() {
  document.querySelectorAll('.edit-field-error').forEach(el => el.textContent = '')
  document.querySelectorAll('.edit-input').forEach(el => el.classList.remove('error'))
}

async function handleSaveEdit() {
  clearEditErrors()
  const team = currentTeams.find(t => t.id === editTeamId)
  if (!team) return

  const newValues = {}
  ;[1, 2, 3].forEach(p => {
    newValues[`participant_${p}_name`]  = document.getElementById(`edit-p${p}-name`).value.trim()
    newValues[`participant_${p}_class`] = document.getElementById(`edit-p${p}-class`).value
  })

  let valid = true
  ;[1, 2, 3].forEach(p => {
    if (!newValues[`participant_${p}_name`]) {
      document.getElementById(`edit-p${p}-name-err`).textContent = 'Name is required.'
      document.getElementById(`edit-p${p}-name`).classList.add('error')
      valid = false
    }
    if (!newValues[`participant_${p}_class`]) {
      document.getElementById(`edit-p${p}-class-err`).textContent = 'Class is required.'
      document.getElementById(`edit-p${p}-class`).classList.add('error')
      valid = false
    }
  })
  if (!valid) return

  const changes = {}
  ;[1, 2, 3].forEach(p => {
    const nk = `participant_${p}_name`, ck = `participant_${p}_class`
    if (newValues[nk] !== team[nk]) changes[nk] = { old: team[nk], new: newValues[nk] }
    if (newValues[ck] !== team[ck]) changes[ck] = { old: team[ck], new: newValues[ck] }
  })

  if (!Object.keys(changes).length) { setEditStatus('No changes to save.', 'info'); return }

  setSaveLoading(true)
  setEditStatus('Saving…', 'info')

  try {
    const { data: updatedRows, error: updateErr } = await supabase
      .from('teams')
      .update(newValues)
      .eq('id', editTeamId)
      .eq('school_id', currentSchool.id)   // needed for RLS
      .select()
    if (updateErr) throw new Error(`Supabase update error: ${updateErr.message} (code: ${updateErr.code})`)
    if (!updatedRows || updatedRows.length === 0) throw new Error('Update was blocked — check Supabase RLS policies on the teams table.')
    console.log('Teams updated in Supabase ✓', updatedRows)

    const { data: { session } } = await supabase.auth.getSession()
    const { error: notifErr } = await supabase.from('team_edit_notifications').insert({
      school_id:   currentSchool.id,
      team_id:     editTeamId,
      school_name: currentSchool.school_name,
      school_code: currentSchool.school_code || null,
      team_number: team.team_number,
      committee:   team.committee,
      changes:     changes,
      changed_by:  session?.user?.email || 'unknown',
    })
    if (notifErr) console.warn('Notification insert failed:', notifErr.message)


    const idx = currentTeams.findIndex(t => t.id === editTeamId)
    if (idx !== -1) currentTeams[idx] = { ...currentTeams[idx], ...newValues }

    renderTeams(currentTeams)
    setEditStatus('✓ Changes saved successfully.', 'success')
    setTimeout(closeEditModal, 1200)
  } catch (err) {
    console.error('Save error:', err)
    setEditStatus(`Error: ${err.message}`, 'error')
  } finally {
    setSaveLoading(false)
  }
}


function setupRealtime(schoolId) {
  if (realtimeSub) supabase.removeChannel(realtimeSub)
  realtimeSub = supabase.channel(`school-${schoolId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'schools', filter: `id=eq.${schoolId}` }, (payload) => {
      currentSchool = { ...currentSchool, ...payload.new }
      renderCodeCard(currentSchool)
      if (payload.new.code_sent && payload.new.school_code) showToast(`🎉 Your school code is ready: ${payload.new.school_code}`)
    }).subscribe()
}

async function handleLogout() {
  const btn = document.getElementById('logout-btn')
  btn.disabled = true; btn.textContent = 'Logging out…'
  if (realtimeSub) supabase.removeChannel(realtimeSub)
  await supabase.auth.signOut()
  window.location.replace('login.html')
}

function setSaveLoading(on) {
  const btn = document.getElementById('edit-modal-save')
  const label = document.getElementById('edit-save-label')
  const spinner = document.getElementById('edit-save-spinner')
  btn.disabled = on
  label.textContent = on ? 'Saving…' : 'Save Changes'
  spinner.style.display = on ? 'inline-block' : 'none'
}

function setEditStatus(msg, type) {
  const el = document.getElementById('edit-save-status')
  el.textContent = msg; el.className = `edit-save-status ${type}`
}

function showToast(msg) {
  document.getElementById('dash-toast')?.remove()
  const toast = document.createElement('div')
  toast.id = 'dash-toast'
  toast.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--navy-card);border:1px solid var(--chamber-gold);color:var(--ivory-white);font-family:var(--font-ui);font-size:14px;padding:14px 28px;border-radius:var(--radius-pill);box-shadow:0 8px 40px rgba(0,0,0,0.5);z-index:9000;opacity:0;transition:all 0.35s ease;white-space:nowrap;max-width:90vw;text-align:center;'
  toast.textContent = msg
  document.body.appendChild(toast)
  requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(-50%) translateY(0)' })
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(-50%) translateY(12px)'; setTimeout(() => toast.remove(), 400) }, 5000)
}

function showError(msg) {
  document.getElementById('dash-loading').innerHTML = `<div style="text-align:center;padding:40px 20px;"><p style="color:#f87171;font-family:var(--font-ui);font-size:15px;">${esc(msg)}</p><p style="color:var(--silver-mist);font-size:13px;font-family:var(--font-ui);">Please <a href="login.html" style="color:var(--chamber-gold);">log in again</a>.</p></div>`
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val ?? '—' }
function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : '' }
function formatDate(iso) { return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' }
function esc(str) { return str ? String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '' }