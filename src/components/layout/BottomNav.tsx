import { NavLink } from 'react-router-dom'
import { Home, ListTodo, NotebookPen, Plus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  onAdd?: () => void
  className?: string
}

const SIDE_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/timeline', label: 'Timeline', icon: ListTodo },
] as const

const RIGHT_ITEMS = [
  { to: '/notes', label: 'Notes', icon: NotebookPen },
  { to: '/growth', label: 'Growth', icon: Sparkles },
] as const

export function BottomNav({ onAdd, className }: BottomNavProps) {
  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden',
        className,
      )}
      aria-label="Primary"
    >
      <div className="relative mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {SIDE_ITEMS.map((item) => {
          const Icon = item.icon
          return (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : false}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 text-[11px] font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </NavLink>
          )
        })}

        <div className="relative flex w-16 shrink-0 justify-center">
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add task"
            className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(79,70,229,0.45)] ring-4 ring-[#F0F2F8] transition hover:scale-105 active:scale-95 dark:ring-background"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
        </div>

        {RIGHT_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 text-[11px] font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
