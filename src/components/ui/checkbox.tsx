import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/utils/cn'

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer h-[18px] w-[18px] shrink-0 rounded-[5px] border border-[#c4c4cc] bg-white outline-none transition-colors data-[state=checked]:border-[var(--accent)] data-[state=checked]:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <Check className="h-3 w-3 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})
Checkbox.displayName = 'Checkbox'
