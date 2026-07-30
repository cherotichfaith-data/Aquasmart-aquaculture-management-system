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
    variant === "positive" && "border-transparent bg-emerald-100 text-emerald-700",
    variant === "neutral" && "border-transparent bg-slate-100 text-slate-700",
    variant === "negative" && "border-transparent bg-red-100 text-red-700",
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
