import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "positive" | "neutral" | "negative"

const badgeVariants = ({
  variant = "default",
  className,
}: {
  variant?: BadgeVariant | null
  className?: string
}) =>
  cn(
    "inline-flex min-h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] [&>svg]:size-3 [&>svg]:pointer-events-none",
    variant === "default" && "border-transparent bg-primary text-primary-foreground",
    variant === "secondary" && "border-transparent bg-secondary text-secondary-foreground",
    variant === "destructive" && "border-transparent bg-destructive text-destructive-foreground",
    variant === "outline" && "border-border bg-background text-foreground",
    // positive/neutral/negative read off the app's semantic tokens (same
    // colors as alerts and KPI status) instead of one-off Tailwind hues, so
    // a brand color change updates badges automatically.
    variant === "positive" && "border-transparent bg-success/15 text-success",
    variant === "neutral" && "border-transparent bg-muted text-muted-foreground",
    variant === "negative" && "border-transparent bg-destructive/12 text-destructive",
    className,
  )

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: Omit<React.ComponentProps<"span">, "ref"> & {
  variant?: BadgeVariant
  asChild?: boolean
}) {
  if (asChild) {
    return <Slot data-slot="badge" className={badgeVariants({ variant, className })} {...props} />
  }

  return (
    <span
      data-slot="badge"
      className={badgeVariants({ variant, className })}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
