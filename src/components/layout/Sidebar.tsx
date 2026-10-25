import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  CalendarDays,
  ChartColumn,
  GraduationCap,
  Home,
  ListTodo,
  NotebookPen,
  Settings,
  Sparkles,
  Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

const NAV: {
  to: string
  label: string
  icon: typeof Home
  end?: boolean
}[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/timeline', label: 'Timeline', icon: ListTodo },
  { to: '/timeline', label: 'Calendar', icon: CalendarDays },
  { to: '/notes', label: 'Notes', icon: NotebookPen },
  { to: '/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/growth', label: 'Growth', icon: Sparkles },
  { to: '/study', label: 'Study', icon: Timer },
  { to: '/analytics', label: 'Analytics', icon: ChartColumn },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col border-r border-border/70 bg-card/80 px-3 py-5 backdrop-blur-sm',
        className,
      )}
    >
      <div className="mb-6 flex items-center gap-2.5 px-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-bold tracking-tight text-[var(--heading,#1E3A5F)] dark:text-foreground">
            StudentOS
          </p>
          <p className="text-[11px] text-muted-foreground">Plan. Focus. Achieve.</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={`${to}-${label}`}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="h-4.5 w-4.5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex items-center justify-between px-2 pt-4">
        <span className="text-xs text-muted-foreground">Theme</span>
        <ThemeToggle />
      </div>
    </aside>
  )
}
