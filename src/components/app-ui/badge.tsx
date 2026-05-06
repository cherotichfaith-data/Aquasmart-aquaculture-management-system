import * as React from "react"
import Chip from "@mui/material/Chip"
import { alpha } from "@mui/material/styles"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

const badgeVariants = ({
  variant = "default",
  className,
}: {
  variant?: BadgeVariant | null
  className?: string
}) =>
  cn(
    "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-[color,box-shadow] overflow-hidden",
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
    <Chip
      data-slot="badge"
      size="small"
      label={props.children}
      className={badgeVariants({ variant, className })}
      sx={{
        height: 24,
        borderRadius: 1,
        borderColor: variant === "outline" ? "divider" : "transparent",
        bgcolor: variant === "default" ? "primary.main" : variant === "secondary" ? "secondary.main" : variant === "destructive" ? "error.main" : "transparent",
        color: variant === "default" ? "primary.contrastText" : variant === "secondary" ? "secondary.contrastText" : variant === "destructive" ? "error.contrastText" : "text.primary",
        "& .MuiChip-label": {
          px: 1,
          fontSize: "0.75rem",
          fontWeight: 600,
          lineHeight: 1.2,
        },
        ...(variant === "outline" && {
          "&:hover": {
            bgcolor: (theme) => alpha(theme.palette.action.hover, 0.9),
            color: "text.primary",
          },
        }),
      }}
      {...Object.fromEntries(Object.entries(props).filter(([key]) => key !== "children"))}
    />
  )
}

export { Badge, badgeVariants }
