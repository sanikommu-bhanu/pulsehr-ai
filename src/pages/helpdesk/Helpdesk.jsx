import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Plus, Inbox } from 'lucide-react'
import { askAssistant } from '../../services/aiService'
import { useAuth } from '../../context/AuthContext'
import { createTicket, subscribeTickets } from '../../lib/companyStore'
import PageHeader from '../../components/PageHeader'
import { Card, Badge, DarkButton, Input, EmptyState, Skeleton } from '../../components/ui'
import BottomNav from '../../components/BottomNav'

const tabs = ['All', 'Open', 'In Progress', 'Closed']
const tone = { Open: 'warning', 'In Progress': 'info', Closed: 'success' }

export function Tickets() {
  const navigate = useNavigate()
  const { companyId, user } = useAuth()
  const [tab, setTab] = useState('All')
  const [tickets, setTickets] = useState(null)

  useEffect(() => {
    if (!companyId || !user) return
    return subscribeTickets(companyId, { employeeId: user.uid }, setTickets)
  }, [companyId, user])

  const list = (tickets || []).filter((t) => tab === 'All' || t.status === tab)

  return (
    <div className="app-shell pb-24">
      <PageHeader title="Helpdesk Tickets" />
      <div className="px-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium ${tab === t ? 'bg-neutral-900 text-white' : 'bg-base-card text-neutral-400'}`}>{t}</button>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {tickets === null && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          {tickets !== null && list.map((t) => (
            <Card key={t.id} className="!p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-900">{t.title}</p>
                <Badge tone={tone[t.status]}>{t.status}</Badge>
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">{t.id.slice(0, 8).toUpperCase()} · {t.dept} · {t.priority} priority</p>
            </Card>
          ))}
          {tickets !== null && list.length === 0 && (
            <EmptyState icon={Inbox} title="No tickets" body="Raise one below and it'll reach HR/IT instantly." />
          )}
        </div>
        <button
          onClick={() => navigate('/app/helpdesk/new')}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white"
        >
          <Plus size={16} /> New Ticket
        </button>
      </div>
      <BottomNav />
    </div>
  )
}

export function NewTicket() {
  const navigate = useNavigate()
  const { companyId, user } = useAuth()
  const [form, setForm] = useState({ title: '', dept: 'IT', priority: 'Medium', desc: '' })
  const [submitting, setSubmitting] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createTicket(companyId, {
        employeeId: user.uid, employeeName: user.displayName || user.email,
        title: form.desc ? `${form.title} — ${form.desc}` : form.title,
        dept: form.dept, priority: form.priority,
      })
      navigate('/app/helpdesk')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell pb-24">
      <PageHeader title="Raise a Ticket" />
      <form onSubmit={submit} className="px-5 space-y-4">
        <Input label="Title" required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Laptop not working" />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-neutral-400">Department</span>
            <select value={form.dept} onChange={(e) => set('dept', e.target.value)} className="w-full rounded-xl border border-base-border bg-base-card px-4 py-3 text-sm text-neutral-900 outline-none">
              {['IT', 'HR', 'Finance', 'Admin'].map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-neutral-400">Priority</span>
            <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className="w-full rounded-xl border border-base-border bg-base-card px-4 py-3 text-sm text-neutral-900 outline-none">
              {['Low', 'Medium', 'High'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-neutral-400">Description</span>
          <textarea required rows={4} value={form.desc} onChange={(e) => set('desc', e.target.value)} className="w-full rounded-xl border border-base-border bg-base-card px-4 py-3 text-sm text-neutral-900 outline-none" />
        </label>
        <DarkButton type="submit" disabled={submitting} className="!bg-neutral-900 !text-white">
          {submitting ? 'Submitting…' : 'Submit Ticket'}
        </DarkButton>
      </form>
      <BottomNav />
    </div>
  )
}

export function HelpdeskChat() {
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hi! How can I help you today?' }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function send() {
    if (!input.trim()) return
    setMessages((m) => [...m, { role: 'user', text: input }])
    const msg = input
    setInput('')
    setLoading(true)
    const reply = await askAssistant(`[This is the IT/HR helpdesk chat, before a ticket is raised] ${msg}`)
    setMessages((m) => [...m, { role: 'assistant', text: reply }])
    setLoading(false)
  }

  return (
    <div className="app-shell flex flex-col pb-20">
      <PageHeader title="Helpdesk Chat" subtitle="AI triage before you raise a ticket" />
      <div className="flex-1 space-y-3 px-5 py-2">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-neutral-900 text-white' : 'bg-base-card text-neutral-900'}`}>{m.text}</div>
          </div>
        ))}
        {loading && <div className="rounded-2xl bg-base-card px-4 py-2.5 text-sm text-neutral-400 w-fit">Typing…</div>}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send() }} className="fixed bottom-16 left-0 right-0 z-30 mx-auto flex max-w-[480px] items-center gap-2 border-t border-base-border bg-[#FAFAF9] px-4 py-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="My laptop is not working" className="flex-1 rounded-full border border-base-border bg-base-card px-4 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-600" />
        <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white"><Send size={16} /></button>
      </form>
      <BottomNav />
    </div>
  )
}
