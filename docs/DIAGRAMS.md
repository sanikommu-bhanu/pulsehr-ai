# Diagrams

Every diagram here matches the actual code in `src/` — if you change a flow, please update the matching diagram.

## Navigation & role split

```mermaid
flowchart LR
    Splash --> Onboarding
    Onboarding --> SignIn
    SignIn --> RoleSelect["/signup — Choose Your Role"]
    RoleSelect -->|Employee| SignUpEmployee["/signup/employee<br/>+ company join code"]
    RoleSelect -->|HR/Admin| SignUpHr["/signup/hr<br/>creates company + join code"]
    SignUpEmployee --> EmployeeHome["/app/home"]
    SignUpHr --> HrDash["/app/dash/hr"]
    SignIn -->|existing account| ProtectedRoute
    ProtectedRoute -->|role=employee| EmployeeHome
    ProtectedRoute -->|role=admin| HrDash

    subgraph "Employee bottom nav"
        EmployeeHome --- Dashboard --- Chat --- MyTeam["My Team"] --- More
    end
    subgraph "HR/Admin bottom nav"
        HrDash --- Employees --- Requests["Requests (approvals)"] --- Feed --- More2["More"]
    end
```

## Leave request lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending: Employee submits (Apply Leave)
    Pending --> Approved: HR/Admin approves
    Pending --> Rejected: HR/Admin rejects
    Pending --> Cancelled: Employee cancels their own request
    Approved --> [*]
    Rejected --> [*]
    Cancelled --> [*]

    note right of Approved
        Both transitions push a
        real-time notification to
        the employee AND update
        their Team Calendar entry
    end note
```

## Attendance check-in/out

```mermaid
sequenceDiagram
    actor E as Employee
    participant UI as Check In screen
    participant CS as companyStore
    participant DB as Firestore/local

    E->>UI: Tap "Check In"
    UI->>CS: checkIn(companyId, uid, name)
    CS->>DB: setDoc attendance/{uid_today} { checkIn: time, status }
    Note over DB: status = 'Late' if after 09:30, else 'Present'
    DB-->>UI: subscribeAttendance fires
    UI-->>E: Button flips to "Check Out", time shown

    E->>UI: Tap "Check Out" (later)
    UI->>CS: checkOut(companyId, uid)
    CS->>DB: updateDoc { checkOut: time }
    DB-->>UI: Dashboard, Attendance History and HR's live "Present Today" count all update
```

## Helpdesk ticket flow

```mermaid
sequenceDiagram
    actor E as Employee
    actor H as HR/Admin
    participant CS as companyStore

    E->>CS: createTicket({ title, dept, priority })
    CS->>CS: status = 'Open'
    Note over H: Ticket appears instantly in HR Dashboard's Ticket Management list
    H->>CS: updateTicketStatus(id, 'In Progress' | 'Closed')
    CS->>E: pushNotification("Ticket updated")
    Note over E: Notifications screen updates in real time
```

## AI Insights & Assistant

```mermaid
flowchart TD
    Data["Real live data:<br/>employees, leave, attendance, tickets"] --> Gate{VITE_GEMINI_API_KEY set?}
    Gate -->|Yes| Gemini["Gemini API call<br/>(grounded prompt, JSON data injected)"]
    Gate -->|No| Local["Deterministic local summary<br/>(same data, template sentences)"]
    Gemini --> Out["Burnout risk / Weekly report / Chat reply"]
    Local --> Out
    Out --> UI["AI Insights screen / Assistant chat / Helpdesk pre-chat"]
```

Both paths are grounded in the same real subscriptions — the local fallback never invents a number that isn't in the data it was given.

## Payroll issuance

```mermaid
sequenceDiagram
    actor H as HR/Admin
    actor E as Employee
    participant CS as companyStore

    H->>CS: issuePayslip({employeeId, month, gross, deductions})
    CS->>CS: net = gross - deductions
    CS->>E: pushNotification("New payslip generated")
    Note over E: Payslip screen (subscribePayslips) updates instantly — no fabricated figures, only what HR entered
```

## Peer feedback

```mermaid
sequenceDiagram
    actor A as Employee A
    actor B as Employee B
    participant CS as companyStore

    A->>CS: submitFeedback({toId: B, note})
    CS->>B: pushNotification("New feedback received")
    Note over B: Feedback → Received tab updates live
    Note over A: Feedback → Given tab shows the same entry
```

## Data flow summary (all shared modules)

```mermaid
flowchart LR
    Write["Any write:<br/>submitLeaveRequest / checkIn / createTicket /<br/>postAnnouncement / issuePayslip / submitFeedback"] --> Branch{firebaseConfigured?}
    Branch -->|Yes| FS[Firestore addDoc/setDoc/updateDoc]
    Branch -->|No| LS[localStorage array + BroadcastChannel emit]
    FS --> Snap[onSnapshot listeners in every open client]
    LS --> Chan[BroadcastChannel + storage listeners in every open tab]
    Snap --> Render[React state updates -> UI re-renders]
    Chan --> Render
```
