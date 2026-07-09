import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Calendar, Clock, Receipt, LifeBuoy, TrendingUp, Grid3x3, Bell, CalendarClock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { subscribeLeaveRequests, subscribeNotifications } from '../../lib/companyStore'
import { Card } from '../../components/ui'
import BottomNav from '../../components/BottomNav'

const actions = [
  { label: 'Leave', icon: Calendar, to: '/app/leave', color: 'text-accent-blue', bg: 'bg-accent-blue/15' },
  { label: 'Attendance', icon: Clock, to: '/app/attendance', color: 'text-accent-green', bg: 'bg-accent-green/15' },
  { label: 'Payslip', icon: Receipt, to: '/app/payslip', color: 'text-accent-purple', bg: 'bg-accent-purple/15' },
  { label: 'Helpdesk', icon: LifeBuoy, to: '/app/helpdesk', color: 'text-accent-amber', bg: 'bg-accent-amber/15' },
  { label: 'Performance', icon: TrendingUp, to: '/app/performance', color: 'text-accent-red', bg: 'bg-accent-red/15' },
  { label: 'More', icon: Grid3x3, to: '/app/more', color: 'text-neutral-500', bg: 'bg-neutral-100' },
]

export default function Home() {
  const { user, companyId } = useAuth()
  const navigate = useNavigate()
  const name = (user?.displayName || user?.email || 'there').split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning!' : hour < 17 ? 'Good Afternoon!' : 'Good Evening!'

  const [myLeave, setMyLeave] = useState(null)
  const [unread, setUnread] = useState(null)

  useEffect(() => {
    if (!companyId || !user) return
    const u1 = subscribeLeaveRequests(companyId, { employeeId: user.uid }, setMyLeave)
    const u2 = subscribeNotifications(companyId, user.uid, setUnread)
    return () => { u1(); u2() }
  }, [companyId, user])

  const pending = (myLeave || []).filter((r) => r.status === 'Pending').length
  const unreadCount = (unread || []).filter((n) => !n.read).length

  return (
    <div className="app-shell pb-24">
      <div className="px-5 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Hi, {name} 👋</h1>
            <p className="text-sm text-neutral-500">{greeting}</p>
          </div>
          <button onClick={() => navigate('/app/profile')}>
            <img
              src={user?.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(user?.email || name)}`}
              alt=""
              className="h-11 w-11 rounded-full object-cover ring-2 ring-neutral-100"
            />
          </button>
        </div>

        <button
          onClick={() => navigate('/app/chat')}
          className="mt-5 flex w-full items-center gap-3 rounded-xl border border-base-border bg-base-card px-4 py-3 text-left"
        >
          <Search size={17} className="text-neutral-500" />
          <span className="text-sm text-neutral-500">Search or ask anything</span>
        </button>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {actions.map(({ label, icon: Icon, to, color, bg }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-base-border bg-base-card py-4"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
                <Icon size={19} className={color} />
              </span>
              <span className="text-xs font-medium text-neutral-500">{label}</span>
            </button>
          ))}
        </div>

        <button onClick={() => navigate('/app/leave/requests')} className="mt-5 block w-full text-left">
          <Card className="!bg-black">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-400">Leave Requests Awaiting Review</p>
                <p className="mt-1 text-sm font-semibold text-white">{myLeave === null ? 'Loading…' : `${pending} pending`}</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-black">
                <CalendarClock size={13} /> View
              </span>
            </div>
          </Card>
        </button>

        <button onClick={() => navigate('/app/notifications')} className="mt-3 block w-full text-left">
          <Card className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-neutral-400" />
              <p className="text-sm font-semibold text-neutral-900">Notifications</p>
            </div>
            <span className="text-xs text-neutral-500">{unread === null ? '…' : `${unreadCount} unread`}</span>
          </Card>
        </button>
      </div>
      <BottomNav />
    </div>
  )
}
