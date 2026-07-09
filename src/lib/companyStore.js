// companyStore.js
// -----------------------------------------------------------------------
// The ONE data layer every screen uses to talk to "the company": the shared
// records that both an Employee and their HR/Admin need to see and change
// together — the employee directory, leave requests, attendance, tickets,
// announcements and notifications.
//
// This is deliberately different from the old single-user `store.js` blob:
// that model could never represent "HR approves employee X's leave and
// employee X sees it a second later", because there was only ever one
// profile. Here every record carries a real `companyId` and, where it
// matters, an `employeeId` — so security rules and queries can say exactly
// who is allowed to read or write what.
//
// Two backends, one identical API:
//   1. Firestore  — used automatically once real keys exist in `.env`.
//      Real-time listeners (`onSnapshot`) push changes to every open
//      device/tab within ~1 second, enforced server-side by firestore.rules.
//   2. LocalBackend — used when no Firebase project is configured yet, so
//      `npm run dev` works immediately with zero setup. It is NOT a fake
//      data generator: nothing is seeded. Every record only exists because
//      a real sign-up / leave request / check-in / ticket happened in the
//      UI. It syncs across browser tabs on the same machine within
//      milliseconds via BroadcastChannel, so you can open an Employee tab
//      and an HR tab side by side and watch approvals land live — the same
//      contract Firestore gives you, just without a network.
//
// Every exported function below works the same regardless of which backend
// is active. No page component ever imports Firestore or localStorage
// directly.
// -----------------------------------------------------------------------

import {
  firestore,
  firebaseConfigured,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  arrayRemove,
} from '../firebase'

// ===========================================================================
// Backend #2: Local, zero-config, cross-tab-real, no seeded data
// ===========================================================================

const LS_PREFIX = 'pulsehr_local_'
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pulsehr_sync') : null

function lsKey(collectionName) {
  return `${LS_PREFIX}${collectionName}`
}

function lsRead(collectionName) {
  try {
    return JSON.parse(localStorage.getItem(lsKey(collectionName)) || '[]')
  } catch {
    return []
  }
}

function lsWrite(collectionName, rows) {
  localStorage.setItem(lsKey(collectionName), JSON.stringify(rows))
  channel?.postMessage({ collectionName })
  // Also fire a synthetic event for same-tab listeners (storage events only
  // fire in *other* tabs by spec).
  window.dispatchEvent(new CustomEvent('pulsehr:local-write', { detail: { collectionName } }))
}

function localId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/** Subscribe to a local "collection" (array of row objects), filtered + sorted in JS. */
function lsSubscribe(collectionName, filterFn, sortFn, cb) {
  const emit = () => {
    let rows = lsRead(collectionName)
    if (filterFn) rows = rows.filter(filterFn)
    if (sortFn) rows = [...rows].sort(sortFn)
    cb(rows)
  }
  emit()
  const onMsg = (e) => { if (e.data?.collectionName === collectionName) emit() }
  const onStorage = (e) => { if (e.key === lsKey(collectionName)) emit() }
  const onLocal = (e) => { if (e.detail?.collectionName === collectionName) emit() }
  channel?.addEventListener('message', onMsg)
  window.addEventListener('storage', onStorage)
  window.addEventListener('pulsehr:local-write', onLocal)
  return () => {
    channel?.removeEventListener('message', onMsg)
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('pulsehr:local-write', onLocal)
  }
}

function lsInsert(collectionName, row) {
  const rows = lsRead(collectionName)
  const withId = { id: localId(), createdAt: new Date().toISOString(), ...row }
  rows.push(withId)
  lsWrite(collectionName, rows)
  return withId
}

function lsUpdate(collectionName, id, patch) {
  const rows = lsRead(collectionName)
  const idx = rows.findIndex((r) => r.id === id)
  if (idx === -1) throw new Error(`${collectionName}/${id} not found`)
  rows[idx] = { ...rows[idx], ...patch, updatedAt: new Date().toISOString() }
  lsWrite(collectionName, rows)
  return rows[idx]
}

function lsGetOne(collectionName, filterFn) {
  return lsRead(collectionName).find(filterFn) || null
}

// ===========================================================================
// Company + employee lifecycle (sign-up flows)
// ===========================================================================

function genJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I ambiguity
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

