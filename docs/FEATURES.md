# Features — module by module

Status legend: **Real & connected** (both roles see it live, backed by Firestore/local cross-tab sync) · **Real, personal** (real CRUD, but scoped to one account, not shared) · **Placeholder** (UI exists, clearly labeled, no backend claim made).

## Auth & onboarding

| Feature | Status | Notes |
|---|---|---|
| Role selection (Employee vs HR/Admin) | Real & connected | Determines which sign-up form and which app you land in |
| HR/Admin sign-up → creates company + join code | Real & connected | Company + admin employee doc created atomically |
| Employee sign-up via join code | Real & connected | Rejects invalid codes with a real error, not a silent pass |
| Email/password auth, Google sign-in, email verification, forgot password | Real (live mode) | Falls back to a real local account system (own uid, hashed-in-memory comparison, no shared demo login) in local mode; Google sign-in and email delivery require live mode |
| Session persistence ("remember me") | Real | Firebase persistence API in live mode; localStorage session in local mode |

## Employee directory ("My Team" / HR "Employees")

| Feature | Status | Notes |
|---|---|---|
| Live company roster, search by name/title/department | Real & connected | One `subscribeEmployees` listener shared by both the employee-facing and HR-facing screens |
| HR badge on admin accounts | Real & connected | Derived from the real `role` field, not styling only |

## Leave

| Feature | Status | Notes |
|---|---|---|
| Apply leave, cancel own pending request | Real & connected | Writes `companies/{id}/leaveRequests` |
| HR approve/reject | Real & connected | Only an admin's write can change status per `firestore.rules`; triggers a real-time notification to the employee |
| Leave balance | Real, computed | Derived from actual approved requests this year against a configurable annual allowance — not a static number |
| Team calendar | Real & connected | Marks days with at least one approved leave, computed from live data |

## Attendance

| Feature | Status | Notes |
|---|---|---|
| Check in / check out | Real & connected | One record per employee per day; late/on-time computed from real check-in time |
| Attendance history, monthly summary | Real, computed | Built from the employee's own real records |
| QR check-in, face recognition | Placeholder | Explicitly disabled with a "Coming soon" badge — needs a camera/ML pipeline this build doesn't include |

## Helpdesk

| Feature | Status | Notes |
|---|---|---|
| Raise a ticket, HR advances its status | Real & connected | Tapping a ticket in the HR dashboard advances Open → In Progress → Closed and notifies the employee |
| Pre-ticket AI chat triage | Real (Gemini) / deterministic fallback | Same `aiAssistant.js` as the main Assistant |

## Company Feed / Announcements

| Feature | Status | Notes |
|---|---|---|
| HR posts an announcement, everyone sees it live | Real & connected | Employees cannot post — enforced in `firestore.rules`, not just hidden in the UI |

## Notifications

| Feature | Status | Notes |
|---|---|---|
| Real-time notification feed | Real & connected | Populated only by real events: leave decisions, ticket updates, new payslips, new feedback |
| Mark read / mark all read | Real & connected | Writes back to the same record HR/other employees' actions created |

## Payroll

| Feature | Status | Notes |
|---|---| ---|
| HR issues a payslip (gross, deductions → net) | Real & connected | Employee's Payslip screen updates instantly; empty state shown honestly until HR issues one |
| Actual payroll processing (tax, statutory deductions, disbursement) | Out of scope | Needs a licensed payroll/tax provider integration, not a UI — see README |

## Performance

| Feature | Status | Notes |
|---|---|---|
| Peer feedback (give/receive notes) | Real & connected | Replaces a fabricated star-rating system; both sides see the same real record |
| Formal review cycles, manager ratings, KPI tracking | Out of scope (labeled) | The Overview screen says so directly rather than showing an invented rating |

## AI (Gemini-backed)

| Feature | Status | Notes |
|---|---|---|
| AI Assistant chat | Real (Gemini) / grounded local fallback | Local fallback never states a specific personal number (leave days, payslip amount) it can't actually see — it points to the real live screen instead |
| Burnout risk indicator, weekly HR report | Real (Gemini) / grounded local fallback | Built from live employee/leave/attendance/ticket counts, not a fixed dataset |
| Helpdesk pre-chat triage | Same engine as Assistant | |

## Onboarding / Training / Documents / Settings (personal, per-account)

| Feature | Status | Notes |
|---|---|---|
| Onboarding checklist, task list, training modules | Real, personal | Starts at zero/pending for every new account — no fabricated progress |
| Document upload | Real | Real Firebase Storage upload with progress in live mode; local object-URL fallback in local mode — either way, real file metadata, not a fake row |
| Profile edit | Real, personal | Editable fields persist; avatar defaults to a generated identicon seeded from your email, not a stock photo of a person who doesn't exist |
| Settings (dark mode toggle, notification prefs, language) | Real, personal | Persisted; dark mode/language are stored preferences without a themed stylesheet switch yet |

## Explicitly not built

QR/biometric check-in, OCR document verification, resume parsing, a voice assistant, real payroll disbursement, and transactional email/SMS/push delivery are not implemented. Each needs a real ML model, a hardware/browser biometric API, or a paid provider account that only you can provision — see the README's "Known scope boundaries."
