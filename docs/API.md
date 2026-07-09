# Internal API Reference

PulseHR AI has no custom backend server — Firebase (Auth/Firestore/Storage) and the Gemini API are the only external services. What follows is the **internal module contract** every page is written against.

## `src/lib/companyStore.js` — shared, real-time, per-company

```js
// Lifecycle
createCompany({ uid, name, email, companyName })        // HR/Admin sign-up
joinCompanyByCode({ uid, name, email, joinCode, ... })   // Employee sign-up
getMembership(uid)                                       // → { companyId, role } | null
getCompany(companyId)                                     // → company doc (name, joinCode, ...)

// Employees
subscribeEmployees(companyId, cb)
updateEmployeeProfile(companyId, uid, patch)

// Leave
subscribeLeaveRequests(companyId, { employeeId? }, cb)
submitLeaveRequest(companyId, { employeeId, employeeName, type, from, to, reason })
cancelLeaveRequest(companyId, requestId)
decideLeaveRequest(companyId, requestId, 'Approved'|'Rejected', { reviewerName, employeeId, employeeName, type })

// Attendance
subscribeAttendance(companyId, { employeeId?, date? }, cb)
subscribeAttendanceHistory(companyId, employeeId, cb)
checkIn(companyId, employeeId, employeeName)
checkOut(companyId, employeeId)

// Helpdesk
subscribeTickets(companyId, { employeeId? }, cb)
createTicket(companyId, { employeeId, employeeName, title, dept, priority })
updateTicketStatus(companyId, ticketId, status, { employeeId, title })

// Announcements
subscribeAnnouncements(companyId, cb)
postAnnouncement(companyId, { title, body, image, authorName })

// Notifications
subscribeNotifications(companyId, employeeId, cb)
pushNotification(companyId, employeeId, { title, body, kind })
markNotificationRead(companyId, notificationId)

// Payroll
subscribePayslips(companyId, { employeeId? }, cb)
issuePayslip(companyId, { employeeId, employeeName, month, gross, deductions })

// Peer feedback
subscribeFeedback(companyId, { employeeId?, direction: 'given'|'received' }, cb)
submitFeedback(companyId, { fromId, fromName, toId, toName, note })

// Live HR/Admin dashboard stats — computed, never hardcoded
subscribeCompanyStats(companyId, cb) // → { employeeCount, onLeaveToday, pendingApprovals, openTickets, presentToday, departmentBreakdown }
```

Every `subscribe*` function returns an unsubscribe function and works identically whether Firestore or the local cross-tab backend is active — no calling code branches on which one is in use.

## `src/lib/store.js` — personal-only, per-account

```js
db.configure(user)             // call once the signed-in user is known; namespaces storage by uid
                                //   and seeds a brand-new account's profile from their real name/email
db.get()                       // → current state object (sync, always available)
db.update(mutator, source?)    // mutator: (draft) => draft | undefined
db.set(nextState, source?)     // replace the whole state (used by cloudSync on remote snapshots)
db.onChange(fn)                // subscribe to every write; returns an unsubscribe fn
```

## `src/lib/cloudSync.js`
```js
initCloudSync(uid)             // call after sign-in; wires store.js <-> Firestore for this uid
stopCloudSync()                 // call after sign-out
cloudSyncEnabled()             // → boolean, true iff Firebase is configured
uploadDocument(uid, file, { category, onProgress }) // → Promise<DocumentEntry>
```

## `src/lib/aiAssistant.js`
```js
askAssistant(message, context)  // → Promise<string>  (open-ended chat)
generateInsight(kind, data)      // → Promise<string>  (structured insight; see AI.md for `kind` values)
aiConfigured                     // boolean, true iff VITE_GEMINI_API_KEY is set
```

## `src/context/AuthContext.jsx` (`useAuth()`)
```js
const {
  user, loading, role, companyId, firebaseConfigured,
  signUp,        // ({ accountType:'hr'|'employee', name, email, password, remember, companyName?, joinCode?, title?, department? })
  signIn,        // ({ email, password, remember })
  signInGoogle,
  resetPassword, // (email)
  logout,
  markVerified,
} = useAuth()
```

## External APIs actually called

### Firebase Auth / Firestore / Storage
Standard Firebase Web SDK v10 calls — `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `signInWithPopup`, `onSnapshot`, `setDoc`, `addDoc`, `updateDoc`, `uploadBytesResumable`, etc. — all re-exported from `src/firebase.js` so the rest of the app never imports `firebase/*` directly.

### Google Gemini
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=<API_KEY>
Content-Type: application/json

{
  "contents": [{ "role": "user", "parts": [{ "text": "<prompt>" }] }],
  "generationConfig": { "maxOutputTokens": 400, "temperature": 0.6 }
}
```
Response text is read from `candidates[0].content.parts[].text`. See [`AI.md`](./AI.md) for prompt design and fallback behavior.
