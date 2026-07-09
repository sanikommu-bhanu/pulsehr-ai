import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function VerifyEmail() {
  const { user, markVerified } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState(Array(6).fill(''))
  const [cooldown, setCooldown] = useState(30)
  const [error, setError] = useState('')
  const refs = useRef([])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  function handleChange(i, val) {
    if (!/^[0-9]?$/.test(val)) return
    const next = [...code]
    next[i] = val
    setCode(next)
    if (val && i < 5) refs.current[i + 1]?.focus()
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i - 1]?.focus()
  }

  function handleVerify() {
    if (code.join('').length < 6) {
      setError('Enter the full 6-digit code.')
      return
    }
    // Demo: any 6-digit code verifies. In real Firebase mode, the user verifies
    // via the emailed link and we just re-check auth state.
    markVerified()
    navigate('/app/home')
  }

  return (
    <div className="app-shell flex flex-col justify-center bg-white px-6 py-10">
      <h1 className="text-2xl font-bold text-black">Verify your email</h1>
      <p className="mt-2 text-sm text-neutral-500">
        We've sent a 6-digit code to <span className="font-medium text-black">{user?.email}</span>
      </p>

      <div className="mt-8 flex justify-between gap-2">
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            maxLength={1}
            inputMode="numeric"
            className="h-14 w-12 rounded-xl border border-neutral-200 bg-neutral-50 text-center text-lg font-semibold text-black outline-none focus:border-black"
          />
        ))}
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <button
        onClick={handleVerify}
        className="mt-8 w-full rounded-xl bg-black py-3.5 text-sm font-semibold text-white active:scale-[0.98]"
      >
        Verify Email
      </button>

      <button
        onClick={() => setCooldown(30)}
        disabled={cooldown > 0}
        className="mt-4 text-center text-sm font-medium text-neutral-400 disabled:opacity-60"
      >
        {cooldown > 0 ? `Resend code in 00:${String(cooldown).padStart(2, '0')}` : 'Resend code'}
      </button>
    </div>
  )
}
