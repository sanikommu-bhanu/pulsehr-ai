import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { subscribeEmployees, issuePayslip, subscribePayslips } from '../../lib/companyStore'
import PageHeader from '../../components/PageHeader'
import { Card, DarkButton, Input } from '../../components/ui'
import BottomNav from '../../components/BottomNav'

export default function IssuePayslip() {
  const navigate = useNavigate()
  const { companyId } = useAuth()
  const [employees, setEmployees] = useState(null)
  const [recent, setRecent] = useState(null)
  const [form, setForm] = useState({ employeeId: '', month: '', gross: '', deductions: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!companyId) return
    const u1 = subscribeEmployees(companyId, setEmployees)
    const u2 = subscribePayslips(companyId, {}, setRecent)
    return () => { u1(); u2() }
  }, [companyId])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    const emp = (employees || []).find((x) => x.uid === form.employeeId)
    if (!emp) return
    setSubmitting(true)
    try {
      await issuePayslip(companyId, {
        employeeId: emp.uid, employeeName: emp.name, month: form.month,
        gross: Number(form.gross), deductions: Number(form.deductions || 0),
      })
      setForm({ employeeId: '', month: '', gross: '', deductions: '' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell pb-24">
      <PageHeader title="Issue Payslip" />
      <div className="px-5">
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-neutral-400">Employee</span>
            <select required value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} className="w-full rounded-xl border border-base-border bg-base-card px-4 py-3 text-sm text-neutral-900 outline-none">
              <option value="">Select employee</option>
              {employees?.map((e) => <option key={e.uid} value={e.uid}>{e.name}</option>)}
            </select>
          </label>
          <Input label="Month (e.g. July 2026)" required value={form.month} onChange={(e) => set('month', e.target.value)} />
          <Input label="Gross Pay (₹)" type="number" required value={form.gross} onChange={(e) => set('gross', e.target.value)} />
          <Input label="Deductions (₹)" type="number" value={form.deductions} onChange={(e) => set('deductions', e.target.value)} />
          <DarkButton type="submit" disabled={submitting} className="!bg-neutral-900 !text-white">
            {submitting ? 'Issuing…' : 'Issue Payslip'}
          </DarkButton>
        </form>

        <h2 className="mt-6 text-sm font-semibold text-neutral-900">Recently Issued</h2>
        <div className="mt-3 space-y-2">
          {recent?.slice(0, 8).map((p) => (
            <Card key={p.id} className="flex items-center justify-between !p-3">
              <div>
                <p className="text-sm text-neutral-900">{p.employeeName}</p>
                <p className="text-[11px] text-neutral-500">{p.month}</p>
              </div>
              <span className="text-sm font-semibold text-neutral-900">₹{p.net.toLocaleString('en-IN')}</span>
            </Card>
          ))}
          {recent?.length === 0 && <p className="text-sm text-neutral-500">Nothing issued yet.</p>}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
