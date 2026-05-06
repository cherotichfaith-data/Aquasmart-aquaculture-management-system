import * as React from "react"
import MuiCard from "@mui/material/Card"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return (
    <MuiCard
      ref={ref}
      data-slot="card"
      variant="outlined"
      className={cn(className)}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        py: 1.5,
        color: "text.primary",
        boxShadow: "none",
      }}
      {...props}
    />
  )
})

Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return (
    <Box
      ref={ref}
      data-slot="card-header"
      className={cn(className)}
      sx={{
        display: "grid",
        gridTemplateRows: "auto auto",
        alignItems: "start",
        gap: 0.5,
        px: 2,
      }}
      {...props}
    />
  )
})

CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return (
    <Typography
      ref={ref}
      component="div"
      variant="h6"
      data-slot="card-title"
      className={cn(className)}
      sx={{ fontSize: "1.02rem", lineHeight: 1.2, fontWeight: 600, letterSpacing: "-0.02em" }}
      {...props}
    />
  )
})

CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <Typography
        ref={ref}
        component="div"
        variant="body2"
        data-slot="card-description"
        className={cn(className)}
        sx={{ color: "text.secondary", fontSize: "0.8125rem", lineHeight: 1.6 }}
        {...props}
      />
    )
  },
)

CardDescription.displayName = "CardDescription"

const CardAction = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return (
    <Box
      ref={ref}
      data-slot="card-action"
      className={cn(className)}
      sx={{ gridColumnStart: 2, gridRow: "1 / span 2", alignSelf: "start", justifySelf: "end" }}
      {...props}
    />
  )
})

CardAction.displayName = "CardAction"

const CardContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return <Box ref={ref} data-slot="card-content" className={cn(className)} sx={{ px: 2 }} {...props} />
})

CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return (
    <Box ref={ref} data-slot="card-footer" className={cn(className)} sx={{ display: "flex", alignItems: "center", px: 2 }} {...props} />
  )
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
