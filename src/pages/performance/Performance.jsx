import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, MessageSquarePlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { subscribeEmployees, subscribeFeedback, submitFeedback } from '../../lib/companyStore'
import PageHeader from '../../components/PageHeader'
import { Card, EmptyState } from '../../components/ui'
import BottomNav from '../../components/BottomNav'

export function Overview() {
  const navigate = useNavigate()
  const { companyId, user } = useAuth()
  const [received, setReceived] = useState(null)

  useEffect(() => {
    if (!companyId || !user) return
    return subscribeFeedback(companyId, { employeeId: user.uid, direction: 'received' }, setReceived)
  }, [companyId, user])

  return (
    <div className="app-shell pb-24">
      <PageHeader title="Performance" />
      <div className="px-5">
        <Card className="flex flex-col items-center py-6">
          <p className="text-xs text-neutral-400">Feedback Received</p>
          <p className="mt-1 text-3xl font-bold text-neutral-900">{received === null ? '…' : received.length}</p>
          <p className="text-xs text-neutral-500">notes from colleagues</p>
        </Card>

        <div className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 text-center text-[11px] text-neutral-400">
          Formal review cycles (KPIs, manager ratings) aren't wired up yet — this build tracks real peer feedback below.
        </div>

        <button onClick={() => navigate('/app/performance/feedback')} className="mt-5 w-full rounded-xl bg-neutral-900 py-3 text-xs font-semibold text-white">
          View & Give Feedback
        </button>
      </div>
      <BottomNav />
    </div>
  )
}

export function Feedback() {
  const { companyId, user } = useAuth()
  const [tab, setTab] = useState('Received')
  const [received, setReceived] = useState(null)
  const [given, setGiven] = useState(null)
  const [employees, setEmployees] = useState(null)
  const [composing, setComposing] = useState(false)
  const [form, setForm] = useState({ toId: '', note: '' })

  useEffect(() => {
    if (!companyId || !user) return
    const u1 = subscribeFeedback(companyId, { employeeId: user.uid, direction: 'received' }, setReceived)
    const u2 = subscribeFeedback(companyId, { employeeId: user.uid, direction: 'given' }, setGiven)
    const u3 = subscribeEmployees(companyId, setEmployees)
    return () => { u1(); u2(); u3() }
  }, [companyId, user])

  const list = tab === 'Given' ? given : received
  const colleagues = (employees || []).filter((e) => e.uid !== user?.uid)

  async function submit(e) {
    e.preventDefault()
    const target = colleagues.find((c) => c.uid === form.toId)
    if (!target) return
    await submitFeedback(companyId, { fromId: user.uid, fromName: user.displayName || user.email, toId: target.uid, toName: target.name, note: form.note })
    setForm({ toId: '', note: '' })
    setComposing(false)
    setTab('Given')
  }

  return (
    <div className="app-shell pb-24">
      <PageHeader title="Feedback" />
      <div className="px-5">
        <div className="flex gap-2">
          {['Received', 'Given'].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${tab === t ? 'bg-neutral-900 text-white' : 'bg-base-card text-neutral-400'}`}>{t}</button>
          ))}
        </div>

        <Card className="mt-4">
          {!composing ? (
            <button onClick={() => setComposing(true)} className="flex w-full items-center gap-2 text-sm font-medium text-neutral-500">
              <MessageSquarePlus size={16} /> Give feedback to a colleague…
            </button>
          ) : (
            <form onSubmit={submit} className="space-y-2">
              <select required value={form.toId} onChange={(e) => setForm((f) => ({ ...f, toId: e.target.value }))} className="w-full rounded-lg border border-base-border bg-white px-3 py-2 text-sm">
                <option value="">Choose a colleague</option>
                {colleagues.map((c) => <option key={c.uid} value={c.uid}>{c.name}</option>)}
              </select>
              <textarea required rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Great work on…" className="w-full rounded-lg border border-base-border bg-white px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <button type="submit" className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white">Send</button>
                <button type="button" onClick={() => setComposing(false)} className="rounded-xl border border-base-border px-4 py-2 text-xs text-neutral-500">Cancel</button>
              </div>
            </form>
          )}
        </Card>

        <div className="mt-4 space-y-2">
          {list === null && <p className="text-center text-sm text-neutral-400">Loading…</p>}
          {list?.map((f) => (
            <Card key={f.id} className="!p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-900">{tab === 'Given' ? f.toName : f.fromName}</p>
                <Star size={13} className="fill-accent-amber text-accent-amber" />
              </div>
              <p className="mt-1 text-xs text-neutral-500">{f.note}</p>
            </Card>
          ))}
          {list?.length === 0 && <EmptyState icon={Star} title="No feedback yet" body={tab === 'Given' ? 'Notes you give will show here.' : 'Feedback from colleagues shows up instantly.'} />}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
