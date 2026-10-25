import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, ...props }, ref) => (
    <label
      className={cn(
        'relative inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center',
        props.disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        className="peer sr-only"
        {...props}
      />
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-md border border-border bg-card transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40',
          checked && 'border-primary bg-primary text-primary-foreground',
        )}
      >
        {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </span>
    </label>
  ),
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
