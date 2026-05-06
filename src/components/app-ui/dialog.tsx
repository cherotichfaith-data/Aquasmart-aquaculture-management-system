"use client"

import type React from "react"
import MuiDialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import IconButton from "@mui/material/IconButton"
import Typography from "@mui/material/Typography"
import { X } from "lucide-react"
import type { DialogProps } from "@mui/material/Dialog"

export interface DialogPropsCompat extends Omit<DialogProps, "title"> {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  showCloseButton?: boolean
  maxWidth?: DialogProps["maxWidth"]
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  actions,
  showCloseButton = true,
  maxWidth = "sm",
  children,
  ...rest
}: DialogPropsCompat) {
  return (
    <MuiDialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth {...rest}>
      {title && (
        <DialogTitle sx={{ pr: showCloseButton ? 6 : 2 }}>
          {title}
          {description && (
            <Typography variant="body2" sx={{ display: "block", opacity: 0.7, mt: "2px" }}>
              {description}
            </Typography>
          )}
          {showCloseButton && (
            <IconButton
              aria-label="close"
              onClick={onClose}
              size="small"
              sx={{ position: "absolute", right: 12, top: 12, color: "text.secondary" }}
            >
              <X size={16} />
            </IconButton>
          )}
        </DialogTitle>
      )}
      <DialogContent dividers={!!title}>{children}</DialogContent>
      {actions && <DialogActions sx={{ px: 3, pb: 2 }}>{actions}</DialogActions>}
    </MuiDialog>
  )
}
