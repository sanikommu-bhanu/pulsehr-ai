import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell flex flex-col justify-center bg-white px-6 py-10">
      <h1 className="text-2xl font-bold text-black">Reset Password</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Enter your email and we'll send you a link to reset your password.
      </p>

      {sent ? (
        <div className="mt-8 rounded-xl bg-neutral-50 p-5 text-sm text-neutral-700">
          If an account exists for <span className="font-medium text-black">{email}</span>, a reset link is on its way.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-black outline-none focus:border-black"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black py-3.5 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>
      )}

      <Link to="/signin" className="mt-8 text-center text-sm font-semibold text-black">
        ← Back to Sign In
      </Link>
    </div>
  )
}