/** HR/Admin sign-up: create a brand-new company and make this user its admin. */
export async function createCompany({ uid, name, email, companyName }) {
  const joinCode = genJoinCode()
  if (firebaseConfigured) {
    const companyRef = doc(collection(firestore, 'companies'))
    await setDoc(companyRef, {
      name: companyName,
      joinCode,
      createdBy: uid,
      createdAt: serverTimestamp(),
    })
    const employeeRef = doc(firestore, 'companies', companyRef.id, 'employees', uid)
    await setDoc(employeeRef, {
      uid, name, email, role: 'admin', title: 'HR / Admin', department: 'People Ops',
      status: 'active', joinedAt: serverTimestamp(),
      avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(email)}`,
    })
    await setDoc(doc(firestore, 'userIndex', uid), { companyId: companyRef.id, role: 'admin' })
    return { companyId: companyRef.id, role: 'admin', joinCode }
  }
  const company = lsInsert('companies', { name: companyName, joinCode, createdBy: uid })
  const employeeRows = lsRead('employees')
  employeeRows.push({
    id: uid, uid, companyId: company.id, name, email, role: 'admin', title: 'HR / Admin',
    department: 'People Ops', status: 'active', createdAt: new Date().toISOString(),
    avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(email)}`,
  })
  lsWrite('employees', employeeRows)
  return { companyId: company.id, role: 'admin', joinCode: company.joinCode }
}

/** Employee sign-up: join an existing company via its 6-character join code. */
export async function joinCompanyByCode({ uid, name, email, joinCode, title, department }) {
  const code = joinCode.trim().toUpperCase()
  if (firebaseConfigured) {
    const q = query(collection(firestore, 'companies'), where('joinCode', '==', code))
    const snap = await getDocs(q)
    if (snap.empty) throw new Error('That company code doesn\'t match any company. Double-check it with your HR team.')
    const companyDoc = snap.docs[0]
    const employeeRef = doc(firestore, 'companies', companyDoc.id, 'employees', uid)
    await setDoc(employeeRef, {
      uid, name, email, role: 'employee', title: title || 'Employee', department: department || 'General',
      status: 'active', joinedAt: serverTimestamp(),
      avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(email)}`,
    })
    await setDoc(doc(firestore, 'userIndex', uid), { companyId: companyDoc.id, role: 'employee' })
    return { companyId: companyDoc.id, role: 'employee' }
  }
  const company = lsGetOne('companies', (c) => c.joinCode === code)
  if (!company) throw new Error('That company code doesn\'t match any company. Double-check it with your HR team.')
  const employee = { id: uid, uid, companyId: company.id, name, email, role: 'employee', title: title || 'Employee', department: department || 'General', status: 'active', avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(email)}` }
  const rows = lsRead('employees')
  rows.push({ ...employee, createdAt: new Date().toISOString() })
  lsWrite('employees', rows)
  return { companyId: company.id, role: 'employee' }
}

/** Fetch a single company doc (used to show HR the join code after sign-up / in Settings). */
export async function getCompany(companyId) {
  if (!companyId) return null
  if (firebaseConfigured) {
    const snap = await getDoc(doc(firestore, 'companies', companyId))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  }
  return lsRead('companies').find((c) => c.id === companyId) || null
}

/** Look up which company + role a signed-in uid belongs to (called on every app load). */
export async function getMembership(uid) {
  if (firebaseConfigured) {
    const snap = await getDoc(doc(firestore, 'userIndex', uid))
    if (!snap.exists()) return null
    return snap.data()
  }
  const emp = lsGetOne('employees', (e) => e.uid === uid)
  return emp ? { companyId: emp.companyId, role: emp.role } : null
}

// ===========================================================================
// Employees directory
// ===========================================================================

export function subscribeEmployees(companyId, cb) {
  if (!companyId) return () => {}
  if (firebaseConfigured) {
    const q = query(collection(firestore, 'companies', companyId, 'employees'), orderBy('name'))
    return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), (err) => console.warn('subscribeEmployees:', err))
  }
  return lsSubscribe('employees', (e) => e.companyId === companyId, (a, b) => (a.name || '').localeCompare(b.name || ''), cb)
}

export async function updateEmployeeProfile(companyId, uid, patch) {
  if (firebaseConfigured) {
    await updateDoc(doc(firestore, 'companies', companyId, 'employees', uid), patch)
    return
  }
  lsUpdate('employees', uid, patch)
}

// ===========================================================================
// Leave requests — the flagship "employee <-> HR, connected in real time" flow
// ===========================================================================

