import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'

export function WelcomePage() {
  const navigate = useNavigate()
  const { enterDemo } = useAuth()

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#EDE9FE]">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, #C4B5FD 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 90% 80%, #DDD6FE 0%, transparent 50%)',
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold text-[#1E3A5F]">
            StudentOS
          </span>
        </div>
        <Link
          to="/auth"
          className="text-sm font-medium text-primary hover:underline"
        >
          Log in
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
        <p className="font-display text-5xl font-extrabold tracking-tight text-[#1E3A5F] sm:text-6xl">
          StudentOS
        </p>
        <p className="mt-3 text-lg font-medium text-[#4F46E5]/90">
          Plan. Focus. Achieve.
        </p>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
          Your personal academic OS — deadlines, notes, study sessions, and
          growth tracking in one calm place.
        </p>

        <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
          <Button
            size="lg"
            className="h-12 w-full rounded-2xl bg-[#4F46E5] text-base shadow-[0_12px_32px_rgba(79,70,229,0.35)]"
            onClick={() => {
              enterDemo()
              navigate('/')
            }}
          >
            Get Started
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 w-full rounded-2xl border-white/80 bg-white/70"
            onClick={() => navigate('/auth')}
          >
            Log in
          </Button>
        </div>
      </main>
    </div>
  )
}
