import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Newspaper, Bell, Search, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { subscribeEmployees } from '../../lib/companyStore'
import { Card, EmptyState, Skeleton } from '../../components/ui'
import BottomNav from '../../components/BottomNav'

export default function Team() {
  const navigate = useNavigate()
  const { companyId, user, role } = useAuth()
  const [employees, setEmployees] = useState(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!companyId) return
    return subscribeEmployees(companyId, setEmployees)
  }, [companyId])

  const filtered = useMemo(() => {
    const rows = (employees || []).filter((e) => e.uid !== user?.uid)
    if (!q.trim()) return rows
    const s = q.toLowerCase()
    return rows.filter((e) => e.name?.toLowerCase().includes(s) || e.department?.toLowerCase().includes(s) || e.title?.toLowerCase().includes(s))
  }, [employees, q, user])

  return (
    <div className="app-shell pb-24">
      <div className="px-5 pt-6">
        <h1 className="text-lg font-semibold text-neutral-900">My Team</h1>
        <p className="text-xs text-neutral-500">{employees === null ? 'Loading…' : `${employees.length} people in your company`}</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <ShortcutCard icon={Sparkles} label="AI Insights" onClick={() => navigate('/app/ai-insights')} />
          <ShortcutCard icon={Newspaper} label="Company Feed" onClick={() => navigate('/app/feed')} />
          <ShortcutCard icon={Bell} label="Notifications" onClick={() => navigate('/app/notifications')} />
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-xl border border-base-border bg-base-card px-3 py-2.5">
          <Search size={15} className="text-neutral-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, title or department" className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400" />
        </div>

        <h2 className="mt-5 text-sm font-semibold text-neutral-900">{role === 'admin' ? 'All Employees' : 'Colleagues'}</h2>
        <div className="mt-3 space-y-2">
          {employees === null && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          {employees !== null && filtered.map((m) => (
            <Card key={m.uid} className="flex items-center gap-3 !p-3">
              <img src={m.avatar} alt="" className="h-11 w-11 rounded-full object-cover bg-neutral-100" />
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-900">{m.name}</p>
                <p className="text-[11px] text-neutral-500">{m.title} · {m.department}</p>
              </div>
              {m.role === 'admin' && <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-white">HR</span>}
            </Card>
          ))}
          {employees !== null && filtered.length === 0 && (
            <EmptyState icon={Users} title="No one here yet" body="Once colleagues join with your company code, they'll show up here." />
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

function ShortcutCard({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 rounded-2xl border border-base-border bg-base-card py-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-purple/15">
        <Icon size={16} className="text-accent-purple" />
      </span>
      <span className="text-center text-[11px] font-medium leading-tight text-neutral-500">{label}</span>
    </button>
  )
}
