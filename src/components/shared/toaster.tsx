"use client"

import * as React from "react"
import Alert from "@mui/material/Alert"
import AlertTitle from "@mui/material/AlertTitle"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import Snackbar from "@mui/material/Snackbar"
import { X } from "lucide-react"
import { useToast } from "@/lib/hooks/app/use-toast"

function renderToastAction(action: React.ReactNode) {
  if (!React.isValidElement(action)) {
    return action ?? null
  }

  return action
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <>
      {toasts.map(({ id, title, description, action, open, onOpenChange, variant, duration }) => (
        <Snackbar
          key={id}
          open={open}
          autoHideDuration={duration ?? 5000}
          onClose={(_, reason) => {
            if (reason === "clickaway") return
            onOpenChange?.(false)
          }}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            variant="filled"
            severity={variant === "destructive" ? "error" : "info"}
            sx={{
              width: "100%",
              minWidth: { xs: 280, sm: 360 },
              alignItems: "flex-start",
              boxShadow: 6,
              "& .MuiAlert-action": {
                alignItems: "center",
                pt: 0.25,
              },
            }}
            action={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {renderToastAction(action)}
                <IconButton size="small" color="inherit" onClick={() => onOpenChange?.(false)}>
                  <X size={16} />
                  <span className="sr-only">Close</span>
                </IconButton>
              </Box>
            }
          >
            {title ? <AlertTitle>{title}</AlertTitle> : null}
            {description}
          </Alert>
        </Snackbar>
      ))}
    </>
  )
}
