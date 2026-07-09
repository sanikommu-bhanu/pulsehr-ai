import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const slides = [
  {
    kind: 'brand',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=1000&fit=crop',
    title: 'PulseHR AI',
    subtitle: 'AI-Powered HR Operations & Employee Experience',
  },
  {
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=1000&fit=crop',
    title: 'Smarter HR Starts Here',
    subtitle: 'Automate tasks, empower employees and build a happier workplace.',
  },
  {
    image: 'https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=800&h=1000&fit=crop',
    title: 'One App for Everything HR',
    subtitle: 'Leave, attendance, onboarding, performance, helpdesk & more.',
  },
  {
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=1000&fit=crop',
    title: 'AI That Works For You',
    subtitle: 'Get instant answers, smart insights & automated recommendations.',
  },
]

export default function Onboarding() {
  const [i, setI] = useState(0)
  const navigate = useNavigate()
  const slide = slides[i]
  const isLast = i === slides.length - 1

  const next = () => (isLast ? navigate('/signin') : setI(i + 1))
  const skip = () => navigate('/signin')

  return (
    <div className="app-shell flex flex-col bg-white">
      <div className="relative h-[62vh] w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img
            key={slide.image}
            src={slide.image}
            alt=""
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="h-full w-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col justify-between px-6 pb-8 pt-2">
        <div>
          <motion.h2
            key={slide.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={slide.kind === 'brand' ? 'text-4xl font-extrabold tracking-tight text-black' : 'text-2xl font-bold text-black'}
          >
            {slide.title}
          </motion.h2>
          <motion.p
            key={slide.subtitle}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-2 text-sm leading-relaxed text-neutral-500"
          >
            {slide.subtitle}
          </motion.p>
        </div>

        {slide.kind === 'brand' ? (
          <button
            onClick={next}
            className="w-full rounded-xl bg-black py-3.5 text-sm font-semibold text-white active:scale-[0.98]"
          >
            Get Started
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <button onClick={skip} className="text-sm font-medium text-neutral-400">
              Skip
            </button>
            <div className="flex gap-1.5">
              {slides.slice(1).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === i - 1 ? 'w-5 bg-black' : 'w-1.5 bg-neutral-300'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="rounded-xl bg-black px-6 py-2.5 text-sm font-semibold text-white active:scale-[0.98]"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