export function subscribeLeaveRequests(companyId, { employeeId } = {}, cb) {
  if (!companyId) return () => {}
  if (firebaseConfigured) {
    const base = collection(firestore, 'companies', companyId, 'leaveRequests')
    const q = employeeId ? query(base, where('employeeId', '==', employeeId)) : query(base)
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      cb(docs)
    }, (err) => console.warn('subscribeLeaveRequests:', err))
  }
  return lsSubscribe(
    'leaveRequests',
    (r) => r.companyId === companyId && (!employeeId || r.employeeId === employeeId),
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    cb
  )
}

export async function submitLeaveRequest(companyId, { employeeId, employeeName, type, from, to, reason }) {
  const payload = { companyId, employeeId, employeeName, type, from, to, reason, status: 'Pending' }
  if (firebaseConfigured) {
    await addDoc(collection(firestore, 'companies', companyId, 'leaveRequests'), { ...payload, createdAt: serverTimestamp() })
    return
  }
  lsInsert('leaveRequests', payload)
}

export async function cancelLeaveRequest(companyId, requestId) {
  if (firebaseConfigured) {
    await updateDoc(doc(firestore, 'companies', companyId, 'leaveRequests', requestId), { status: 'Cancelled' })
    return
  }
  lsUpdate('leaveRequests', requestId, { status: 'Cancelled' })
}

/** HR/Admin action — this is what makes the employee's screen change within seconds. */
export async function decideLeaveRequest(companyId, requestId, decision, { reviewerName, employeeId, employeeName, type } = {}) {
  if (firebaseConfigured) {
    await updateDoc(doc(firestore, 'companies', companyId, 'leaveRequests', requestId), {
      status: decision, reviewedBy: reviewerName, reviewedAt: serverTimestamp(),
    })
  } else {
    lsUpdate('leaveRequests', requestId, { status: decision, reviewedBy: reviewerName })
  }
  await pushNotification(companyId, employeeId, {
    title: decision === 'Approved' ? 'Leave request approved' : 'Leave request rejected',
    body: `Your ${type || 'leave'} request was ${decision.toLowerCase()} by ${reviewerName || 'HR'}.`,
    kind: decision === 'Approved' ? 'success' : 'warning',
  })
}

// ===========================================================================
// Attendance
// ===========================================================================

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function subscribeAttendance(companyId, { employeeId, date } = {}, cb) {
  if (!companyId) return () => {}
  const day = date || todayStr()
  if (firebaseConfigured) {
    const base = collection(firestore, 'companies', companyId, 'attendance')
    const clauses = [where('date', '==', day)]
    if (employeeId) clauses.push(where('employeeId', '==', employeeId))
    const q = query(base, ...clauses)
    return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), (err) => console.warn('subscribeAttendance:', err))
  }
  return lsSubscribe(
    'attendance',
    (r) => r.companyId === companyId && r.date === day && (!employeeId || r.employeeId === employeeId),
    (a, b) => (a.checkIn || '').localeCompare(b.checkIn || ''),
    cb
  )
}

export function subscribeAttendanceHistory(companyId, employeeId, cb) {
  if (!companyId || !employeeId) return () => {}
  if (firebaseConfigured) {
    const q = query(collection(firestore, 'companies', companyId, 'attendance'), where('employeeId', '==', employeeId))
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      cb(docs)
    }, (err) => console.warn('subscribeAttendanceHistory:', err))
  }
  return lsSubscribe(
    'attendance',
    (r) => r.companyId === companyId && r.employeeId === employeeId,
    (a, b) => (b.date || '').localeCompare(a.date || ''),
    cb
  )
}

export async function checkIn(companyId, employeeId, employeeName) {
  const day = todayStr()
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const recordId = `${employeeId}_${day}`
  if (firebaseConfigured) {
    await setDoc(doc(firestore, 'companies', companyId, 'attendance', recordId), {
      companyId, employeeId, employeeName, date: day, checkIn: time, checkOut: null,
      status: time > '09:30 AM' ? 'Late' : 'Present', mode: 'Office',
    })
    return
  }
  const rows = lsRead('attendance')
  const idx = rows.findIndex((r) => r.id === recordId)
  const record = { id: recordId, companyId, employeeId, employeeName, date: day, checkIn: time, checkOut: null, status: 'Present', mode: 'Office', createdAt: new Date().toISOString() }
  if (idx === -1) rows.push(record); else rows[idx] = { ...rows[idx], ...record }
  lsWrite('attendance', rows)
}

export async function checkOut(companyId, employeeId) {
  const day = todayStr()
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const recordId = `${employeeId}_${day}`
  if (firebaseConfigured) {
    await updateDoc(doc(firestore, 'companies', companyId, 'attendance', recordId), { checkOut: time })
    return
  }
  lsUpdate('attendance', recordId, { checkOut: time })
}

