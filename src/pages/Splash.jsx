import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const SEEN_ONBOARDING_KEY = 'pulsehr_seen_onboarding'

export default function Splash() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  // Keep the premium logo reveal on screen for a minimum beat even on a
  // fast connection, so it never feels like a flash — but never longer than
  // necessary once auth state has actually resolved.
  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), 1400)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (loading || !minTimeElapsed) return
    if (user) {
      navigate('/app/home', { replace: true })
    } else if (localStorage.getItem(SEEN_ONBOARDING_KEY)) {
      navigate('/signin', { replace: true })
    } else {
      localStorage.setItem(SEEN_ONBOARDING_KEY, '1')
      navigate('/welcome', { replace: true })
    }
  }, [loading, minTimeElapsed, user, navigate])

  return (
    <div className="app-shell flex flex-col items-center justify-center bg-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center"
      >
        <motion.div
          initial={{ scale: 0.5, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-white to-neutral-300 shadow-[0_0_60px_rgba(255,255,255,0.15)]"
        >
          <Activity size={34} className="text-black" strokeWidth={2.5} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-5 text-2xl font-extrabold tracking-tight text-white"
        >
          PulseHR <span className="text-neutral-400">AI</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-1.5 text-xs tracking-wide text-neutral-500"
        >
          AI-Powered HR Operations
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-16 flex flex-col items-center gap-3"
      >
        <div className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full w-1/3 rounded-full bg-white"
            animate={{ x: ['-100%', '260%'] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <p className="text-[10px] uppercase tracking-widest text-neutral-600">Loading your workspace</p>
      </motion.div>
    </div>
  )
}
