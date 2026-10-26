import * as React from "react"
import { cn } from "@/lib/utils"

type InputProps = Omit<React.ComponentPropsWithoutRef<"input">, "color" | "size"> & {
  size?: number
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, inputMode, ...props }, ref) => {
    // Numeric fields default to a decimal keypad on mobile unless the caller
    // opts into something more specific (e.g. inputMode="numeric").
    const resolvedInputMode = inputMode ?? (type === "number" ? "decimal" : undefined)

    return (
      <input
        type={type}
        ref={ref}
        size={size}
        inputMode={resolvedInputMode}
        data-slot="input"
        className={cn(
          "flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className,
        )}
        {...props}
      />
    )
  },
)

Input.displayName = "Input"

export { Input }
