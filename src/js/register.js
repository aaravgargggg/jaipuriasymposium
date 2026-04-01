// ════════════════════════════════════════════════════════════
// REGISTER.JS — Jaipuria Symposium 2026
// ════════════════════════════════════════════════════════════

const SUPABASE_URL      = 'https://tkvrukemedlxjxrlzvhe.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrdnJ1a2VtZWRseGp4cmx6dmhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTA5MDIsImV4cCI6MjA4ODM2NjkwMn0.OjbL8UM8UsKjcPihNcLBEu-Ka9KLSVGD36Vh7OsZ80s'

let supabase = null
async function initSupabase() {
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  } catch (e) {
    console.warn('Supabase not available:', e.message)
  }
}

const COMMITTEES = [
  { value: 'ERT', label: 'Economic Round Table' },
  { value: 'SHC', label: 'Social & Humanitarian Council' },
  { value: 'TIF', label: 'Tech & Innovation Forum' },
  { value: 'PCC', label: 'Political & Cultural Council' },
]
const CLASSES = ['9', '10', '11', '12']

let teamIdCounter = 0

// ════════════════════════════════════════
// BOOT
// ════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await initSupabase()

  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { window.location.replace('dashboard.html'); return }
    } catch (_) {}
  }

  addTeamBlock()

  document.getElementById('add-team-btn').addEventListener('click', () => {
    addTeamBlock()
    clearErr('err-teams')
  })

  document.getElementById('reg-form').addEventListener('submit', handleSubmit)
  document.getElementById('city').addEventListener('input', onCityInput)
})

// ════════════════════════════════════════
// CITY TAG
// ════════════════════════════════════════
function onCityInput(e) {
  const city = e.target.value.trim()
  const tag  = document.getElementById('city-tag')
  if (city.length < 2) { tag.style.display = 'none'; return }
  const local       = city.toLowerCase() === 'lucknow'
  tag.style.display = 'inline-flex'
  tag.className     = `form-hint ${local ? 'local' : 'outstation'}`
  tag.textContent   = local ? '📍 Local — Lucknow' : '✈️ Outstation'
}

// ════════════════════════════════════════
// TEAM BLOCKS
// ════════════════════════════════════════
function addTeamBlock() {
  const currentCount = document.querySelectorAll('.team-block').length
  if (currentCount >= 2) return   // max 2 teams
  teamIdCounter++
  const id      = teamIdCounter
  const isFirst = currentCount === 0

  const container = document.getElementById('teams-container')
  const block     = document.createElement('div')
  block.className = 'team-block'
  block.id        = `team-block-${id}`
  block.innerHTML = buildTeamHTML(id, isFirst)
  container.appendChild(block)

  block.style.opacity   = '0'
  block.style.transform = 'translateY(14px)'
  requestAnimationFrame(() => {
    block.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
    block.style.opacity    = '1'
    block.style.transform  = 'translateY(0)'
  })

  const removeBtn = block.querySelector('.btn-remove-team')
  if (removeBtn) removeBtn.addEventListener('click', () => removeTeamBlock(id))

  refreshTeamNumbers()
  updateAddTeamBtn()
}

function removeTeamBlock(id) {
  const block = document.getElementById(`team-block-${id}`)
  if (!block) return
  block.style.transition = 'opacity 0.22s ease, transform 0.22s ease'
  block.style.opacity    = '0'
  block.style.transform  = 'translateY(-8px)'
  setTimeout(() => { block.remove(); refreshTeamNumbers(); updateAddTeamBtn() }, 230)
}

function refreshTeamNumbers() {
  let n = 1
  document.querySelectorAll('.team-block').forEach(b => {
    const t = b.querySelector('.team-block-title')
    if (t) t.textContent = `Team ${n++}`
  })
}

function updateAddTeamBtn() {
  const btn   = document.getElementById('add-team-btn')
  const count = document.querySelectorAll('.team-block').length
  if (!btn) return
  btn.style.display = count >= 2 ? 'none' : 'flex'
}

