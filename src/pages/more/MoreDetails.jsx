import { useEffect, useState, useRef } from 'react'
import { Download, FileText, CheckCircle2, Clock, Upload, Moon, Bell, Globe, Shield, Loader2, Receipt } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../lib/store'
import { uploadDocument } from '../../lib/cloudSync'
import { subscribePayslips } from '../../lib/companyStore'
import PageHeader from '../../components/PageHeader'
import { Card, Badge, DarkButton, Input, EmptyState, Skeleton } from '../../components/ui'
import BottomNav from '../../components/BottomNav'

export function Payslip() {
  const { companyId, user } = useAuth()
  const [payslips, setPayslips] = useState(null)

  useEffect(() => {
    if (!companyId || !user) return
    return subscribePayslips(companyId, { employeeId: user.uid }, setPayslips)
  }, [companyId, user])

  const latest = payslips?.[0]

  return (
    <div className="app-shell pb-24">
      <PageHeader title="Payslip" subtitle={latest?.month} />
      <div className="px-5">
        {payslips === null && <Skeleton className="h-40" />}
        {payslips !== null && latest && (
          <Card className="flex flex-col items-center py-8 !bg-black">
            <p className="text-xs text-neutral-400">Total in Hand</p>
            <p className="mt-1 text-3xl font-bold text-white">₹{latest.net.toLocaleString('en-IN')}</p>
            <button onClick={() => window.print()} className="mt-5 flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black hover:bg-neutral-200 transition-colors">
              <Download size={13} /> Download PDF
            </button>
          </Card>
        )}
        {payslips !== null && !latest && (
          <EmptyState icon={Receipt} title="No payslips yet" body="Your HR/Admin generates payroll each month — issued payslips will appear here instantly." />
        )}

        {payslips?.length > 1 && (
          <div className="print:hidden">
            <h2 className="mt-5 text-sm font-semibold text-neutral-900">History</h2>
            <div className="mt-3 space-y-2">
              {payslips.slice(1).map((p) => (
                <Card key={p.id} className="flex items-center justify-between !p-3">
                  <p className="text-sm text-neutral-900">{p.month}</p>
                  <span className="text-sm font-semibold text-neutral-900">₹{p.net.toLocaleString('en-IN')}</span>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="print:hidden">
        <BottomNav />
      </div>
    </div>
  )
}

export function Documents() {
  const { user } = useAuth()
  const [data, setData] = useState(db.get())
  const [progress, setProgress] = useState(null) // null = idle, 0-100 = uploading
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  // Stay in sync if Firestore pushes a remote update (e.g. verified by HR
  // from the web admin, or uploaded from another device).
  useState(() => db.onChange((next) => setData(next)))

  function pickFile() {
    setError('')
    fileInputRef.current?.click()
  }

  async function onFileChosen(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large — please keep uploads under 10MB.')
      return
    }
    setProgress(0)
    try {
      await uploadDocument(user?.uid, file, { onProgress: setProgress })
      setData(db.get())
    } catch (err) {
      console.error(err)
      setError('Upload failed. Check your connection and try again.')
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="app-shell pb-24">
      <PageHeader title="Documents" />
      <div className="px-5">
        <div className="space-y-2">
          {data.documents.map((d) => (
            <Card key={d.id} className="flex items-center gap-3 !p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
                <FileText size={16} className="text-neutral-500" />
              </span>
              <div className="flex-1">
                <p className="text-sm text-neutral-900">{d.name}</p>
                <p className="text-[11px] text-neutral-500">{d.category}</p>
              </div>
              {d.verified ? (
                <Badge tone="success"><CheckCircle2 size={11} className="mr-1 inline" />Verified</Badge>
              ) : (
                <Badge tone="warning"><Clock size={11} className="mr-1 inline" />Pending</Badge>
              )}
              {d.url && (
                <a href={d.url} target="_blank" rel="noreferrer" className="ml-1 text-neutral-500 hover:text-neutral-900">
                  <Download size={14} />
                </a>
              )}
            </Card>
          ))}
        </div>

        <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChosen} />

        <button
          onClick={pickFile}
          disabled={progress !== null}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {progress !== null ? (
            <><Loader2 size={16} className="animate-spin" /> Uploading… {progress}%</>
          ) : (
            <><Upload size={16} /> Upload Document</>
          )}
        </button>
        {error && <p className="mt-2 text-center text-xs text-accent-red">{error}</p>}
      </div>
      <BottomNav />
    </div>
  )
}

export function Profile() {
  const { user } = useAuth()
  const [data, setData] = useState(db.get())
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(data.profile)

  function save() {
    setData(db.update((d) => { d.profile = form; return d }))
    setEditing(false)
  }

  return (
    <div className="app-shell pb-24">
      <PageHeader title="Profile" right={
        <button onClick={() => (editing ? save() : setEditing(true))} className="text-xs font-semibold text-neutral-900">{editing ? 'Save' : 'Edit'}</button>
      } />
      <div className="px-5">
        <div className="flex flex-col items-center">
          <img src={user?.photoURL || form.avatar} alt="" className="h-24 w-24 rounded-full object-cover ring-2 ring-neutral-100" />
          <p className="mt-3 text-lg font-semibold text-neutral-900">{form.name}</p>
          <p className="text-xs text-neutral-500">{form.title} · {form.department}</p>
        </div>

        <div className="mt-6 space-y-3">
          <Field label="Full Name" value={form.name} editing={editing} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Email" value={form.email} editing={editing} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Phone" value={form.phone} editing={editing} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="Department" value={form.department} editing={editing} onChange={(v) => setForm({ ...form, department: v })} />
          <Field label="Manager" value={form.manager} editing={false} />
          <Field label="Joined" value={form.joined} editing={false} />
        </div>

        <h2 className="mt-6 text-sm font-semibold text-neutral-900">Skills</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {form.skills.map((s) => <Badge key={s}>{s}</Badge>)}
        </div>

        <h2 className="mt-6 text-sm font-semibold text-neutral-900">Emergency Contact</h2>
        <Card className="mt-2">
          <p className="text-sm text-neutral-900">{form.emergencyContact.name} ({form.emergencyContact.relation})</p>
          <p className="text-xs text-neutral-500">{form.emergencyContact.phone}</p>
        </Card>
      </div>
      <BottomNav />
    </div>
  )
}

function Field({ label, value, editing, onChange }) {
  return (
    <div>
      <span className="mb-1 block text-xs text-neutral-500">{label}</span>
      {editing && onChange ? (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-base-border bg-base-card px-4 py-2.5 text-sm text-neutral-900 outline-none" />
      ) : (
        <p className="text-sm text-neutral-900">{value}</p>
      )}
    </div>
  )
}

export function SettingsPage() {
  const [data, setData] = useState(db.get())
  const { logout } = useAuth()
  const { settings } = data

  function update(patch) {
    setData(db.update((d) => { d.settings = { ...d.settings, ...patch }; return d }))
  }

  return (
    <div className="app-shell pb-24">
      <PageHeader title="Settings" />
      <div className="px-5 space-y-3">
        <Row icon={Moon} label="Dark Mode" right={
          <Toggle checked={settings.darkMode} onChange={(v) => update({ darkMode: v })} />
        } />
        <Row icon={Globe} label="Language" right={<span className="text-sm text-neutral-400">{settings.language}</span>} />
        <Row icon={Bell} label="Push Notifications" right={
          <Toggle checked={settings.notifPrefs.push} onChange={(v) => update({ notifPrefs: { ...settings.notifPrefs, push: v } })} />
        } />
        <Row icon={Bell} label="Email Notifications" right={
          <Toggle checked={settings.notifPrefs.email} onChange={(v) => update({ notifPrefs: { ...settings.notifPrefs, email: v } })} />
        } />
        <Row icon={Shield} label="Two-Factor Security" right={<span className="text-xs text-accent-green">Enabled</span>} />

        <button onClick={logout} className="mt-4 w-full rounded-xl border border-accent-red/30 py-3 text-sm font-semibold text-accent-red">Logout</button>
      </div>
      <BottomNav />
    </div>
  )
}

function Row({ icon: Icon, label, right }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-base-border bg-base-card px-4 py-3.5">
      <div className="flex items-center gap-3">
        <Icon size={16} className="text-neutral-400" />
        <span className="text-sm text-neutral-900">{label}</span>
      </div>
      {right}
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className={`h-6 w-11 rounded-full p-0.5 transition ${checked ? 'bg-accent-green' : 'bg-neutral-100'}`}>
      <span className={`block h-5 w-5 rounded-full bg-neutral-900 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}
