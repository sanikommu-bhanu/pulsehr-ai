import { NavLink } from 'react-router-dom'
import { Home, LayoutGrid, MessageCircle, Users, MoreHorizontal, ClipboardCheck, Newspaper } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const employeeItems = [
  { to: '/app/home', icon: Home, label: 'Home' },
  { to: '/app/dashboard', icon: LayoutGrid, label: 'Dashboard' },
  { to: '/app/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/app/team', icon: Users, label: 'My Team' },
  { to: '/app/more', icon: MoreHorizontal, label: 'More' },
]

const adminItems = [
  { to: '/app/dash/hr', icon: Home, label: 'Home' },
  { to: '/app/team', icon: Users, label: 'Employees' },
  { to: '/app/dash/hr', icon: ClipboardCheck, label: 'Requests' },
  { to: '/app/feed', icon: Newspaper, label: 'Feed' },
  { to: '/app/more', icon: MoreHorizontal, label: 'More' },
]

export default function BottomNav() {
  const { role } = useAuth()
  const items = role === 'admin' ? adminItems : employeeItems

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-[480px] border-t border-base-border bg-white/90 backdrop-blur safe-bottom">
      <div className="flex items-center justify-between px-4 py-2">
        {items.map(({ to, icon: Icon, label }, i) => (
          <NavLink
            key={label + i}
            to={to}
            end={to === '/app/dash/hr'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-neutral-900' : 'text-neutral-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
