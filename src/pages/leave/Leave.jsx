import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Paperclip, CalendarX2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { subscribeLeaveRequests, submitLeaveRequest, cancelLeaveRequest, subscribeEmployees } from '../../lib/companyStore'
import PageHeader from '../../components/PageHeader'
import { Card, Badge, DarkButton, Input, EmptyState, Skeleton } from '../../components/ui'
import BottomNav from '../../components/BottomNav'

// Statutory-style leave types with sensible defaults. Balances are derived
// from real approved requests this year, not a hardcoded number.
const LEAVE_TYPES = [
  { key: 'Casual Leave', icon: '🌴', annual: 12 },
  { key: 'Sick Leave', icon: '🩺', annual: 10 },
  { key: 'Privilege Leave', icon: '⭐', annual: 15 },
]

function useMyLeave() {
  const { companyId, user } = useAuth()
  const [requests, setRequests] = useState(null)
  useEffect(() => {
    if (!companyId || !user) return
    return subscribeLeaveRequests(companyId, { employeeId: user.uid }, setRequests)
  }, [companyId, user])
  return requests
}

export function LeaveBalance() {
  const navigate = useNavigate()
  const requests = useMyLeave()

  const balances = useMemo(() => {
    if (!requests) return null
    const thisYear = new Date().getFullYear()
    return LEAVE_TYPES.map((t) => {
      const used = requests.filter((r) => r.type === t.key && r.status === 'Approved' && new Date(r.from).getFullYear() === thisYear).length
      return { ...t, used, remaining: Math.max(t.annual - used, 0) }
    })
  }, [requests])

  return (
    <div className="app-shell pb-24">
      <PageHeader title="Leave Balance" />
      <div className="px-5">
        <div className="grid grid-cols-2 gap-3">
          {!balances && LEAVE_TYPES.map((t) => <Skeleton key={t.key} className="h-24" />)}
          {balances?.map((t) => (
            <Card key={t.key}>
              <p className="text-xs text-neutral-400">{t.key}</p>
              <p className="mt-2 text-2xl font-bold text-neutral-900">{t.remaining}</p>
              <p className="text-[11px] text-neutral-500">Available of {t.annual}</p>
              <span className="mt-1 block text-lg">{t.icon}</span>
            </Card>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/app/leave/requests')} className="rounded-xl border border-base-border py-3 text-xs font-semibold text-neutral-900">
            My Requests
          </button>
          <button onClick={() => navigate('/app/leave/calendar')} className="rounded-xl border border-base-border py-3 text-xs font-semibold text-neutral-900">
            Team Calendar
          </button>
        </div>

        <DarkButton className="mt-5 !bg-neutral-900 !text-white" onClick={() => navigate('/app/leave/apply')}>
          Apply Leave
        </DarkButton>
      </div>
      <BottomNav />
    </div>
  )
}

export function ApplyLeave() {
  const navigate = useNavigate()
  const { companyId, user } = useAuth()
  const [form, setForm] = useState({ type: 'Casual Leave', from: '', to: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    if (new Date(form.to) < new Date(form.from)) return setError('End date must be on or after the start date.')
    setError('')
    setSubmitting(true)
    try {
      await submitLeaveRequest(companyId, {
        employeeId: user.uid,
        employeeName: user.displayName || user.email,
        type: form.type, from: form.from, to: form.to, reason: form.reason,
      })
      navigate('/app/leave/requests')
    } catch (err) {
      setError(err?.message || 'Could not submit your request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell pb-24">
      <PageHeader title="Apply Leave" />
      <form onSubmit={submit} className="px-5 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-neutral-400">Leave Type</span>
          <select
            value={form.type}
            onChange={(e) => set('type', e.target.value)}
            className="w-full rounded-xl border border-base-border bg-base-card px-4 py-3 text-sm text-neutral-900 outline-none"
          >
            {LEAVE_TYPES.map((t) => <option key={t.key}>{t.key}</option>)}
          </select>
        </label>
        <Input label="From" type="date" required value={form.from} onChange={(e) => set('from', e.target.value)} />
        <Input label="To" type="date" required value={form.to} onChange={(e) => set('to', e.target.value)} />
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-neutral-400">Reason</span>
          <textarea
            required
            value={form.reason}
            onChange={(e) => set('reason', e.target.value)}
            rows={3}
            placeholder="Family function"
            className="w-full rounded-xl border border-base-border bg-base-card px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-600"
          />
        </label>
        <button type="button" disabled className="flex items-center gap-2 text-xs font-medium text-neutral-300">
          <Paperclip size={14} /> Attach Document (coming soon)
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <DarkButton type="submit" disabled={submitting} className="!bg-neutral-900 !text-white">
          {submitting ? 'Submitting…' : 'Submit Request'}
        </DarkButton>
      </form>
      <BottomNav />
    </div>
  )
}

const statusTone = { Pending: 'warning', Approved: 'success', Rejected: 'danger', Cancelled: 'neutral' }
const filters = ['All', 'Pending', 'Approved', 'Rejected']

export function MyLeaveRequests() {
  const { companyId } = useAuth()
  const [filter, setFilter] = useState('All')
  const requests = useMyLeave()
  const list = (requests || []).filter((r) => filter === 'All' || r.status === filter)

  async function cancel(id) {
    await cancelLeaveRequest(companyId, id)
  }

  return (
    <div className="app-shell pb-24">
      <PageHeader title="My Leave Requests" />
      <div className="px-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium ${filter === f ? 'bg-neutral-900 text-white' : 'bg-base-card text-neutral-400'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {requests === null && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          {requests !== null && list.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{r.type}</p>
                  <p className="text-xs text-neutral-500">{r.from === r.to ? r.from : `${r.from} → ${r.to}`}</p>
                </div>
                <Badge tone={statusTone[r.status]}>{r.status}</Badge>
              </div>
              <p className="mt-2 text-xs text-neutral-500">{r.reason}</p>
              {r.reviewedBy && <p className="mt-1 text-[11px] text-neutral-400">Reviewed by {r.reviewedBy}</p>}
              {r.status === 'Pending' && (
                <button onClick={() => cancel(r.id)} className="mt-2 text-xs font-medium text-accent-red">
                  Cancel Request
                </button>
              )}
            </Card>
          ))}
          {requests !== null && list.length === 0 && (
            <EmptyState icon={CalendarX2} title="No leave requests" body="Anything you apply for shows up here instantly." />
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

export function TeamCalendar() {
  const { companyId } = useAuth()
  const [requests, setRequests] = useState(null)
  const [employees, setEmployees] = useState(null)

  useEffect(() => {
    if (!companyId) return
    const u1 = subscribeLeaveRequests(companyId, {}, setRequests)
    const u2 = subscribeEmployees(companyId, setEmployees)
    return () => { u1(); u2() }
  }, [companyId])

  const today = new Date().toISOString().slice(0, 10)
  const onLeaveToday = (requests || []).filter((r) => r.status === 'Approved' && r.from <= today && r.to >= today)
  const byId = useMemo(() => Object.fromEntries((employees || []).map((e) => [e.uid, e])), [employees])

  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const startOffset = new Date(now.getFullYear(), now.getMonth(), 1).getDay()
  const approvedDays = new Set()
  ;(requests || []).filter((r) => r.status === 'Approved').forEach((r) => {
    const from = new Date(r.from), to = new Date(r.to)
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) approvedDays.add(d.getDate())
    }
  })

  return (
    <div className="app-shell pb-24">
      <PageHeader title="Team Calendar" subtitle={now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} />
      <div className="px-5">
        <Card>
          <div className="grid grid-cols-7 gap-y-2 text-center text-[11px] text-neutral-500">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}
            {Array.from({ length: startOffset }).map((_, i) => <span key={'e' + i} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const isMarked = approvedDays.has(day)
              return (
                <span key={day} className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs ${isMarked ? 'bg-neutral-900 font-semibold text-white' : 'text-neutral-500'}`}>
                  {day}
                </span>
              )
            })}
          </div>
        </Card>

        <h2 className="mt-5 text-sm font-semibold text-neutral-900">
          {now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {onLeaveToday.length} on leave
        </h2>
        <div className="mt-3 space-y-2">
          {onLeaveToday.map((r) => (
            <Card key={r.id} className="flex items-center gap-3 !p-3">
              <img src={byId[r.employeeId]?.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${r.employeeId}`} alt="" className="h-9 w-9 rounded-full object-cover" />
              <div className="flex-1">
                <p className="text-sm text-neutral-900">{r.employeeName}</p>
              </div>
              <span className="text-xs text-neutral-500">{r.type}</span>
            </Card>
          ))}
          {onLeaveToday.length === 0 && <p className="text-sm text-neutral-500">No one is on approved leave today.</p>}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