// ===========================================================================
// Helpdesk tickets
// ===========================================================================

export function subscribeTickets(companyId, { employeeId } = {}, cb) {
  if (!companyId) return () => {}
  if (firebaseConfigured) {
    const base = collection(firestore, 'companies', companyId, 'tickets')
    const q = employeeId ? query(base, where('employeeId', '==', employeeId)) : query(base)
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      cb(docs)
    }, (err) => console.warn('subscribeTickets:', err))
  }
  return lsSubscribe(
    'tickets',
    (r) => r.companyId === companyId && (!employeeId || r.employeeId === employeeId),
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    cb
  )
}

export async function createTicket(companyId, { employeeId, employeeName, title, dept, priority }) {
  const payload = { companyId, employeeId, employeeName, title, dept: dept || 'IT', priority: priority || 'Medium', status: 'Open' }
  if (firebaseConfigured) {
    await addDoc(collection(firestore, 'companies', companyId, 'tickets'), { ...payload, createdAt: serverTimestamp() })
    return
  }
  lsInsert('tickets', payload)
}

export async function updateTicketStatus(companyId, ticketId, status, { employeeId, title } = {}) {
  if (firebaseConfigured) {
    await updateDoc(doc(firestore, 'companies', companyId, 'tickets', ticketId), { status })
  } else {
    lsUpdate('tickets', ticketId, { status })
  }
  if (employeeId) {
    await pushNotification(companyId, employeeId, {
      title: 'Ticket updated', body: `"${title}" is now ${status}.`, kind: status === 'Closed' ? 'success' : 'info',
    })
  }
}

// ===========================================================================
// Announcements / company feed (HR/Admin posts, everyone reads)
// ===========================================================================

export function subscribeAnnouncements(companyId, cb) {
  if (!companyId) return () => {}
  if (firebaseConfigured) {
    const q = query(collection(firestore, 'companies', companyId, 'announcements'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), (err) => console.warn('subscribeAnnouncements:', err))
  }
  return lsSubscribe('announcements', (r) => r.companyId === companyId, (a, b) => new Date(b.createdAt) - new Date(a.createdAt), cb)
}

export async function postAnnouncement(companyId, { title, body, image, authorName }) {
  const payload = { companyId, title, body, image: image || null, authorName, likes: [], comments: [] }
  if (firebaseConfigured) {
    await addDoc(collection(firestore, 'companies', companyId, 'announcements'), { ...payload, createdAt: serverTimestamp() })
    return
  }
  lsInsert('announcements', payload)
}

export async function toggleLikeAnnouncement(companyId, announcementId, employeeId, isLiked) {
  if (firebaseConfigured) {
    await updateDoc(doc(firestore, 'companies', companyId, 'announcements', announcementId), {
      likes: isLiked ? arrayRemove(employeeId) : arrayUnion(employeeId)
    })
    return
  }
  const ann = lsRead('announcements').find(a => a.id === announcementId)
  if (!ann) return
  const likes = ann.likes || []
  if (isLiked) {
    lsUpdate('announcements', announcementId, { likes: likes.filter(id => id !== employeeId) })
  } else {
    lsUpdate('announcements', announcementId, { likes: [...likes, employeeId] })
  }
}

export async function commentAnnouncement(companyId, announcementId, { employeeId, employeeName, text }) {
  const comment = { id: localId(), employeeId, employeeName, text, createdAt: new Date().toISOString() }
  if (firebaseConfigured) {
    await updateDoc(doc(firestore, 'companies', companyId, 'announcements', announcementId), {
      comments: arrayUnion(comment)
    })
    return
  }
  const ann = lsRead('announcements').find(a => a.id === announcementId)
  if (!ann) return
  const comments = ann.comments || []
  lsUpdate('announcements', announcementId, { comments: [...comments, comment] })
}

// ===========================================================================
// Notifications
// ===========================================================================

export function subscribeNotifications(companyId, employeeId, cb) {
  if (!companyId || !employeeId) return () => {}
  if (firebaseConfigured) {
    const q = query(collection(firestore, 'companies', companyId, 'notifications'), where('employeeId', '==', employeeId))
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      cb(docs)
    }, (err) => console.warn('subscribeNotifications:', err))
  }
  return lsSubscribe(
    'notifications',
    (r) => r.companyId === companyId && r.employeeId === employeeId,
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    cb
  )
}

