import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function PageHeader({ title, subtitle, right, back = true }) {
  const navigate = useNavigate()
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between bg-white/90 px-5 pb-3 pt-5 backdrop-blur safe-top">
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-base-card text-neutral-900"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
          {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}
