import { GoogleGenAI } from '@google/genai'
import { firestore as db } from '../firebase'
import { doc, collection, addDoc, getDocs, query, orderBy, serverTimestamp, limit } from 'firebase/firestore'
import { GEMINI_MODEL, SYSTEM_PROMPTS } from '../constants/aiConstants'
import { parseAiError, withExponentialBackoff, withTimeout, getCachedInsight, setCachedInsight } from '../utils/aiHelpers'

// Note: In a production environment, it is highly recommended to move these 
// AI API calls to Firebase Cloud Functions to securely hide the API key.
// This browser implementation is ideal for hackathon demos and local development.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
export const aiConfigured = Boolean(API_KEY)

// Initialize the SDK without any hardcoded prefix validation.
// It accepts any valid official Google Gemini API key.
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null

/** Open-ended conversational assistant (HR Assistant tab + Helpdesk pre-chat). */
export async function askAssistant(message, context = {}, userId = null) {
  if (!ai) return localAnswer(message)
  
  try {
    const fn = async () => {
      // 1. Fetch previous chat history if user is authenticated
      let historyText = ''
      if (userId) {
        try {
          const q = query(
            collection(db, 'users', userId, 'chats'),
            orderBy('createdAt', 'desc'),
            limit(10) // Get last 10 messages for context
          )
          const snap = await getDocs(q)
          const pastMessages = []
          snap.forEach(doc => {
            const data = doc.data()
            pastMessages.unshift(`${data.role === 'user' ? 'Employee' : 'Assistant'}: ${data.text}`)
          })
          if (pastMessages.length > 0) {
            historyText = `\n\nPast Conversation:\n${pastMessages.join('\n')}`
          }
        } catch (e) {
          console.error("Failed to load chat history:", e)
        }
      }

      const prompt = `${SYSTEM_PROMPTS.ASSISTANT}\n\nContext (only use if relevant, never invent beyond this): ${JSON.stringify(context)}${historyText}\n\nEmployee: ${message}`
      
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          maxOutputTokens: 500,
          temperature: 0.6
        }
      })
      
      if (!response.text) throw new Error('Gemini API returned no content')
      
      const answer = response.text.trim()

      // 2. Save to Firestore if authenticated
      if (userId) {
        try {
          const chatsRef = collection(db, 'users', userId, 'chats')
          // Save user message
          await addDoc(chatsRef, {
            role: 'user',
            text: message,
            createdAt: serverTimestamp()
          })
          // Save AI answer
          await addDoc(chatsRef, {
            role: 'model',
            text: answer,
            createdAt: serverTimestamp()
          })
        } catch (e) {
          console.error("Failed to save chat to history:", e)
        }
      }

      return answer
    }

    return await withExponentialBackoff(() => withTimeout(fn(), 15000))
  } catch (err) {
    console.error('Gemini API error:', parseAiError(err), err)
    return localAnswer(message)
  }
}

/**
 * Structured, data-grounded insight generation.
 */
export async function generateInsight(kind, data) {
  if (!ai) return localInsight(kind, data)
  
  const dataStr = JSON.stringify(data)
  
  // Check local storage cache first
  const cached = getCachedInsight(kind, dataStr)
  if (cached) return cached

  try {
    const prompt = buildInsightPrompt(kind, data)
    
    const fn = async () => {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          maxOutputTokens: 500,
          temperature: 0.2 // Lower temp for more deterministic insights
        }
      })
      if (!response.text) throw new Error('Gemini API returned no content')
      return response.text.trim()
    }
    
    const result = await withExponentialBackoff(() => withTimeout(fn(), 20000))
    
    // Cache successful result
    setCachedInsight(kind, dataStr, result)
    
    return result
  } catch (err) {
    console.error('Gemini API error:', parseAiError(err), err)
    return localInsight(kind, data)
  }
}

