# AI Layer

All AI logic lives in one file: `src/lib/aiAssistant.js`. It exposes two
functions and every AI surface in the app calls one of them.

## `askAssistant(message, context)`
Open-ended conversational Q&A, used by the HR Assistant chat tab and the
Helpdesk pre-chat. Takes the user's message plus a small context object
(currently just the person's first name). It deliberately does **not** get
handed specific figures like leave balance or payslip amount — those live in
`companyStore.js`'s real-time subscriptions, and the offline fallback answer
points the person to the real live screen instead of guessing a number.

## `generateInsight(kind, data)`
Structured, one-shot generation for a specific insight type. `kind` selects a
prompt template in `buildInsightPrompt`; `data` is the real data to ground the
answer in (never invented). Kinds implemented today:

| kind | Wired into a screen? | Grounds on |
|---|---|---|
| `weekly-report` | Yes — AI Insights | live employee count, present-today, on-leave, open tickets, pending leave |
| `burnout-indicator` | Yes — AI Insights | the same live company stats object |
| `leave-recommendation` | Implemented, not currently called from a screen | a `leaveBalance`-shaped object, if you wire it up |
| `policy-search` | Implemented, not currently called from a screen | a question + policy text you supply |
| `performance-summary` | Implemented, not currently called from a screen | a rating-history-shaped object, if you wire it up |
| `attendance-insight` | Implemented, not currently called from a screen | a monthly-attendance-shaped object, if you wire it up |

The four "implemented, not currently called" kinds are real, tested prompt
templates in `buildInsightPrompt` — genuinely useful if you add a screen that
calls them — but nothing in the shipped UI invokes them today, so they're
listed here rather than implied to be live.

## Model & endpoint
- Model: `gemini-2.0-flash` (fast, generous free tier)
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- Auth: API key as a query param, read from `VITE_GEMINI_API_KEY`

## Graceful degradation (this is the important part)
Every call is wrapped:

```
if (!API_KEY) return localFallback(...)
try { return await callGemini(...) }
catch (err) { console.error(...); return localFallback(...) }
```

The `local*` fallback functions are **not** static placeholder text — they
compute a real answer from the same JSON the AI prompt would have received
(e.g. the local leave recommendation finds the leave type with the fewest
days remaining and suggests planning around it). This means:
- The app is fully demoable with zero API keys.
- If Gemini is down, rate-limited, or the key is missing/invalid, the user
  still gets a useful, correct answer — never an error screen or "AI
  unavailable" dead end.

## Prompt design principles
- Every prompt instructs the model to **ground strictly in the provided
  JSON** and never fabricate numbers not present in it.
- Responses are constrained to 3–5 short sentences or a tight bullet list —
  no markdown headers, no filler — since this is a mobile chat/insight
  surface, not a document generator.
- The policy-search prompt explicitly tells the model to say "I'm not sure"
  and suggest a helpdesk ticket rather than guess at policy wording it wasn't
  given.

## Known limitation (by design, flagged honestly)
The Gemini call is made directly from the client for hackathon simplicity —
see the security note in `README.md` / `DEPLOYMENT.md` for the production
fix (move it behind a serverless function).
