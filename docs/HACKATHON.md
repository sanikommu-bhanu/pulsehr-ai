# PulseHR AI — Hackathon Deliverables

## Executive Summary
PulseHR AI is an AI-powered HR operations platform that unifies leave,
attendance, onboarding, performance, and helpdesk into one mobile-first app,
with Gemini-backed insights woven into every module instead of bolted on as
a separate "AI tab." It runs fully functional in a zero-setup demo mode and
switches to a live, real-time, multi-device Firebase backend the moment
credentials are added — with no code changes.

## Problem Statement
HR ops at most mid-size companies are scattered across email, spreadsheets,
a legacy HRMS portal, and Slack DMs. Employees don't know their leave
balance without asking HR; managers approve leave from a spreadsheet;
attendance and performance data live in silos that never talk to each other;
and "AI in HR" usually means a chatbot bolted onto an FAQ page that can't see
any of the employee's actual data.

## Solution
One app, one data model, real-time everywhere:
- **Employees** get a single source of truth for leave, attendance,
  payslips, documents, performance, and a helpdesk — plus an AI assistant
  that can actually see their real leave balance and attendance history,
  not a generic FAQ bot.
- **Managers** approve leave and review their team from the same data,
  updated instantly.
- **HR/Admin** get org-wide analytics, ticket triage, and an AI-generated
  weekly pulse report instead of manually compiling one.

## Business Impact
- Fewer "what's my leave balance" messages to HR — self-serve, instant, AI-explained
- Faster ticket resolution via AI pre-triage before a human ever sees it
- Earlier burnout/attrition signal from the AI risk indicator, computed from
  real attendance + workload data instead of an annual survey
- Zero infrastructure to stand up for a pilot — Firebase free tier + Gemini
  free tier covers a real pilot team at $0

## Architecture
See [`DIAGRAMS.md`](./DIAGRAMS.md) — a real multi-tenant model (companies →
employees → leave/attendance/tickets/payroll, each scoped by a real
`companyId`), realtime `onSnapshot` sync in Firestore or cross-tab
`BroadcastChannel` sync locally, and Gemini with a deterministic local
fallback so a flaky demo Wi-Fi never breaks the flow.

## AI Features (the differentiator)
Six distinct AI surfaces, all grounded in real user data, all with a
graceful non-AI fallback: leave recommendations, policy search, performance
summaries, attendance insights, weekly HR reports, and a burnout risk
indicator. See [`AI.md`](./AI.md).

## Technology Stack
React 18 + Vite + Tailwind + Framer Motion (frontend) · Firebase Auth /
Firestore / Storage (backend-as-a-service) · Google Gemini 2.0 Flash (AI) ·
Recharts (data viz) · lucide-react (icons).

## Scalability
- Firestore scales horizontally per-document; the per-user single-document
  model keeps reads/writes cheap and realtime listeners minimal
- Stateless static frontend — deploy to any CDN, scale to zero cost at zero traffic
- AI calls are the one component with a real unit cost; `docs/DEPLOYMENT.md`
  covers moving them server-side with rate limiting before scaling past a pilot

## Future Scope
- Server-side Gemini calls with per-user rate limiting
- Real payroll provider integration behind the Payslip module (today HR
  manually issues real payslips; there's no tax/disbursement processor)
- Push notifications (FCM) for leave approvals and AI-flagged burnout alerts
- OCR-based document verification
- A formal performance-review cycle (goals, manager ratings, calibration) on
  top of the real peer-feedback feature that ships today
- A holiday calendar and policy library for HR/Admin to manage centrally,
  which the (currently unwired) Policy Search AI kind could index

## Demo Script (5 minutes)
1. **Splash → Onboarding → Sign up** (30s) — show it works instantly, no
   backend required, real photography, not stock-icon placeholders.
2. **Dashboard** (45s) — check in, show the working-hours timer, point out
   the AI leave-recommendation card is computed from *this* seed data.
3. **Apply for leave** (45s) — apply from the Employee tab, show it lands as
   "Pending" instantly, then switch to a second browser tab signed in as
   HR/Admin and approve it live — point out no page refresh was needed on
   either side, and the employee's screen updates on its own.
4. **AI Assistant** (60s) — ask "how many leave days do I have left" and
   "what's the WFH policy" — show the assistant answering from real app
   data, not generic text.
5. **Helpdesk** (45s) — raise a ticket, show the AI pre-triage chat.
6. **AI Insights tab** (45s) — burnout indicator, weekly HR report — this is
   the "why AI, not just CRUD" moment for judges.
7. **Close** (30s) — mention the offline-first + realtime architecture, and
   that the exact same UI already talks to a live Firebase project if keys
   are supplied — this is not a static prototype.

## Judge Talking Points
- **It's not a mockup.** Every button, form, and list is backed by a real
  read/write through `store.js` — nothing is a static screenshot.
- **AI is grounded, not decorative.** Every AI response is prompted with the
  user's real data and instructed never to fabricate numbers outside it.
- **It degrades gracefully.** No Gemini key or a flaky connection during
  judging? The app still gives correct, useful answers via local fallbacks —
  it will never show a broken "AI unavailable" state on stage.
- **Two real roles, one shared data model.** Employee and HR/Admin sign up
  into a real company relationship (join code, not a toggle) and read the
  same real-time collections, each permission-scoped by `firestore.rules` —
  open two tabs during the demo to show both sides updating each other live.
