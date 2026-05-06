"use client"

import * as React from "react"
import Drawer from "@mui/material/Drawer"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import Typography from "@mui/material/Typography"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type SheetSide = "top" | "right" | "bottom" | "left"

type SheetContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue | null>(null)

function useSheetContext() {
  const context = React.useContext(SheetContext)
  if (!context) {
    throw new Error("Sheet components must be used within <Sheet>")
  }
  return context
}

export function Sheet({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = controlledOpen != null
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) setUncontrolledOpen(nextOpen)
      onOpenChange?.(nextOpen)
    },
    [isControlled, onOpenChange],
  )

  return <SheetContext.Provider value={{ open, setOpen }}>{children}</SheetContext.Provider>
}

export function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  side?: SheetSide
}) {
  const { open, setOpen } = useSheetContext()

  return (
    <Drawer
      open={open}
      anchor={side}
      onClose={() => setOpen(false)}
      ModalProps={{ keepMounted: true }}
      slotProps={{
        paper: {
          className: cn(className),
          sx: {
            backgroundImage: "none",
            width: side === "left" || side === "right" ? { xs: "75vw", sm: 760 } : "100%",
            maxWidth: side === "left" || side === "right" ? "100%" : undefined,
            borderRadius: 0,
            borderColor: "divider",
          },
        },
      }}
    >
      <Box
        data-slot="sheet-content"
        sx={{ position: "relative", display: "flex", flexDirection: "column", minHeight: 0, height: "100%" }}
        {...props}
      >
        {children}
        <IconButton
          data-slot="sheet-close"
          size="small"
          onClick={() => setOpen(false)}
          sx={{ position: "absolute", top: 12, right: 12 }}
        >
          <X size={16} />
          <span className="sr-only">Close</span>
        </IconButton>
      </Box>
    </Drawer>
  )
}

export function SheetHeader({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <Box data-slot="sheet-header" className={cn(className)} sx={{ display: "flex", flexDirection: "column", gap: 0.75, p: 2 }} {...props} />
}

export function SheetFooter({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <Box data-slot="sheet-footer" className={cn(className)} sx={{ mt: "auto", display: "flex", flexDirection: "column", gap: 1, p: 2 }} {...props} />
}

export function SheetTitle({ className, ...props }: React.ComponentProps<typeof Typography>) {
  return <Typography data-slot="sheet-title" variant="h6" className={cn(className)} {...props} />
}

export function SheetDescription({ className, ...props }: React.ComponentProps<typeof Typography>) {
  return <Typography data-slot="sheet-description" variant="body2" color="text.secondary" className={cn(className)} {...props} />
}
