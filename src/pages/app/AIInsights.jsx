import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, ResponsiveContainer, XAxis } from 'recharts'
import { AlertTriangle, RefreshCw, Sparkles, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { subscribeEmployees, subscribeAttendance, subscribeLeaveRequests, subscribeTickets } from '../../lib/companyStore'
import { generateInsight, aiConfigured } from '../../services/aiService'
import PageHeader from '../../components/PageHeader'
import { Card, Badge, Skeleton } from '../../components/ui'
import BottomNav from '../../components/BottomNav'

function lastNDays(n) {
  return Array.from({ length: n }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return d.toISOString().slice(0, 10)
  })
}

export default function AIInsights() {
  const { companyId } = useAuth()
  const [employees, setEmployees] = useState(null)
  const [leave, setLeave] = useState(null)
  const [tickets, setTickets] = useState(null)
  const [todayAttendance, setTodayAttendance] = useState(null)

  const [burnout, setBurnout] = useState('')
  const [report, setReport] = useState('')
  const [loadingBurnout, setLoadingBurnout] = useState(true)
  const [loadingReport, setLoadingReport] = useState(false)

  useEffect(() => {
    if (!companyId) return
    const u1 = subscribeEmployees(companyId, setEmployees)
    const u2 = subscribeLeaveRequests(companyId, {}, setLeave)
    const u3 = subscribeTickets(companyId, {}, setTickets)
    const u4 = subscribeAttendance(companyId, {}, setTodayAttendance)
    return () => { u1(); u2(); u3(); u4() }
  }, [companyId])

  const leaveByDay = useMemo(() => {
    const days = lastNDays(5)
    return days.map((d) => ({
      day: new Date(d).toLocaleDateString('en-US', { weekday: 'short' }),
      v: (leave || []).filter((r) => r.status === 'Approved' && r.from <= d && r.to >= d).length,
    }))
  }, [leave])

  const stats = useMemo(() => {
    if (!employees || !leave || !tickets || !todayAttendance) return null
    return {
      teamSize: employees.length,
      presentToday: todayAttendance.length,
      onLeaveToday: leave.filter((r) => r.status === 'Approved' && r.from <= new Date().toISOString().slice(0, 10) && r.to >= new Date().toISOString().slice(0, 10)).length,
      openTickets: tickets.filter((t) => t.status !== 'Closed').length,
      pendingLeave: leave.filter((r) => r.status === 'Pending').length,
    }
  }, [employees, leave, tickets, todayAttendance])

  async function loadBurnout() {
    if (!stats) return
    setLoadingBurnout(true)
    const text = await generateInsight('burnout-indicator', stats)
    setBurnout(text)
    setLoadingBurnout(false)
  }

  async function loadReport() {
    if (!stats) return
    setLoadingReport(true)
    const text = await generateInsight('weekly-report', stats)
    setReport(text)
    setLoadingReport(false)
  }

  useEffect(() => { if (stats) loadBurnout() }, [Boolean(stats)]) // eslint-disable-line react-hooks/exhaustive-deps

  const riskMatch = burnout.match(/^Risk:\s*(Low|Medium|High)/i)
  const riskLevel = riskMatch?.[1] ?? 'Low'
  const riskTone = riskLevel === 'High' ? 'danger' : riskLevel === 'Medium' ? 'warning' : 'success'

  return (
    <div className="app-shell pb-24">
      <PageHeader title="AI Insights" subtitle="Generated from real company activity" />
      <div className="px-5">
        <div className="grid grid-cols-3 gap-3">
          {!stats && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          {stats && (
            <>
              <Card><p className="text-xs text-neutral-400">Present Today</p><p className="mt-1 text-lg font-bold text-neutral-900">{stats.presentToday}/{stats.teamSize}</p></Card>
              <Card><p className="text-xs text-neutral-400">On Leave</p><p className="mt-1 text-lg font-bold text-neutral-900">{stats.onLeaveToday}</p></Card>
              <Card><p className="text-xs text-neutral-400">Open Tickets</p><p className="mt-1 text-lg font-bold text-neutral-900">{stats.openTickets}</p></Card>
            </>
          )}
        </div>

        <h2 className="mt-6 text-sm font-semibold text-neutral-900">Approved Leave — Last 5 Days</h2>
        <Card className="mt-3">
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaveByDay}>
                <XAxis dataKey="day" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Bar dataKey="v" radius={[6, 6, 0, 0]} fill="#0D9488" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Burnout Risk Signal</h2>
          <button onClick={loadBurnout} className="text-neutral-500 hover:text-neutral-900">
            <RefreshCw size={13} className={loadingBurnout ? 'animate-spin' : ''} />
          </button>
        </div>
        <Card className="mt-3 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-amber/15">
            <AlertTriangle size={16} className="text-accent-amber" />
          </span>
          <div className="flex-1">
            <p className="text-sm text-neutral-900">
              {loadingBurnout ? 'Analyzing attendance, leave & ticket signals…' : burnout.replace(/^Risk:\s*\w+\s*—\s*/i, '')}
            </p>
            <p className="text-[11px] text-neutral-500">{aiConfigured ? 'Live · Gemini' : 'Local analysis · add a Gemini key for live AI'}</p>
          </div>
          {!loadingBurnout && <Badge tone={riskTone}>{riskLevel}</Badge>}
        </Card>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Weekly HR Report</h2>
          <button onClick={loadReport} disabled={loadingReport || !stats} className="flex items-center gap-1 text-[11px] font-medium text-accent-blue disabled:opacity-50">
            <Sparkles size={12} /> {loadingReport ? 'Generating…' : report ? 'Regenerate' : 'Generate'}
          </button>
        </div>
        <Card className="mt-3">
          {report ? (
            <p className="whitespace-pre-line text-sm text-neutral-500">{report}</p>
          ) : (
            <p className="text-sm text-neutral-500">Generate an AI summary of this week's attendance, leave and ticket signals for leadership — built from live company data, not a template.</p>
          )}
        </Card>

        {stats && (
          <Card className="mt-6 flex items-center gap-3">
            <Users size={16} className="text-neutral-400" />
            <p className="text-xs text-neutral-500">{stats.teamSize} employees · {stats.pendingLeave} leave requests awaiting review</p>
          </Card>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
