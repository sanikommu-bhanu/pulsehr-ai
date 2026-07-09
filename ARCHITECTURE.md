# Architecture

## 1. System overview

```mermaid
flowchart TB
    subgraph Client["React 18 SPA (Vite)"]
        UI["Pages: Employee screens + HR/Admin screens"]
        Auth["AuthContext<br/>sign-up / sign-in / session"]
        CS["companyStore.js<br/>shared, real-time data"]
        PS["store.js<br/>personal-only data"]
        AI["aiAssistant.js<br/>Gemini + local fallback"]
    end

    subgraph Local["Local mode (no Firebase keys)"]
        LS[("localStorage")]
        BC{{"BroadcastChannel<br/>cross-tab live sync"}}
    end

    subgraph Firebase["Live mode (Firebase project configured)"]
        FA["Firebase Auth"]
        FS[("Firestore<br/>companies/{id}/...")]
        FST["Firebase Storage<br/>document uploads"]
        Rules["firestore.rules<br/>per-company access control"]
    end

    subgraph External["External API"]
        Gemini["Google Gemini API"]
    end

    UI --> Auth
    UI --> CS
    UI --> PS
    UI --> AI

    Auth -- "firebaseConfigured? live : local" --> FA
    Auth --> LS

    CS -- "onSnapshot / setDoc / addDoc" --> FS
    FS --- Rules
    CS -- "read/write + BroadcastChannel emit" --> LS
    LS --> BC
    BC -. "notifies other open tabs" .-> CS

    PS --> LS
    PS -. "debounced push, live pull" .-> FS

    AI -- "if VITE_GEMINI_API_KEY set" --> Gemini
    AI -- "else" --> AI

    FST -. "download URL stored in" .-> PS
```

**The one decision that shapes everything else:** any data that both an Employee and their HR/Admin need to see and act on together (leave, attendance, tickets, announcements, notifications, payroll, peer feedback, the employee directory) lives in **`companyStore.js`**, scoped by a real `companyId`. Anything private to one account (profile edits, uploaded document metadata, app settings) lives in **`store.js`**, scoped by that account's `uid`. No screen ever guesses which backend is active — both stores expose the same function signatures whether they're backed by Firestore or by localStorage + BroadcastChannel.

## 2. Sign-up: role selection creates the company relationship

```mermaid
sequenceDiagram
    actor U as Person signing up
    participant UI as RoleSelect / SignUpHr / SignUpEmployee
    participant Auth as AuthContext
    participant CS as companyStore
    participant DB as Firestore / local store

    U->>UI: Choose "HR/Admin" or "Employee"
    alt HR/Admin
        U->>UI: Company name, email, password
        UI->>Auth: signUp({accountType:'hr', companyName, ...})
        Auth->>DB: create Firebase/local account
        Auth->>CS: createCompany()
        CS->>DB: companies/{id} { name, joinCode }
        CS->>DB: companies/{id}/employees/{uid} { role:'admin' }
        CS->>DB: userIndex/{uid} { companyId, role:'admin' }
        CS-->>UI: joinCode shown once, copyable
    else Employee
        U->>UI: Name, company join code, password
        UI->>Auth: signUp({accountType:'employee', joinCode, ...})
        Auth->>DB: create Firebase/local account
        Auth->>CS: joinCompanyByCode()
        CS->>DB: find companies where joinCode == code
        CS->>DB: companies/{id}/employees/{uid} { role:'employee' }
        CS->>DB: userIndex/{uid} { companyId, role:'employee' }
    end
    UI->>U: Land on the role-appropriate home (Employee Home or HR Dashboard)
```

On every subsequent app load, `AuthContext` reads `userIndex/{uid}` (Firestore) or the equivalent local record to recover `{ companyId, role }` before rendering anything — this is what lets `ProtectedRoute`/`RoleRoute` send an HR/Admin straight to `/app/dash/hr` and an Employee to `/app/home`.

## 3. The flagship real-time loop: leave approval

```mermaid
sequenceDiagram
    actor E as Employee
    actor H as HR/Admin
    participant CSe as companyStore (Employee tab)
    participant Store as Firestore or local + BroadcastChannel
    participant CSh as companyStore (HR tab)

    E->>CSe: submitLeaveRequest()
    CSe->>Store: addDoc companies/{id}/leaveRequests { status:'Pending' }
    Store-->>CSh: onSnapshot fires (or BroadcastChannel message)
    CSh-->>H: Pending Approvals list updates instantly

    H->>CSh: decideLeaveRequest(id, 'Approved')
    CSh->>Store: updateDoc { status:'Approved', reviewedBy }
    CSh->>Store: pushNotification(employeeId, "Leave approved")
    Store-->>CSe: onSnapshot fires (or BroadcastChannel message)
    CSe-->>E: My Leave Requests updates + a notification appears — within seconds
```

The same pattern (write from one role, both roles' live subscriptions update) powers helpdesk tickets, payroll issuance, announcements, and peer feedback — see `docs/DIAGRAMS.md` for each one individually.

## 4. Security model in one sentence

**An employee can always read/write their own records; an HR/Admin can read and update any record inside their own company; nobody can touch another company's data at all** — enforced in `firestore.rules`, not just hidden in the UI. Full reasoning and the rule-by-rule breakdown is in `docs/DATABASE.md`.

## 5. Why two data stores instead of one

The original single-document-per-user design (kept as `store.js`) cannot express "HR approves employee X's request and X sees it change" — there is structurally only one profile, so there is no one else to notify. `companyStore.js` exists because real HR software's entire value is in that connection: every collection carries a `companyId` and (where relevant) an `employeeId`, so a query can express exactly "everyone in my company" or "just me," and a security rule can enforce who's allowed to ask for which.

## 6. Known scope boundaries

See the README's [Known scope boundaries](../README.md#known-scope-boundaries) section — repeated here because it matters architecturally: payroll, performance reviews, and biometric/OCR features are intentionally scoped to what a frontend can honestly deliver without a real payroll provider, ML model, or hardware API behind it.
