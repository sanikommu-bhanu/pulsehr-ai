// store.js
// -----------------------------------------------------------------------
// Personal-only data that belongs to ONE user and nobody else needs to see
// live (profile edits, uploaded documents, app settings, and the
// onboarding/training checklist and performance-review placeholders that
// don't yet have a real backing system in this app — see the honesty note
// in each page and in docs/ARCHITECTURE.md).
//
// Anything that HR and an employee both need to see and act on together
// (leave, attendance, tickets, announcements, notifications, payroll) lives
// in companyStore.js instead, backed by Firestore/local cross-tab sync.
//
// This store is namespaced PER SIGNED-IN ACCOUNT (`pulsehr_db_v1_<uid>`) and
// seeded from that account's real name/email the first time it loads — never
// a hardcoded person. Numeric fields that would otherwise need a real payroll
// or performance-review system start at honest zero/empty values.
// -----------------------------------------------------------------------

let currentUid = null

function key() {
  return `pulsehr_db_v1_${currentUid || 'anon'}`
}

function blankSeed({ name = '', email = '', avatar = '' } = {}) {
  return {
    profile: {
      name, email, avatar,
      title: 'Employee',
      department: 'General',
      phone: '',
      joined: new Date().toISOString().slice(0, 10),
      manager: '',
      emergencyContact: { name: '', relation: '', phone: '' },
      skills: [],
    },
    tasks: [
      { id: 'T-1', title: 'Complete Profile', due: '', status: 'Pending', category: 'Onboarding' },
      { id: 'T-2', title: 'Upload Documents', due: '', status: 'Pending', category: 'Onboarding' },
    ],
    onboarding: {
      checklist: [
        { id: 'o1', label: 'Personal Information', done: false },
        { id: 'o2', label: 'Document Upload', done: false },
        { id: 'o3', label: 'Company Policies', done: false },
        { id: 'o4', label: 'IT Setup', done: false },
        { id: 'o5', label: 'Team Introduction', done: false },
      ],
      mentor: '',
    },
    training: [
      { id: 'tr1', title: 'Company Overview', duration: '15 min', status: 'Pending' },
      { id: 'tr2', title: 'HR Policies', duration: '8 min', status: 'Pending' },
      { id: 'tr3', title: 'Code of Conduct', duration: '10 min', status: 'Pending' },
    ],
    performance: {
      // No real review cycle exists yet in this build — starts empty rather
      // than showing an invented rating. See docs/ARCHITECTURE.md "Known
      // scope boundaries".
      rating: null,
      goalsProgress: { done: 0, total: 0 },
      kpis: [],
      history: [],
      feedbackGiven: [],
      feedbackReceived: [],
    },
    payslips: [], // populated for real once HR issues one — see companyStore payroll functions
    documents: [],
    settings: { darkMode: false, notifPrefs: { email: true, push: true, sms: false }, language: 'English' },
  }
}

function read() {
  const fresh = blankSeed()
  try {
    const raw = localStorage.getItem(key())
    if (raw) {
      const parsed = JSON.parse(raw)
      // Deep merge top-level objects to prevent crashes from missing schema keys
      return {
        ...fresh,
        ...parsed,
        profile: { ...fresh.profile, ...(parsed.profile || {}) },
        onboarding: { ...fresh.onboarding, ...(parsed.onboarding || {}) },
        performance: { ...fresh.performance, ...(parsed.performance || {}) },
        settings: { ...fresh.settings, ...(parsed.settings || {}) },
        // Arrays like tasks, training, payslips, documents just overwrite if present
        tasks: parsed.tasks || fresh.tasks,
        training: parsed.training || fresh.training,
        payslips: parsed.payslips || fresh.payslips,
        documents: parsed.documents || fresh.documents,
      }
    }
  } catch { /* fall through to fresh seed */ }
  localStorage.setItem(key(), JSON.stringify(fresh))
  return fresh
}

function write(data) {
  localStorage.setItem(key(), JSON.stringify(data))
}

const listeners = new Set()

export const db = {
  /** Call once per session as soon as the signed-in user is known, so the
   * store reads/writes the right person's data and (only on their very
   * first login) seeds their profile from their real name/email. */
  configure(user) {
    currentUid = user?.uid || null
    if (!currentUid) return
    const existingRaw = localStorage.getItem(key())
    if (!existingRaw) {
      write(blankSeed({ name: user.displayName || '', email: user.email || '', avatar: user.photoURL || '' }))
    }
  },
  get: () => read(),
  update: (mutator, source = 'local') => {
    const current = read()
    const next = mutator(current) || current
    write(next)
    listeners.forEach((fn) => fn(next, source))
    return next
  },
  set: (next, source = 'local') => {
    write(next)
    listeners.forEach((fn) => fn(next, source))
    return next
  },
  onChange: (fn) => {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
