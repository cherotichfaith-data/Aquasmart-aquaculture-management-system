"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AnchoredPopover } from "@/components/app-ui/popover"

export function Menu({
  anchorEl,
  open,
  onClose,
  align = "end",
  side = "bottom",
  className,
  dense = false,
  children,
}: {
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  align?: "start" | "end" | "center"
  side?: "bottom" | "top" | "right"
  className?: string
  dense?: boolean
  children: React.ReactNode
}) {
  return (
    <AnchoredPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      align={align}
      side={side}
      className={cn("min-w-[220px] overflow-hidden", dense ? "py-0.5" : "py-1.5", className)}
    >
      {children}
    </AnchoredPopover>
  )
}

type MenuItemBaseProps = {
  children: React.ReactNode
  className?: string
  selected?: boolean
  disabled?: boolean
  destructive?: boolean
  dense?: boolean
}

const menuItemClassName = ({ selected, disabled, destructive, dense, className }: MenuItemBaseProps) =>
  cn(
    "mx-1 flex w-[calc(100%-0.5rem)] cursor-pointer select-none items-center gap-2.5 rounded-md text-left text-sm transition-colors",
    dense ? "px-2.5 py-1.5 text-dense" : "px-3 py-2",
    destructive ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-accent hover:text-accent-foreground",
    selected && "bg-accent text-accent-foreground",
    disabled && "pointer-events-none opacity-50",
    className,
  )

export function MenuItem({
  onClick,
  href,
  ...props
}: MenuItemBaseProps & { onClick?: () => void; href?: string }) {
  if (href) {
    return (
      <Link href={href} onClick={onClick} className={menuItemClassName(props)}>
        {props.children}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} disabled={props.disabled} className={menuItemClassName(props)}>
      {props.children}
    </button>
  )
}