function buildTeamHTML(id, isFirst) {
  const committeeOpts = COMMITTEES.map(c =>
    `<option value="${c.value}">${c.label}</option>`
  ).join('')

  const classOpts = CLASSES.map(c =>
    `<option value="${c}">Class ${c}</option>`
  ).join('')

  const participantRows = [1, 2, 3].map(p => `
    <div class="participant-row">
      <div class="participant-row-label">Participant ${p}</div>
      <div class="participant-fields">
        <div class="form-group">
          <label class="form-label" for="p${p}-name-${id}">Full Name <span class="req">*</span></label>
          <input class="form-input" type="text" id="p${p}-name-${id}" placeholder="Full name" autocomplete="off" />
          <span class="form-error" id="err-p${p}-name-${id}"></span>
        </div>
        <div class="form-group class-group">
          <label class="form-label" for="p${p}-class-${id}">Class <span class="req">*</span></label>
          <div class="select-wrap">
            <select class="form-select" id="p${p}-class-${id}">
              <option value="" disabled selected>—</option>
              ${classOpts}
            </select>
          </div>
          <span class="form-error" id="err-p${p}-class-${id}"></span>
        </div>
      </div>
    </div>
  `).join('')

  const removeBtn = isFirst ? '' : `
    <button type="button" class="btn-remove-team">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      Remove
    </button>`

  return `
    <div class="team-block-header">
      <span class="team-block-title">Team 1</span>
      ${removeBtn}
    </div>
    <div class="team-block-fields">
      <div class="form-group">
        <div class="form-step-sub" style="margin-bottom:12px;font-size:12px;color:var(--silver-mist);">
          Select 3 council preferences in order. We'll allot one based on availability.
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div>
            <label class="form-label" for="pref1-${id}">1st Preference <span class="req">*</span></label>
            <div class="select-wrap">
              <select class="form-select" id="pref1-${id}">
                <option value="" disabled selected>Select council</option>
                ${committeeOpts}
              </select>
            </div>
            <span class="form-error" id="err-pref1-${id}"></span>
          </div>
          <div>
            <label class="form-label" for="pref2-${id}">2nd Preference <span class="req">*</span></label>
            <div class="select-wrap">
              <select class="form-select" id="pref2-${id}">
                <option value="" disabled selected>Select council</option>
                ${committeeOpts}
              </select>
            </div>
            <span class="form-error" id="err-pref2-${id}"></span>
          </div>
          <div>
            <label class="form-label" for="pref3-${id}">3rd Preference <span class="req">*</span></label>
            <div class="select-wrap">
              <select class="form-select" id="pref3-${id}">
                <option value="" disabled selected>Select council</option>
                ${committeeOpts}
              </select>
            </div>
            <span class="form-error" id="err-pref3-${id}"></span>
          </div>
        </div>
      </div>
      <div class="participants-list">
        ${participantRows}
      </div>
    </div>
  `
}

// ════════════════════════════════════════
// PASSWORD GENERATOR
// ════════════════════════════════════════
function generatePassword() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const D = '23456789'
  let p = 'JS'
  for (let i = 0; i < 4; i++) p += L[Math.floor(Math.random() * L.length)]
  for (let i = 0; i < 4; i++) p += D[Math.floor(Math.random() * D.length)]
  return p
}

// ════════════════════════════════════════
// ERROR HELPERS
// ════════════════════════════════════════
function setErr(errId, msg) {
  const el = document.getElementById(errId)
  if (!el) return
  el.textContent = msg
  el.classList.add('visible')
  const inp = document.getElementById(errId.replace(/^err-/, ''))
  if (inp) { inp.classList.add('error'); inp.classList.remove('valid') }
}

function clearErr(errId) {
  const el = document.getElementById(errId)
  if (!el) return
  el.textContent = ''
  el.classList.remove('visible')
  const inp = document.getElementById(errId.replace(/^err-/, ''))
  if (inp) inp.classList.remove('error')
}

function clearAllErrors() {
  document.querySelectorAll('.form-error').forEach(el => {
    el.textContent = ''
    el.classList.remove('visible')
  })
  document.querySelectorAll('.form-input, .form-select').forEach(el => {
    el.classList.remove('error', 'valid')
  })
}

