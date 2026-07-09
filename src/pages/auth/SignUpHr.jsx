import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, Copy, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { GoogleIcon } from './SignIn'
import { getMembership, getCompany } from '../../lib/companyStore'

export default function SignUpHr() {
  const { signUp, firebaseConfigured } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', companyName: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdCode, setCreatedCode] = useState(null)
  const [copied, setCopied] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) return setError("Passwords don't match.")
    if (form.password.length < 6) return setError('Password should be at least 6 characters.')
    if (!form.companyName.trim()) return setError('Enter your company name.')
    setLoading(true)
    try {
      const fbUser = await signUp({
        accountType: 'hr',
        name: form.name,
        email: form.email,
        password: form.password,
        remember: true,
        companyName: form.companyName,
      })
      const membership = await getMembership(fbUser.uid)
      const company = await getCompany(membership?.companyId)
      setCreatedCode(company?.joinCode || null)
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function copyCode() {
    navigator.clipboard?.writeText(createdCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (createdCode) {
    return (
      <div className="app-shell flex flex-col justify-center bg-white px-6 py-10">
        <div className="mb-2 text-center text-4xl">🎉</div>
        <h1 className="text-center text-2xl font-bold text-black">Company Created</h1>
        <p className="mt-1 text-center text-sm text-neutral-500">Share this code with your employees so they can join</p>

        <div className="mt-8 flex items-center justify-between rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-5 py-4">
          <span className="text-2xl font-bold tracking-[0.3em] text-black">{createdCode}</span>
          <button onClick={copyCode} className="rounded-full bg-neutral-900 p-2.5 text-white">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-neutral-400">
          You'll always find this again under Settings → Company in the HR app.
        </p>

        <button
          onClick={() => navigate('/app/home')}
          className="mt-8 w-full rounded-xl bg-black py-3.5 text-sm font-semibold text-white active:scale-[0.98]"
        >
          Continue to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="app-shell flex flex-col justify-center bg-white px-6 py-10">
      <Link to="/signup" className="mb-4 flex items-center gap-1 text-xs font-medium text-neutral-400">
        <ArrowLeft size={14} /> Back
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">Create HR / Admin Account</h1>
        <p className="mt-1 text-sm text-neutral-500">Set up your company's workspace</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full Name" value={form.name} onChange={(v) => set('name', v)} placeholder="Priyal Sharma" required />
        <Field label="Work Email" type="email" value={form.email} onChange={(v) => set('email', v)} placeholder="you@company.com" required />
        <Field label="Company Name" value={form.companyName} onChange={(v) => set('companyName', v)} placeholder="Acme Technologies" required />

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
