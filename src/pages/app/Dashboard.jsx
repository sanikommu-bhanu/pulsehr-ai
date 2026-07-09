import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { checkIn, checkOut, subscribeAttendance, subscribeAttendanceHistory, subscribeLeaveRequests, subscribeNotifications } from '../../lib/companyStore'
import { Card } from '../../components/ui'
import BottomNav from '../../components/BottomNav'

const iconFor = { success: CheckCircle2, warning: AlertTriangle, info: Info }
const colorFor = { success: 'text-accent-green', warning: 'text-accent-amber', info: 'text-accent-blue' }

export default function Dashboard() {
  const navigate = useNavigate()
  const { companyId, user } = useAuth()
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const [todayRecord, setTodayRecord] = useState(null)
  const [history, setHistory] = useState(null)
  const [leave, setLeave] = useState(null)
  const [notifications, setNotifications] = useState(null)

  useEffect(() => {
    if (!companyId || !user) return
    const u1 = subscribeAttendance(companyId, { employeeId: user.uid, date: new Date().toISOString().slice(0, 10) }, (rows) => setTodayRecord(rows[0] || null))
    const u2 = subscribeAttendanceHistory(companyId, user.uid, setHistory)
    const u3 = subscribeLeaveRequests(companyId, { employeeId: user.uid }, setLeave)
    const u4 = subscribeNotifications(companyId, user.uid, setNotifications)
    return () => { u1(); u2(); u3(); u4() }
  }, [companyId, user])

  const pendingLeave = (leave || []).filter((r) => r.status === 'Pending').length
  const unread = (notifications || []).filter((n) => !n.read).length

  const weekPresent = useMemo(() => {
    if (!history) return null
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    return history.filter((h) => new Date(h.date) >= startOfWeek).length
  }, [history])

  async function toggleCheck() {
    if (!todayRecord) await checkIn(companyId, user.uid, user.displayName || user.email)
    else await checkOut(companyId, user.uid)
  }

  return (
    <div className="app-shell pb-24">
      <div className="px-5 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Dashboard</h1>
            <p className="text-xs text-neutral-500">Today, {today}</p>
          </div>
          <button onClick={() => navigate('/app/notifications')} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-base-card">
            <Bell size={17} className="text-neutral-500" />
            {unread > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent-red" />}
          </button>
        </div>

        <Card className="mt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-400">Today's Check-in</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{todayRecord?.checkIn || '—'}</p>
            </div>
            {todayRecord && !todayRecord.checkOut ? (
              <button onClick={toggleCheck} className="rounded-full bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white">Check Out</button>
            ) : (
              <button onClick={() => navigate('/app/attendance')} className="rounded-full border border-base-border px-5 py-2.5 text-xs font-semibold text-neutral-900">Check In</button>
            )}
          </div>
        </Card>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <Card>
            <p className="text-xs text-neutral-400">Leave</p>
            <p className="mt-1 text-lg font-bold text-neutral-900">{leave === null ? '…' : pendingLeave}</p>
            <p className="text-[10px] text-neutral-500">Pending</p>
          </Card>
          <Card>
            <p className="text-xs text-neutral-400">This Week</p>
            <p className="mt-1 text-lg font-bold text-neutral-900">{weekPresent === null ? '…' : weekPresent}</p>
            <p className="text-[10px] text-neutral-500">Days present</p>
          </Card>
          <Card>
            <p className="text-xs text-neutral-400">Alerts</p>
            <p className="mt-1 text-lg font-bold text-neutral-900">{notifications === null ? '…' : unread}</p>
            <p className="text-[10px] text-neutral-500">Unread</p>
          </Card>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Recent Activity</h2>
          <button onClick={() => navigate('/app/notifications')} className="text-xs font-medium text-neutral-400">See all</button>
        </div>
        <div className="mt-3 space-y-2">
          {notifications === null && <Card className="!p-3"><p className="text-xs text-neutral-400">Loading…</p></Card>}
          {notifications?.slice(0, 4).map((n) => {
            const Icon = iconFor[n.kind] || Info
            return (
              <Card key={n.id} className="flex items-center gap-3 !p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
                  <Icon size={16} className={colorFor[n.kind] || 'text-accent-blue'} />
                </span>
                <div className="flex-1">
                  <p className="text-sm text-neutral-900">{n.title}</p>
                  <p className="text-[11px] text-neutral-500">{n.body}</p>
                </div>
              </Card>
            )
          })}
          {notifications?.length === 0 && <p className="text-sm text-neutral-500">Nothing yet — activity shows up here as it happens.</p>}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