// ════════════════════════════════════════
// VALIDATION
// ════════════════════════════════════════
function validateForm() {
  clearAllErrors()
  let valid        = true
  let firstErrorEl = null

  function markError(errId, msg) {
    setErr(errId, msg)
    if (!firstErrorEl) firstErrorEl = document.getElementById(errId)
    valid = false
  }

  function checkText(inputId, errId, label) {
    const el = document.getElementById(inputId)
    if (!el || !el.value.trim()) markError(errId, `${label} is required.`)
    else el.classList.add('valid')
  }

  function checkEmail(inputId, errId) {
    const el  = document.getElementById(inputId)
    const val = el ? el.value.trim() : ''
    if (!val) markError(errId, 'Email address is required.')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) markError(errId, 'Please enter a valid email address.')
    else el.classList.add('valid')
  }

  function checkPhone(inputId, errId) {
    const el     = document.getElementById(inputId)
    const raw    = el ? el.value.trim() : ''
    const digits = raw.replace(/[\s\-\+]/g, '').replace(/^91/, '')
    if (!raw) markError(errId, 'Contact number is required.')
    else if (!/^\d+$/.test(digits)) markError(errId, 'Please enter digits only.')
    else if (digits.length !== 10) markError(errId, `Must be exactly 10 digits (you entered ${digits.length}).`)
    else el.classList.add('valid')
  }

  checkText('school-name', 'err-school-name', 'School name')
  checkText('addr-1',      'err-addr-1',      'Address Line 1')
  checkText('city',        'err-city',        'City')
  checkText('tic-name',    'err-tic-name',    'Teacher name')
  checkEmail('tic-email',  'err-tic-email')
  checkPhone('tic-phone',  'err-tic-phone')
  checkText('et-name',     'err-et-name',     'Escort teacher name')
  checkPhone('et-phone',   'err-et-phone')

  const teamBlocks = document.querySelectorAll('.team-block')
  if (teamBlocks.length === 0) markError('err-teams', 'Please add at least one team.')

  teamBlocks.forEach(block => {
    const id  = block.id.replace('team-block-', '')

    // Validate 3 preferences — must be selected and all different
    const p1El = document.getElementById(`pref1-${id}`)
    const p2El = document.getElementById(`pref2-${id}`)
    const p3El = document.getElementById(`pref3-${id}`)
    const p1v  = p1El?.value, p2v = p2El?.value, p3v = p3El?.value

    if (!p1v) markError(`err-pref1-${id}`, 'Please select your 1st preference.')
    else p1El.classList.add('valid')
    if (!p2v) markError(`err-pref2-${id}`, 'Please select your 2nd preference.')
    else if (p2v === p1v) markError(`err-pref2-${id}`, 'Must be different from 1st preference.')
    else p2El.classList.add('valid')
    if (!p3v) markError(`err-pref3-${id}`, 'Please select your 3rd preference.')
    else if (p3v === p1v || p3v === p2v) markError(`err-pref3-${id}`, 'Must be different from other preferences.')
    else p3El.classList.add('valid')

    ;[1, 2, 3].forEach(p => {
      const nEl = document.getElementById(`p${p}-name-${id}`)
      const kEl = document.getElementById(`p${p}-class-${id}`)
      if (!nEl || !nEl.value.trim()) markError(`err-p${p}-name-${id}`, 'Name is required.')
      else nEl.classList.add('valid')
      if (!kEl || !kEl.value) markError(`err-p${p}-class-${id}`, 'Class is required.')
      else kEl.classList.add('valid')
    })
  })

  if (firstErrorEl) {
    setTimeout(() => firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }

  return valid
}

