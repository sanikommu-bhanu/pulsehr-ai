export function Card({ children, className = '', ...props }) {
  return (
    <div className={`rounded-2xl border border-base-border bg-base-card p-4 shadow-card ${className}`} {...props}>
      {children}
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-600',
    success: 'bg-accent-green/10 text-accent-green',
    warning: 'bg-accent-amber/10 text-accent-amber',
    danger: 'bg-accent-red/10 text-accent-red',
    info: 'bg-accent-blue/10 text-accent-blue',
  }
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

// Primary CTA — near-black "ink" button on the light canvas. Deliberately
// never blue, per the brand brief.
export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`w-full rounded-xl bg-neutral-900 py-3.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// Kept as an alias of the primary ink button for backward compatibility
// with existing pages that import DarkButton.
export function DarkButton({ children, className = '', ...props }) {
  return (
    <button
      className={`w-full rounded-xl bg-neutral-900 py-3.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function GhostButton({ children, className = '', ...props }) {
  return (
    <button
      className={`w-full rounded-xl border border-base-border bg-transparent py-3 text-sm font-medium text-neutral-900 transition active:scale-[0.98] hover:bg-neutral-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-border py-12 text-center">
      {Icon && <Icon size={28} className="text-neutral-300" />}
      <p className="text-sm font-medium text-neutral-900">{title}</p>
      {body && <p className="max-w-[220px] text-xs text-neutral-500">{body}</p>}
    </div>
  )
}

export function Input({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-neutral-500">{label}</span>}
      <input
        className={`w-full rounded-xl border border-base-border bg-base-card2 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900/40 ${className}`}
        {...props}
      />
    </label>
  )
}

// Skeleton loading block for premium perceived-performance while data loads.
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-100 ${className}`} />
}
