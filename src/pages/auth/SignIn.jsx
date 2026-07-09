import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function SignIn() {
  const { signIn, signInGoogle, firebaseConfigured } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await signIn({ email, password, remember })
      navigate('/app/home')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      await signInGoogle()
      navigate('/app/home')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell flex flex-col justify-center bg-white px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Welcome Back 👋</h1>
        <p className="mt-1 text-sm text-neutral-500">Sign in to continue</p>
      </div>

      {!firebaseConfigured && (
        <div className="mb-4 rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
          Demo mode: Firebase isn't configured yet, so this uses a local mock sign-in. Add your keys to <code>.env</code> to enable real auth.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-500">Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-black outline-none focus:border-black"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-500">Password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 pr-11 text-sm text-black outline-none focus:border-black"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-neutral-600">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded accent-black" />
            Remember me
          </label>
          <Link to="/forgot-password" className="font-medium text-black">Forgot password?</Link>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-black py-3.5 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs text-neutral-400">or continue with</span>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-200 py-3 text-sm font-medium text-black"
      >
        <GoogleIcon /> Continue with Google
      </button>

      <p className="mt-8 text-center text-sm text-neutral-500">
        Don't have an account?{' '}
        <Link to="/signup" className="font-semibold text-black">Sign up</Link>
      </p>
    </div>
  )
}

function friendlyError(err) {
  const code = err?.code || ''
  if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
    return 'Incorrect email or password.'
  }
  if (code.includes('too-many-requests')) return 'Too many attempts. Please try again later.'
  return err?.message || 'Something went wrong. Please try again.'
}

export function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34.5 6 29.6 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.8 14.1-4.9l-6.5-5.5C29.6 35.6 26.9 36.5 24 36.5c-5.2 0-9.6-3.5-11.2-8.2l-6.6 5.1C9.6 39.6 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C41.5 36 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  )
}
