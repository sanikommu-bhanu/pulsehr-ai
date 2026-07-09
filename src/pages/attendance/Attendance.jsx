import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, QrCode, ScanFace, X } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Scanner } from '@yudiel/react-qr-scanner'
import { useAuth } from '../../context/AuthContext'
import { checkIn, checkOut, subscribeAttendance, subscribeAttendanceHistory } from '../../lib/companyStore'
import PageHeader from '../../components/PageHeader'
import { Card, Badge, Skeleton } from '../../components/ui'
import BottomNav from '../../components/BottomNav'

function todayStr() { return new Date().toISOString().slice(0, 10) }

export function CheckIn() {
  const navigate = useNavigate()
  const { companyId, user } = useAuth()
  const [now, setNow] = useState(new Date())
  const [todayRecord, setTodayRecord] = useState(null)
  const [busy, setBusy] = useState(false)

  const [scanning, setScanning] = useState(null) // 'qr' | 'face' | null

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!companyId || !user) return
    return subscribeAttendance(companyId, { employeeId: user.uid, date: todayStr() }, (rows) => setTodayRecord(rows[0] || null))
  }, [companyId, user])

  async function toggle() {
    setBusy(true)
    try {
      if (!todayRecord) await checkIn(companyId, user.uid, user.displayName || user.email)
      else await checkOut(companyId, user.uid)
    } finally {
      setBusy(false)
    }
  }

  function simulateScan(type) {
    if (busy) return
    setScanning(type)
    if (type === 'face') {
      setTimeout(async () => {
        await toggle()
        setScanning(null)
      }, 2000)
    }
  }

  async function handleRealScan(detectedCodes) {
    if (busy || !detectedCodes || detectedCodes.length === 0) return
    // As soon as ANY QR code is detected, check them in
    setBusy(true)
    try {
      if (!todayRecord) await checkIn(companyId, user.uid, user.displayName || user.email)
      else await checkOut(companyId, user.uid)
    } finally {
      setBusy(false)
      setScanning(null)
    }
  }

  const checkedIn = Boolean(todayRecord && !todayRecord.checkOut)

  return (
    <div className="app-shell pb-24 relative">
      <PageHeader title="Check In" />
      <div className="px-5">
        <Card className="flex flex-col items-center py-8">
          <p className="text-2xl font-bold tabular-nums text-neutral-900">{now.toLocaleTimeString('en-US')}</p>
          <p className="mt-1 text-xs text-neutral-500">{now.toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
            <MapPin size={12} /> Office
          </div>

          <button
            onClick={toggle}
            disabled={busy || scanning !== null}
            className={`mt-8 flex h-32 w-32 items-center justify-center rounded-full text-sm font-semibold transition disabled:opacity-50 ${
              checkedIn ? 'bg-neutral-900 text-white pulse-ring' : 'border-2 border-base-border bg-base-card text-neutral-900'
            }`}
          >
            {busy && !scanning ? '…' : checkedIn ? 'Check Out' : '✓ Check In'}
          </button>
          <p className="mt-6 text-xs text-neutral-500">
            {todayRecord?.checkOut
              ? `Checked out at ${todayRecord.checkOut}`
              : checkedIn
                ? `Checked in at ${todayRecord.checkIn}`
                : 'You are eligible to check in'}
          </p>
        </Card>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={() => simulateScan('qr')} disabled={busy || scanning !== null} className="flex flex-col items-center gap-2 rounded-2xl border border-base-border bg-base-card py-5 transition hover:bg-neutral-50 disabled:opacity-50">
            <QrCode size={20} className={scanning === 'qr' ? 'text-accent-blue animate-pulse' : 'text-neutral-900'} />
            <span className="text-[11px] font-medium text-neutral-900">QR Check-in</span>
          </button>
          <button onClick={() => simulateScan('face')} disabled={busy || scanning !== null} className="flex flex-col items-center gap-2 rounded-2xl border border-base-border bg-base-card py-5 transition hover:bg-neutral-50 disabled:opacity-50">
            <ScanFace size={20} className={scanning === 'face' ? 'text-accent-blue animate-pulse' : 'text-neutral-900'} />
            <span className="text-[11px] font-medium text-neutral-900">Face Recognition</span>
          </button>
        </div>

        {/* Scanning Overlay */}
        {scanning && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
            <button onClick={() => setScanning(null)} className="absolute top-6 right-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
              <X size={24} />
            </button>
            
            {scanning === 'qr' ? (
              <div className="w-full max-w-[320px] overflow-hidden rounded-3xl border-4 border-accent-blue/30 bg-black">
                <Scanner onScan={handleRealScan} formats={['qr_code']} />
              </div>
            ) : (
              <div className="relative flex h-48 w-48 items-center justify-center rounded-3xl border-4 border-dashed border-accent-blue/30 bg-accent-blue/5">
                <div className="absolute top-0 h-1 w-full bg-accent-blue/50 shadow-[0_0_15px_rgba(37,99,235,0.5)] animate-[scan_1.5s_ease-in-out_infinite]" />
                <ScanFace size={64} className="text-accent-blue" />
              </div>
            )}
            
            <p className="mt-8 text-lg font-bold text-white animate-pulse">
              {scanning === 'qr' ? 'Point camera at Office QR Code' : 'Recognizing Face...'}
            </p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/app/attendance/history')} className="rounded-xl border border-base-border py-3 text-xs font-semibold text-neutral-900">
            Attendance History
          </button>
          <button onClick={() => navigate('/app/attendance/summary')} className="rounded-xl border border-base-border py-3 text-xs font-semibold text-neutral-900">
            Monthly Summary
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

const statusTone = { Present: 'success', Late: 'warning', Absent: 'danger' }

function useMyHistory() {
  const { companyId, user } = useAuth()
  const [history, setHistory] = useState(null)
  useEffect(() => {
    if (!companyId || !user) return
    return subscribeAttendanceHistory(companyId, user.uid, setHistory)
  }, [companyId, user])
  return history
}

export function AttendanceHistory() {
  const history = useMyHistory()

  return (
    <div className="app-shell pb-24">
      <PageHeader title="Attendance History" subtitle={new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} />
      <div className="px-5 space-y-2">
        {history === null && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        {history?.map((h) => (
          <Card key={h.id} className="flex items-center justify-between !p-3">
            <div>
              <p className="text-sm font-medium text-neutral-900">{new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              <p className="text-[11px] text-neutral-500">{h.checkIn}{h.checkOut ? ` – ${h.checkOut}` : ' – still checked in'} · {h.mode}</p>
            </div>
            <Badge tone={statusTone[h.status] || 'neutral'}>{h.status}</Badge>
          </Card>
        ))}
        {history?.length === 0 && <p className="mt-10 text-center text-sm text-neutral-500">No attendance recorded yet — check in from the Attendance tab to start your history.</p>}
      </div>
      <BottomNav />
    </div>
  )
}

export function MonthlySummary() {
  const history = useMyHistory()
  const now = new Date()

  const monthly = useMemo(() => {
    const rows = (history || []).filter((h) => {
      const d = new Date(h.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    return {
      present: rows.filter((r) => r.status === 'Present').length,
      late: rows.filter((r) => r.status === 'Late').length,
      absent: rows.filter((r) => r.status === 'Absent').length,
      wfh: rows.filter((r) => r.mode === 'Remote').length,
    }
  }, [history, now])

  const chartData = [
    { name: 'Present', value: monthly.present, color: '#22C55E' },
    { name: 'Late', value: monthly.late, color: '#F59E0B' },
    { name: 'Absent', value: monthly.absent, color: '#EF4444' },
    { name: 'WFH', value: monthly.wfh, color: '#8B5CF6' },
  ]
  const total = chartData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="app-shell pb-24">
      <PageHeader title="Monthly Summary" subtitle={now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} />
      <div className="px-5">
        <Card className="flex flex-col items-center py-6">
          <div className="relative h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={total ? chartData : [{ name: 'None', value: 1, color: '#E5E5E5' }]} dataKey="value" innerRadius={55} outerRadius={75} paddingAngle={3}>
                  {(total ? chartData : [{ color: '#E5E5E5' }]).map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold text-neutral-900">{monthly.present}</p>
              <p className="text-[10px] text-neutral-500">Present</p>
            </div>
          </div>
        </Card>

        <div className="mt-4 space-y-2">
          {chartData.map((d) => (
            <div key={d.name} className="flex items-center justify-between rounded-xl border border-base-border bg-base-card px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-sm text-neutral-500">{d.name}</span>
              </div>
              <span className="text-sm font-semibold text-neutral-900">{String(d.value).padStart(2, '0')}</span>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
