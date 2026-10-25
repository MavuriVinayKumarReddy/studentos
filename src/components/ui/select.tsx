import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'ui-select flex h-10 w-full appearance-none rounded-xl border border-border bg-card px-3 py-2 pr-9 text-sm text-foreground shadow-sm transition-colors',
        'bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'dark:border-border dark:bg-card dark:text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

export { Select }
