import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"

type ButtonSize = "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg"

const buttonVariants = ({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant | null
  size?: ButtonSize | null
  className?: string
}) =>
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
    variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/90",
    variant === "outline" && "border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
    variant === "ghost" && "text-foreground hover:bg-accent hover:text-accent-foreground",
    variant === "link" && "h-auto px-0 py-0 text-primary underline-offset-4 hover:underline",
    size === "default" && "h-10 px-4 py-2",
    size === "sm" && "h-9 px-3",
    size === "lg" && "h-11 px-8",
    size === "icon" && "size-9",
    size === "icon-sm" && "size-8",
    size === "icon-lg" && "size-10",
    className,
  )

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const normalizedDisabled = disabled === true
  const normalizedClassName = cn(buttonVariants({ variant, size, className }), "cursor-pointer")

  if (asChild) {
    return (
      <Slot data-slot="button" className={normalizedClassName} {...props}>
        {children}
      </Slot>
    )
  }

  return (
    <button
      data-slot="button"
      type={props.type ?? "button"}
      disabled={normalizedDisabled}
      className={normalizedClassName}
      {...props}
    >
      {children}
    </button>
  )
}

export { Button, buttonVariants }
