import { useEffect, useState } from 'react'
import { CheckCircle2, Info, AlertTriangle, BellOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { subscribeNotifications, markNotificationRead } from '../../lib/companyStore'
import PageHeader from '../../components/PageHeader'
import { Card, EmptyState, Skeleton } from '../../components/ui'
import BottomNav from '../../components/BottomNav'

const tabs = ['All', 'Unread']
const iconFor = { success: CheckCircle2, info: Info, warning: AlertTriangle }
const colorFor = { success: 'text-accent-green', info: 'text-accent-blue', warning: 'text-accent-amber' }

function timeAgo(iso) {
  if (!iso) return ''
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.() ?? new Date()
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function Notifications() {
  const { companyId, user } = useAuth()
  const [tab, setTab] = useState('All')
  const [list, setList] = useState(null)

  useEffect(() => {
    if (!companyId || !user) return
    return subscribeNotifications(companyId, user.uid, setList)
  }, [companyId, user])

  const filtered = (list || []).filter((n) => tab === 'All' || !n.read)

  async function markAllRead() {
    await Promise.all((list || []).filter((n) => !n.read).map((n) => markNotificationRead(companyId, n.id)))
  }

  return (
    <div className="app-shell pb-24">
      <PageHeader
        title="Notifications"
        right={<button onClick={markAllRead} className="text-xs font-medium text-neutral-400">Mark all read</button>}
      />
      <div className="px-5">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${tab === t ? 'bg-neutral-900 text-white' : 'bg-base-card text-neutral-400'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {list === null && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          {list !== null && filtered.map((n) => {
            const Icon = iconFor[n.kind] || Info
            return (
              <Card
                key={n.id}
                className={`flex gap-3 !p-3 ${!n.read ? 'border-neutral-900/10' : ''}`}
                onClick={() => !n.read && markNotificationRead(companyId, n.id)}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                  <Icon size={16} className={colorFor[n.kind] || 'text-accent-blue'} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">{n.title}</p>
                  <p className="text-xs text-neutral-500">{n.body}</p>
                  <p className="mt-1 text-[10px] text-neutral-600">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-blue" />}
              </Card>
            )
          })}
          {list !== null && filtered.length === 0 && (
            <EmptyState icon={BellOff} title="Nothing here" body="You're all caught up." />
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
