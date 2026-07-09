import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Sparkles, LifeBuoy } from 'lucide-react'
import { askAssistant, aiConfigured } from '../../services/aiService'
import { useAuth } from '../../context/AuthContext'
import BottomNav from '../../components/BottomNav'

const suggestions = ['Check my leave balance', 'Apply for leave', "What's my payslip?", 'WFH policy']

export default function Assistant() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const firstName = (user?.displayName || user?.email || 'there').split(' ')[0]
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi ${firstName}! 👋 I'm your AI HR Assistant. How can I help you today?` },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    if (!user?.uid) return
    let isMounted = true
    import('firebase/firestore').then(({ collection, query, orderBy, limit, getDocs }) => {
      import('../../firebase').then(({ firestore: db }) => {
        const q = query(collection(db, 'users', user.uid, 'chats'), orderBy('createdAt', 'desc'), limit(50))
        getDocs(q).then(snap => {
          if (!isMounted) return
          const past = []
          snap.forEach(doc => past.unshift(doc.data()))
          if (past.length > 0) {
            setMessages(past.map(p => ({ role: p.role === 'model' ? 'assistant' : p.role, text: p.text })))
          }
        }).catch(e => console.error("Error loading chat history:", e))
      })
    })
    return () => { isMounted = false }
  }, [user?.uid])

  async function send(text) {
    const msg = text ?? input
    if (!msg.trim()) return
    setMessages((m) => [...m, { role: 'user', text: msg }])
    setInput('')
    setLoading(true)
    const reply = await askAssistant(msg, { name: firstName }, user?.uid)
    setMessages((m) => [...m, { role: 'assistant', text: reply }])
    setLoading(false)
  }

  return (
    <div className="app-shell flex flex-col pb-20" style={{ minHeight: '100vh' }}>
      <div className="sticky top-0 z-30 flex items-center justify-between bg-white/90 px-5 pb-3 pt-5 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
            <Sparkles size={16} className="text-neutral-900" />
          </span>
          <div>
            <p className="text-sm font-semibold text-neutral-900">Assistant</p>
            <p className="text-[11px] text-accent-green">{aiConfigured ? 'Online' : 'Demo mode'}</p>
          </div>
        </div>
        <button onClick={() => navigate('/app/helpdesk/chat')} className="flex items-center gap-1.5 rounded-full border border-base-border px-3 py-1.5 text-xs text-neutral-500">
          <LifeBuoy size={13} /> Helpdesk
        </button>
      </div>

      <div className="flex-1 space-y-3 px-5 py-2">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
              m.role === 'user' ? 'bg-neutral-900 text-white' : 'bg-base-card text-neutral-900'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-base-card px-4 py-2.5 text-sm text-neutral-400">Thinking…</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length < 3 && (
        <div className="flex gap-2 overflow-x-auto px-5 pb-2 no-scrollbar">
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full border border-base-border px-3 py-1.5 text-xs text-neutral-500">
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send() }}
        className="fixed bottom-16 left-0 right-0 z-30 mx-auto flex max-w-[480px] items-center gap-2 border-t border-base-border bg-[#FAFAF9] px-4 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask HR anything…"
          className="flex-1 rounded-full border border-base-border bg-base-card px-4 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-600"
        />
        <button type="submit" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white">
          <Send size={16} />
        </button>
      </form>
      <BottomNav />
    </div>
  )
}
