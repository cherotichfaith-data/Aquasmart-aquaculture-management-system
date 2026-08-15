import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return <div ref={ref} data-slot="card" className={cn("rounded-xl border bg-card text-card-foreground shadow-none", className)} {...props} />
})

Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return <div ref={ref} data-slot="card-header" className={cn("grid items-start gap-1 px-4 py-4", className)} {...props} />
})

CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return <div ref={ref} data-slot="card-title" className={cn("text-base font-semibold leading-tight tracking-[-0.02em]", className)} {...props} />
})

CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} data-slot="card-description" className={cn("text-dense leading-6 text-muted-foreground", className)} {...props} />
  },
)

CardDescription.displayName = "CardDescription"

const CardAction = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return <div ref={ref} data-slot="card-action" className={cn("justify-self-end self-start", className)} {...props} />
})

CardAction.displayName = "CardAction"

const CardContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return <div ref={ref} data-slot="card-content" className={cn("px-4 pb-4", className)} {...props} />
})

CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return <div ref={ref} data-slot="card-footer" className={cn("flex items-center px-4 pb-4", className)} {...props} />
})

CardFooter.displayName = "CardFooter"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
