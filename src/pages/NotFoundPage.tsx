import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-6 text-center">
      <p className="font-display text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-2 text-xl font-bold text-[var(--navy)] dark:text-foreground">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        That route does not exist. Head home and keep planning.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Back home
      </Link>
    </div>
  )
}
