import * as React from "react"
import MuiButton from "@mui/material/Button"
import type { ButtonProps as MuiButtonProps } from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"
import type { IconButtonProps } from "@mui/material/IconButton"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"
  | "contained"
  | "outlined"
  | "text"

type ButtonSize =
  | "default"
  | "sm"
  | "lg"
  | "icon"
  | "icon-sm"
  | "icon-lg"
  | "small"
  | "medium"
  | "large"

const buttonVariants = ({
  size = "default",
  className,
}: {
  size?: ButtonSize | null
  className?: string
}) =>
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none",
    size === "icon" && "size-9",
    size === "icon-sm" && "size-8",
    size === "icon-lg" && "size-10",
    className,
  )

type ButtonProps = Omit<MuiButtonProps, "variant" | "size" | "color"> & {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}

function resolveButtonVariant(variant: ButtonVariant | undefined): MuiButtonProps["variant"] {
  if (variant === "outline" || variant === "outlined") return "outlined"
  if (variant === "ghost" || variant === "link" || variant === "text") return "text"
  return "contained"
}

function resolveButtonColor(variant: ButtonVariant | undefined): MuiButtonProps["color"] {
  if (variant === "destructive") return "error"
  if (variant === "secondary") return "secondary"
  return "primary"
}

function resolveButtonSize(size: ButtonSize | undefined): MuiButtonProps["size"] {
  if (size === "sm" || size === "small") return "small"
  if (size === "lg" || size === "large") return "large"
  return "medium"
}

function resolveIconButtonSize(size: ButtonSize | undefined): IconButtonProps["size"] {
  if (size === "icon-sm" || size === "sm" || size === "small") return "small"
  if (size === "icon-lg" || size === "lg" || size === "large") return "large"
  return "medium"
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
  const normalizedClassName = cn(buttonVariants({ size, className }), "cursor-pointer")

  if (asChild) {
    return (
      <Slot data-slot="button" className={normalizedClassName} {...props}>
        {children}
      </Slot>
    )
  }

  const isIconOnly = size === "icon" || size === "icon-sm" || size === "icon-lg"

  if (isIconOnly) {
    const iconProps = props as Omit<IconButtonProps, "color" | "size">
    return (
      <IconButton
        data-slot="button"
        color={resolveButtonColor(variant)}
        size={resolveIconButtonSize(size)}
        disabled={normalizedDisabled}
        className={normalizedClassName}
        sx={{
          borderRadius: 1,
          color: variant === "ghost" ? "text.primary" : undefined,
          bgcolor: variant === "secondary" ? "secondary.main" : undefined,
          ...(variant === "outline" || variant === "outlined"
            ? {
                border: (theme) => `1px solid ${theme.palette.divider}`,
              }
            : null),
          ...iconProps.sx,
        }}
        {...iconProps}
      >
        {children}
      </IconButton>
    )
  }

  return (
    <MuiButton
      data-slot="button"
      color={resolveButtonColor(variant)}
      variant={resolveButtonVariant(variant)}
      size={resolveButtonSize(size)}
      disabled={normalizedDisabled}
      className={normalizedClassName}
      sx={{
        borderRadius: 1,
        textTransform: "none",
        boxShadow: "none",
        ...(variant === "link"
          ? {
              p: 0,
              minWidth: 0,
              textDecoration: "underline",
              textUnderlineOffset: "4px",
            }
          : null),
        ...(variant === "ghost"
          ? {
              color: "text.primary",
              "&:hover": {
                bgcolor: "action.hover",
              },
            }
          : null),
        ...props.sx,
      }}
      {...props}
    >
      {children}
    </MuiButton>
  )
}

export { Button, buttonVariants }
