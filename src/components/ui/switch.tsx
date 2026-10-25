import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, ...props }, ref) => (
    <label
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center',
        props.disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <input
        type="checkbox"
        role="switch"
        aria-checked={!!checked}
        ref={ref}
        checked={checked}
        className="peer sr-only"
        {...props}
      />
      <span
        className={cn(
          'absolute inset-0 rounded-full bg-muted transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40',
          checked && 'bg-primary',
        )}
      />
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-5',
        )}
      />
    </label>
  ),
)
Switch.displayName = 'Switch'

export { Switch }
