import { Bell, Search, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/hooks/useNotifications'
import { getGreeting } from '@/lib/dates'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
  showGreeting?: boolean
  onSearch?: () => void
  className?: string
}

export function Header({
  title,
  showGreeting = true,
  onSearch,
  className,
}: HeaderProps) {
  const { user, isGuest, isDemo } = useAuth()
  const { unreadCount } = useNotifications()
  const name =
    user?.user_metadata?.display_name ||
    user?.email?.split('@')[0] ||
    (isDemo || isGuest ? 'Alex' : 'there')

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/50 bg-[#F0F2F8]/85 px-4 py-3 backdrop-blur-md dark:bg-background/85',
        className,
      )}
    >
      <div className="min-w-0">
        {showGreeting ? (
          <>
            <p className="text-xs font-medium text-muted-foreground">
              {getGreeting()}
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight text-[var(--heading,#1E3A5F)] dark:text-foreground">
              {title ?? `Hi, ${name}`}
            </h1>
          </>
        ) : (
          <h1 className="truncate text-lg font-bold tracking-tight text-[var(--heading,#1E3A5F)] dark:text-foreground">
            {title}
          </h1>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Search"
          onClick={onSearch}
        >
          <Search className="h-5 w-5" />
        </Button>
        <Link
          to="/settings"
          aria-label="Notifications"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-muted"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
          ) : null}
        </Link>
        <Link
          to="/settings"
          aria-label="Profile"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <User className="h-4 w-4" />
          </span>
        </Link>
      </div>
    </header>
  )
}
