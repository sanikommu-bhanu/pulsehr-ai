import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, ResponsiveContainer, XAxis } from 'recharts'
import { Users, CalendarCheck, Copy, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { subscribeCompanyStats, subscribeLeaveRequests, decideLeaveRequest, getCompany, subscribeTickets, updateTicketStatus } from '../../lib/companyStore'
import PageHeader from '../../components/PageHeader'
import { Card, Badge, Skeleton, EmptyState } from '../../components/ui'
import BottomNav from '../../components/BottomNav'

export function HRDashboard() {
  const navigate = useNavigate()
  const { companyId, user } = useAuth()
  const [stats, setStats] = useState(null)
  const [pending, setPending] = useState(null)
  const [tickets, setTickets] = useState(null)
  const [company, setCompany] = useState(null)
  const [copied, setCopied] = useState(false)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (!companyId) return
    const u1 = subscribeCompanyStats(companyId, setStats)
    const u2 = subscribeLeaveRequests(companyId, {}, setPending)
    const u3 = subscribeTickets(companyId, {}, setTickets)
    getCompany(companyId).then(setCompany)
    return () => { u1(); u2(); u3() }
  }, [companyId])

  const ticketTone = { Open: 'warning', 'In Progress': 'info', Closed: 'success' }
  async function advanceTicket(t) {
    const next = t.status === 'Open' ? 'In Progress' : t.status === 'In Progress' ? 'Closed' : 'Closed'
    await updateTicketStatus(companyId, t.id, next, { employeeId: t.employeeId, title: t.title })
  }

  const pendingRequests = (pending || []).filter((r) => r.status === 'Pending')

  async function decide(req, decision) {
    setBusyId(req.id)
    try {
      await decideLeaveRequest(companyId, req.id, decision, {
        reviewerName: user.displayName || user.email,
        employeeId: req.employeeId, employeeName: req.employeeName, type: req.type,
      })
    } finally {
      setBusyId(null)
    }
  }

  function copyCode() {
    navigator.clipboard?.writeText(company?.joinCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="app-shell pb-24">
      <PageHeader title="HR Dashboard" subtitle={company?.name} back={false} />
      <div className="px-5">
        {company?.joinCode && (
          <button onClick={copyCode} className="mb-4 flex w-full items-center justify-between rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-2.5">
            <div className="text-left">
              <p className="text-[10px] text-neutral-400">Company Join Code</p>
              <p className="text-sm font-bold tracking-widest text-neutral-900">{company.joinCode}</p>
            </div>
            {copied ? <Check size={16} className="text-accent-green" /> : <Copy size={16} className="text-neutral-400" />}
          </button>
        )}

        <div className="grid grid-cols-3 gap-3">
          {!stats && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          {stats && (
            <>
              <Card><p className="text-xs text-neutral-400">Employees</p><p className="mt-1 text-lg font-bold text-neutral-900">{stats.employeeCount}</p></Card>
              <Card><p className="text-xs text-neutral-400">On Leave Today</p><p className="mt-1 text-lg font-bold text-neutral-900">{stats.onLeaveToday}</p></Card>
              <Card><p className="text-xs text-neutral-400">Open Tickets</p><p className="mt-1 text-lg font-bold text-neutral-900">{stats.openTickets}</p></Card>
            </>
          )}
        </div>

        <button onClick={() => navigate('/app/team')} className="mt-4 flex w-full items-center gap-2 rounded-xl border border-base-border py-2.5 justify-center text-xs font-semibold text-neutral-900">
          <Users size={14} /> View Employee Directory
        </button>
        <button onClick={() => navigate('/app/payroll/issue')} className="mt-2 flex w-full items-center gap-2 rounded-xl bg-neutral-900 py-2.5 justify-center text-xs font-semibold text-white">
          Issue Payslip
        </button>

        <h2 className="mt-5 text-sm font-semibold text-neutral-900">Department Overview</h2>
        <Card className="mt-3">
          {stats?.departmentBreakdown?.length ? (
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.departmentBreakdown}>
                  <XAxis dataKey="dept" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Bar dataKey="v" radius={[6, 6, 0, 0]} fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-neutral-400">Departments will appear here once employees join.</p>
          )}
        </Card>

        <h2 className="mt-5 text-sm font-semibold text-neutral-900">Pending Leave Approvals</h2>
        <div className="mt-3 space-y-2">
          {pending === null && Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          {pending !== null && pendingRequests.map((r) => (
            <Card key={r.id} className="!p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-900">{r.employeeName}</p>
                  <p className="text-[11px] text-neutral-500">{r.type} · {r.from === r.to ? r.from : `${r.from} → ${r.to}`}</p>
                  <p className="mt-1 text-[11px] text-neutral-400">{r.reason}</p>
                </div>
                <div className="flex gap-2">
                  <button disabled={busyId === r.id} onClick={() => decide(r, 'Approved')} className="rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">Approve</button>
                  <button disabled={busyId === r.id} onClick={() => decide(r, 'Rejected')} className="rounded-full border border-base-border px-3 py-1.5 text-[11px] text-neutral-500 disabled:opacity-50">Reject</button>
                </div>
              </div>
            </Card>
          ))}
          {pending !== null && pendingRequests.length === 0 && (
            <EmptyState icon={CalendarCheck} title="All caught up" body="No pending leave requests right now." />
          )}
        </div>

        <h2 className="mt-5 text-sm font-semibold text-neutral-900">Ticket Management</h2>
        <div className="mt-3 space-y-2">
          {tickets === null && Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          {tickets !== null && tickets.slice(0, 8).map((t) => (
            <Card key={t.id} onClick={() => advanceTicket(t)} className="flex cursor-pointer items-center justify-between !p-3">
              <div>
                <p className="text-sm text-neutral-900">{t.title}</p>
                <p className="text-[11px] text-neutral-500">{t.employeeName} · {t.dept}</p>
              </div>
              <Badge tone={ticketTone[t.status]}>{t.status}</Badge>
            </Card>
          ))}
          {tickets !== null && tickets.length === 0 && <p className="text-sm text-neutral-500">No tickets raised yet.</p>}
          {tickets && tickets.length > 0 && <p className="text-center text-[10px] text-neutral-400">Tap a ticket to advance its status</p>}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