export async function pushNotification(companyId, employeeId, { title, body, kind = 'info' }) {
  if (!employeeId) return
  const payload = { companyId, employeeId, title, body, kind, read: false }
  if (firebaseConfigured) {
    await addDoc(collection(firestore, 'companies', companyId, 'notifications'), { ...payload, createdAt: serverTimestamp() })
    return
  }
  lsInsert('notifications', payload)
}

export async function markNotificationRead(companyId, notificationId) {
  if (firebaseConfigured) {
    await updateDoc(doc(firestore, 'companies', companyId, 'notifications', notificationId), { read: true })
    return
  }
  lsUpdate('notifications', notificationId, { read: true })
}

// ===========================================================================
// Peer feedback — real, connected: A writes feedback for B, B sees it live
// ===========================================================================

export function subscribeFeedback(companyId, { employeeId, direction = 'received' } = {}, cb) {
  if (!companyId) return () => {}
  const field = direction === 'given' ? 'fromId' : 'toId'
  if (firebaseConfigured) {
    const base = collection(firestore, 'companies', companyId, 'feedback')
    const q = employeeId ? query(base, where(field, '==', employeeId)) : query(base)
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      cb(docs)
    }, (err) => console.warn('subscribeFeedback:', err))
  }
  return lsSubscribe(
    'feedback',
    (r) => r.companyId === companyId && (!employeeId || r[field] === employeeId),
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    cb
  )
}

export async function submitFeedback(companyId, { fromId, fromName, toId, toName, note }) {
  const payload = { companyId, fromId, fromName, toId, toName, note }
  if (firebaseConfigured) {
    await addDoc(collection(firestore, 'companies', companyId, 'feedback'), { ...payload, createdAt: serverTimestamp() })
  } else {
    lsInsert('feedback', payload)
  }
  await pushNotification(companyId, toId, { title: 'New feedback received', body: `${fromName} left you a note.`, kind: 'info' })
}

// ===========================================================================
// Payroll — HR issues a real payslip; the employee sees it live
// ===========================================================================

export function subscribePayslips(companyId, { employeeId } = {}, cb) {
  if (!companyId) return () => {}
  if (firebaseConfigured) {
    const base = collection(firestore, 'companies', companyId, 'payslips')
    const q = employeeId ? query(base, where('employeeId', '==', employeeId)) : query(base)
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      cb(docs)
    }, (err) => console.warn('subscribePayslips:', err))
  }
  return lsSubscribe(
    'payslips',
    (r) => r.companyId === companyId && (!employeeId || r.employeeId === employeeId),
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    cb
  )
}

export async function issuePayslip(companyId, { employeeId, employeeName, month, gross, deductions }) {
  const net = Math.max(gross - deductions, 0)
  const payload = { companyId, employeeId, employeeName, month, gross, deductions, net }
  if (firebaseConfigured) {
    await addDoc(collection(firestore, 'companies', companyId, 'payslips'), { ...payload, createdAt: serverTimestamp() })
  } else {
    lsInsert('payslips', payload)
  }
  await pushNotification(companyId, employeeId, { title: 'New payslip generated', body: `Your payslip for ${month} is ready.`, kind: 'success' })
}

// ===========================================================================
// Live company-wide stats for HR/Admin dashboards — computed from real
// subscriptions, never hardcoded.
// ===========================================================================

export function subscribeCompanyStats(companyId, cb) {
  if (!companyId) return () => {}
  let employees = [], leave = [], tickets = [], attendanceToday = []
  const emit = () => cb({
    employeeCount: employees.length,
    onLeaveToday: leave.filter((r) => r.status === 'Approved' && r.from <= todayStr() && r.to >= todayStr()).length,
    pendingApprovals: leave.filter((r) => r.status === 'Pending').length,
    openTickets: tickets.filter((t) => t.status !== 'Closed').length,
    presentToday: attendanceToday.length,
    departmentBreakdown: Object.entries(
      employees.reduce((acc, e) => { acc[e.department || 'General'] = (acc[e.department || 'General'] || 0) + 1; return acc }, {})
    ).map(([dept, v]) => ({ dept, v })),
  })
  const u1 = subscribeEmployees(companyId, (rows) => { employees = rows; emit() })
  const u2 = subscribeLeaveRequests(companyId, {}, (rows) => { leave = rows; emit() })
  const u3 = subscribeTickets(companyId, {}, (rows) => { tickets = rows; emit() })
  const u4 = subscribeAttendance(companyId, {}, (rows) => { attendanceToday = rows; emit() })
  return () => { u1(); u2(); u3(); u4() }
}