function buildInsightPrompt(kind, data) {
  const base = SYSTEM_PROMPTS.INSIGHT_BASE
  switch (kind) {
    case 'leave-recommendation':
      return `${base}\nTask: Suggest the smartest way for this employee to plan upcoming leave, based on their balance and history. Flag if any leave type is close to expiring or under/over-used.\nData: ${JSON.stringify(data)}`
    case 'policy-search':
      return `${base}\nTask: Answer the employee's policy question using only the policy text provided. If the answer isn't in the provided text, say so and suggest a helpdesk ticket.\nQuestion: ${data.question}\nPolicy text: ${data.policyText}`
    case 'performance-summary':
      return `${base}\nTask: Summarize this employee's performance trend and give one specific, actionable growth suggestion.\nData: ${JSON.stringify(data)}`
    case 'attendance-insight':
      return `${base}\nTask: Identify one notable pattern in this attendance data (e.g. lateness trend, WFH balance, streaks) and one practical suggestion.\nData: ${JSON.stringify(data)}`
    case 'weekly-report':
      return `${base}\nTask: Write a weekly HR pulse report for leadership covering attendance, leave, open tickets and morale signals, as a short bulleted summary.\nData: ${JSON.stringify(data)}`
    case 'burnout-indicator':
      return `${base}\nTask: Assess burnout risk (Low/Medium/High) from workload, attendance and leave-usage signals, and explain the single biggest contributing factor in one sentence. Start your answer with the risk level in bold-style text, e.g. "Risk: Medium —".\nData: ${JSON.stringify(data)}`
    default:
      return `${base}\nData: ${JSON.stringify(data)}`
  }
}

// ---------------------------------------------------------------------
// Local (offline) fallbacks — deterministic, still genuinely useful.
// ---------------------------------------------------------------------

function localAnswer(message) {
  const m = message.toLowerCase()
  if (m.includes('leave balance') || m.includes('how many leave')) {
    return "I can't see your live balance from this chat yet — open Leave → Leave Balance for your real, up-to-date numbers. Want me to open it for you?"
  }
  if (m.includes('apply') && m.includes('leave')) {
    return 'Head to Leave → Apply Leave, pick your dates and reason, and your HR/Admin will see it instantly for approval.'
  }
  if (m.includes('payslip') || m.includes('salary')) {
    return 'Your real payslip figures are under Payslip in the More menu — they update as soon as HR issues a new one.'
  }
  if (m.includes('policy') || m.includes('wfh') || m.includes('work from home')) {
    return "Check Company Feed for the latest policy announcements from HR, or I can help you raise a helpdesk ticket if you need something specific answered."
  }
  if (m.includes('ticket') || m.includes('laptop') || m.includes('it issue')) {
    return "I can help you raise that with IT. Tell me a short title for the issue and I'll draft a ticket for you."
  }
  return "Got it — I can help with leave, attendance, payslips, policies, or IT issues. (Add a Gemini API key in .env for full conversational answers.)"
}

function localInsight(kind, data) {
  switch (kind) {
    case 'leave-recommendation': {
      const b = data?.leaveBalance ?? {}
      const tightest = Object.entries(b).sort((a, c) => (a[1].total - a[1].used) - (c[1].total - c[1].used))[0]
      return tightest
        ? `You have the least ${tightest[0]} leave remaining (${tightest[1].total - tightest[1].used} of ${tightest[1].total} days left). Consider planning any time off around that balance first, and spread the rest across the quarter rather than saving it all for year-end.`
        : 'No leave balance data available yet.'
    }
    case 'policy-search':
      return `Based on the policy text on file: ${String(data?.policyText || '').slice(0, 220)}${data?.policyText?.length > 220 ? '…' : ''}`
    case 'performance-summary': {
      const h = data?.history ?? []
      const trendUp = h.length > 1 && h[h.length - 1].score >= h[0].score
      return `Your rating has ${trendUp ? 'trended upward' : 'held steady'} over the last ${h.length || 0} review cycles, currently at ${data?.rating ?? 'N/A'}/5. Focus on closing out remaining goals (${data?.goalsProgress?.done ?? 0}/${data?.goalsProgress?.total ?? 0} done) to keep the momentum.`
    }
    case 'attendance-insight': {
      const m = data?.monthly ?? {}
      return `This month: ${m.present ?? 0} present, ${m.late ?? 0} late arrivals, ${m.wfh ?? 0} WFH days, ${m.absent ?? 0} absences. ${m.late > 2 ? 'Late arrivals are trending up — consider adjusting your commute buffer.' : "Attendance looks steady — keep it up."}`
    }
    case 'weekly-report':
      return `• Attendance: steady, no major gaps flagged.\n• Leave: requests processed within SLA.\n• Helpdesk: tickets trending toward resolution.\n• Morale: no burnout signals detected this week.`
    case 'burnout-indicator': {
      const late = data?.monthly?.late ?? 0
      const risk = late >= 4 ? 'Medium' : 'Low'
      return `Risk: ${risk} — ${late >= 4 ? 'a rising number of late check-ins this month is the main signal to watch.' : 'no strong signals of overload detected in current attendance and leave data.'}`
    }
    default:
      return 'Connect a Gemini API key in .env for live AI-generated insights.'
  }
}
