import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, PlayCircle } from 'lucide-react'
import { db } from '../../lib/store'
import PageHeader from '../../components/PageHeader'
import { Card, Badge } from '../../components/ui'
import BottomNav from '../../components/BottomNav'

export function OnboardingProgress() {
  const navigate = useNavigate()
  const [data, setData] = useState(db.get())
  const { onboarding, profile } = data

  function toggle(id) {
    setData(db.update((d) => {
      d.onboarding.checklist = d.onboarding.checklist.map((c) => c.id === id ? { ...c, done: !c.done } : c)
      const done = d.onboarding.checklist.filter((c) => c.done).length
      d.onboarding.progress = Math.round((done / d.onboarding.checklist.length) * 100)
      return d
    }))
  }

  return (
    <div className="app-shell pb-24">
      <PageHeader title="Onboarding Progress" subtitle={`${profile.title} · ${profile.department}`} />
      <div className="px-5">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-900">Overall Progress</p>
            <p className="text-sm font-bold text-neutral-900">{onboarding.progress}%</p>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-neutral-900" style={{ width: `${onboarding.progress}%` }} />
          </div>
          <p className="mt-3 text-xs text-neutral-500">Mentor: {onboarding.mentor}</p>
        </Card>

        <h2 className="mt-5 text-sm font-semibold text-neutral-900">Checklist</h2>
        <div className="mt-3 space-y-2">
          {onboarding.checklist.map((c) => (
            <button key={c.id} onClick={() => toggle(c.id)} className="flex w-full items-center gap-3 rounded-xl border border-base-border bg-base-card px-4 py-3">
              {c.done ? <CheckCircle2 size={18} className="text-accent-green" /> : <Circle size={18} className="text-neutral-600" />}
              <span className={`text-sm ${c.done ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>{c.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/app/tasks')} className="rounded-xl border border-base-border py-3 text-xs font-semibold text-neutral-900">My Tasks</button>
          <button onClick={() => navigate('/app/training')} className="rounded-xl border border-base-border py-3 text-xs font-semibold text-neutral-900">Training</button>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

const taskFilters = ['Pending', 'Completed']
const statusTone = { Pending: 'warning', 'In Progress': 'info', Completed: 'success' }

export function MyTasks() {
  const [filter, setFilter] = useState('Pending')
  const [data, setData] = useState(db.get())
  const list = data.tasks.filter((t) => filter === 'Completed' ? t.status === 'Completed' : t.status !== 'Completed')

  function complete(id) {
    setData(db.update((d) => { d.tasks = d.tasks.map((t) => t.id === id ? { ...t, status: 'Completed' } : t); return d }))
  }

  return (
    <div className="app-shell pb-24">
      <PageHeader title="My Tasks" />
      <div className="px-5">
        <div className="flex gap-2">
          {taskFilters.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${filter === f ? 'bg-neutral-900 text-white' : 'bg-base-card text-neutral-400'}`}>{f}</button>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {list.map((t) => (
            <Card key={t.id} className="flex items-center justify-between !p-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">{t.title}</p>
                <p className="text-[11px] text-neutral-500">Due {t.due} · {t.category}</p>
              </div>
              {t.status !== 'Completed' ? (
                <button onClick={() => complete(t.id)}><Badge tone={statusTone[t.status]}>{t.status}</Badge></button>
              ) : (
                <Badge tone={statusTone[t.status]}>{t.status}</Badge>
              )}
            </Card>
          ))}
          {list.length === 0 && <p className="mt-10 text-center text-sm text-neutral-500">Nothing here.</p>}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

export function Training() {
  const [data, setData] = useState(db.get())

  function markComplete(id) {
    setData(db.update((d) => { d.training = d.training.map((t) => t.id === id ? { ...t, status: 'Completed' } : t); return d }))
  }

  return (
    <div className="app-shell pb-24">
      <PageHeader title="Training" subtitle="Company onboarding courses" />
      <div className="px-5 space-y-2">
        {data.training.map((t) => (
          <Card key={t.id} className="flex items-center gap-3 !p-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-purple/15">
              <PlayCircle size={18} className="text-accent-purple" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-900">{t.title}</p>
              <p className="text-[11px] text-neutral-500">{t.duration}</p>
            </div>
            {t.status === 'Completed' ? (
              <Badge tone="success">Completed</Badge>
            ) : (
              <button onClick={() => markComplete(t.id)}><Badge tone={t.status === 'In Progress' ? 'info' : 'neutral'}>{t.status}</Badge></button>
            )}
          </Card>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
