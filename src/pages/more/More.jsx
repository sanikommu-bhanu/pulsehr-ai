import { useNavigate } from 'react-router-dom'
import { Receipt, FileText, Ticket, User, Settings as SettingsIcon, LogOut, GraduationCap, ClipboardCheck, Award, MessageSquareText, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/PageHeader'
import BottomNav from '../../components/BottomNav'

const items = [
  { label: 'Payslip', icon: Receipt, to: '/app/payslip' },
  { label: 'Documents', icon: FileText, to: '/app/documents' },
  { label: 'Onboarding', icon: ClipboardCheck, to: '/app/onboarding' },
  { label: 'Training', icon: GraduationCap, to: '/app/training' },
  { label: 'Feedback', icon: MessageSquareText, to: '/app/performance/feedback' },
  { label: 'Helpdesk Tickets', icon: Ticket, to: '/app/helpdesk' },
  { label: 'Profile', icon: User, to: '/app/profile' },
  { label: 'Settings', icon: SettingsIcon, to: '/app/settings' },
]

export default function More() {
  const navigate = useNavigate()
  const { logout, role, user } = useAuth()

  return (
    <div className="app-shell pb-24">
      <PageHeader title="More" back={false} />
      <div className="px-5">
        <button onClick={() => navigate('/app/profile')} className="flex w-full items-center gap-3 rounded-2xl border border-base-border bg-base-card p-4">
          <img
            src={user?.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(user?.email || 'user')}`}
            alt=""
            className="h-12 w-12 rounded-full object-cover"
          />
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-neutral-900">{user?.displayName || user?.email}</p>
            <p className="text-xs text-neutral-500">{role === 'admin' ? 'HR / Admin' : 'Employee'}</p>
          </div>
          <Award size={16} className="text-accent-amber" />
        </button>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {items.map(({ label, icon: Icon, to }) => (
            <button key={label} onClick={() => navigate(to)} className="flex items-center gap-3 rounded-2xl border border-base-border bg-base-card p-4 text-left">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100">
                <Icon size={16} className="text-neutral-500" />
              </span>
              <span className="text-sm text-neutral-900">{label}</span>
            </button>
          ))}
        </div>

        {role === 'admin' && (
          <button onClick={() => navigate('/app/dash/hr')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-base-border py-3 text-sm font-semibold text-neutral-900">
            <ShieldCheck size={15} /> Open HR Dashboard
          </button>
        )}

        <button onClick={() => { logout(); navigate('/signin') }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-accent-red/30 py-3 text-sm font-semibold text-accent-red">
          <LogOut size={15} /> Logout
        </button>
      </div>
      <BottomNav />
    </div>
  )
}
