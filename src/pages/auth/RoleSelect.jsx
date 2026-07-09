import { Link } from 'react-router-dom'
import { User, ShieldCheck, ChevronRight } from 'lucide-react'

export default function RoleSelect() {
  return (
    <div className="app-shell flex flex-col justify-center bg-white px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Choose Your Role</h1>
        <p className="mt-1 text-sm text-neutral-500">Select how you want to continue</p>
      </div>

      <div className="space-y-4">
        <Link
          to="/signup/employee"
          className="flex items-center gap-4 rounded-2xl border border-neutral-200 p-4 transition active:scale-[0.98] hover:border-neutral-900"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white">
            <User size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-black">I'm an Employee</p>
            <p className="text-xs text-neutral-500">Access your profile, apply leave, track performance & more.</p>
          </div>
          <ChevronRight size={18} className="text-neutral-300" />
        </Link>

        <Link
          to="/signup/hr"
          className="flex items-center gap-4 rounded-2xl border border-neutral-200 p-4 transition active:scale-[0.98] hover:border-neutral-900"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white">
            <ShieldCheck size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-black">I'm HR / Admin</p>
            <p className="text-xs text-neutral-500">Manage employees, approvals, analytics & more.</p>
          </div>
          <ChevronRight size={18} className="text-neutral-300" />
        </Link>
      </div>

      <p className="mt-8 text-center text-sm text-neutral-500">
        Already have an account?{' '}
        <Link to="/signin" className="font-semibold text-black">Sign in</Link>
      </p>
    </div>
  )
}