// ════════════════════════════════════════
// SUBMIT
// ════════════════════════════════════════
async function handleSubmit(e) {
  e.preventDefault()
  if (!validateForm()) return

  setLoading(true)
  hideAlerts()

  const email    = document.getElementById('tic-email').value.trim().toLowerCase()
  const password = generatePassword()

  try {
    if (!supabase) throw new Error('Database connection not configured. Please contact the organiser.')

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'school' } }
    })

    if (authError) {
      if (authError.message.toLowerCase().includes('already registered')) {
        throw new Error('This email is already registered. Please log in instead.')
      }
      throw new Error(`Account creation failed: ${authError.message}`)
    }

    const userId = authData?.user?.id
    if (!userId) throw new Error('Could not create account. Please try again.')

    // 2. Sign in so RLS auth.uid() is active
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signInErr) throw new Error(`Session error: ${signInErr.message}`)

    // 3. Insert school record
    const { data: schoolData, error: schoolErr } = await supabase
      .from('schools')
      .insert({
        user_id:                 userId,
        school_name:             document.getElementById('school-name').value.trim(),
        address_line_1:          document.getElementById('addr-1').value.trim(),
        address_line_2:          document.getElementById('addr-2').value.trim() || null,
        city:                    document.getElementById('city').value.trim(),
        teacher_in_charge_name:  document.getElementById('tic-name').value.trim(),
        teacher_in_charge_phone: document.getElementById('tic-phone').value.trim(),
        escort_teacher_name:     document.getElementById('et-name').value.trim(),
        escort_teacher_phone:    document.getElementById('et-phone').value.trim(),
        email,
        status:    'pending',
        code_sent: false,
      })
      .select('id')
      .single()

    if (schoolErr) throw new Error(`Could not save school details: ${schoolErr.message}`)

    const schoolId = schoolData.id

    // 4. Insert teams
    const teamBlocks    = document.querySelectorAll('.team-block')
    const teamsToInsert = []

    teamBlocks.forEach((block, index) => {
      const id = block.id.replace('team-block-', '')
      teamsToInsert.push({
        school_id:           schoolId,
        preference_1:        document.getElementById(`pref1-${id}`).value,
        preference_2:        document.getElementById(`pref2-${id}`).value,
        preference_3:        document.getElementById(`pref3-${id}`).value,
        committee:           null,   // allotted by admin later
        team_number:         index + 1,
        participant_1_name:  document.getElementById(`p1-name-${id}`).value.trim(),
        participant_1_class: document.getElementById(`p1-class-${id}`).value,
        participant_2_name:  document.getElementById(`p2-name-${id}`).value.trim(),
        participant_2_class: document.getElementById(`p2-class-${id}`).value,
        participant_3_name:  document.getElementById(`p3-name-${id}`).value.trim(),
        participant_3_class: document.getElementById(`p3-class-${id}`).value,
      })
    })

    const { error: teamsErr } = await supabase.from('teams').insert(teamsToInsert)
    if (teamsErr) throw new Error(`Could not save team details: ${teamsErr.message}`)

    // 5. Send welcome email via register-msg edge function (non-fatal)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(`${SUPABASE_URL}/functions/v1/bright-endpoint`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session?.access_token ?? SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email,
          password,
          schoolName: document.getElementById('school-name').value.trim(),
          ticName:    document.getElementById('tic-name').value.trim(),
          teamCount:  teamBlocks.length,
          loginUrl:   `${window.location.origin}/login.html`,
        }),
      })

      if (!res.ok) console.warn('Welcome email response:', await res.text())

    } catch (emailErr) {
      console.warn('Welcome email failed (non-fatal):', emailErr.message)
    }

    // 6. Success
    showSuccess()
    setTimeout(() => window.location.replace('dashboard.html'), 2500)

  } catch (err) {
    console.error('[registration] Error:', err.message, err)
    showErrorBanner(err.message || 'Something went wrong. Please try again.')
    setLoading(false)
  }
}

// ════════════════════════════════════════
// UI HELPERS
// ════════════════════════════════════════
function setLoading(on) {
  const btn     = document.getElementById('submit-btn')
  const label   = document.getElementById('submit-label')
  const arrow   = document.getElementById('submit-arrow')
  const spinner = document.getElementById('submit-spinner')
  btn.disabled          = on
  label.textContent     = on ? 'Registering…' : 'Complete Registration'
  arrow.style.display   = on ? 'none' : 'inline'
  spinner.style.display = on ? 'inline-block' : 'none'
}

function hideAlerts() {
  document.getElementById('reg-error').style.display   = 'none'
  document.getElementById('reg-success').style.display = 'none'
}

function showErrorBanner(msg) {
  const el = document.getElementById('reg-error')
  document.getElementById('reg-error-msg').textContent = msg
  el.style.display = 'flex'
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function showSuccess() {
  setLoading(false)
  hideAlerts()
  const el = document.getElementById('reg-success')
  el.style.display = 'flex'
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}