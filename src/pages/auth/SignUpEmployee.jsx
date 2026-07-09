import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { GoogleIcon } from './SignIn'

export default function SignUpEmployee() {
  const { signUp, firebaseConfigured } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', employeeId: '', department: '', joinCode: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) return setError("Passwords don't match.")
    if (form.password.length < 6) return setError('Password should be at least 6 characters.')
    if (!form.joinCode.trim()) return setError('Enter the company code your HR team shared with you.')
    setLoading(true)
    try {
      await signUp({
        accountType: 'employee',
        name: form.name,
        email: form.email,
        password: form.password,
        remember: true,
        joinCode: form.joinCode,
        title: form.employeeId ? `Employee ID ${form.employeeId}` : 'Employee',
        department: form.department || 'General',
      })
      navigate('/app/home')
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell flex flex-col justify-center bg-white px-6 py-10">
      <Link to="/signup" className="mb-4 flex items-center gap-1 text-xs font-medium text-neutral-400">
        <ArrowLeft size={14} /> Back
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">Create Employee Account</h1>
        <p className="mt-1 text-sm text-neutral-500">Join your company's workspace</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full Name" value={form.name} onChange={(v) => set('name', v)} placeholder="Vanessa Parker" required />
        <Field label="Work Email" type="email" value={form.email} onChange={(v) => set('email', v)} placeholder="you@company.com" required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employee ID (optional)" value={form.employeeId} onChange={(v) => set('employeeId', v)} placeholder="EMP-1042" />
          <Field label="Department" value={form.department} onChange={(v) => set('department', v)} placeholder="Design" />
        </div>
        <div>
          <Field
            label="Company Code"
            value={form.joinCode}
            onChange={(v) => set('joinCode', v.toUpperCase())}
            placeholder="e.g. K7M3QP"
            maxLength={8}
            required
            className="uppercase tracking-widest"
          />
          <p className="mt-1 text-[11px] text-neutral-400">Get this code from your HR/Admin — they see it right after they create the company.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-500">Password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              required
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 pr-11 text-sm text-black outline-none focus:border-black"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <Field label="Confirm Password" type={showPw ? 'text' : 'password'} value={form.confirm} onChange={(v) => set('confirm', v)} placeholder="••••••••" required />

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="w-full rounded-xl bg-black py-3.5 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-50">
          {loading ? 'Creating account…' : 'Sign Up'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs text-neutral-400">or continue with</span>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>
      <button disabled className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-200 py-3 text-sm font-medium text-neutral-300">
        <GoogleIcon /> Continue with Google
      </button>

      <p className="mt-8 text-center text-sm text-neutral-500">
        Already have an account?{' '}
        <Link to="/signin" className="font-semibold text-black">Sign in</Link>
      </p>
    </div>
  )
}

function Field({ label, value, onChange, className = '', ...props }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-neutral-500">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-black outline-none focus:border-black ${className}`}
        {...props}
      />
    </div>
  )
}
