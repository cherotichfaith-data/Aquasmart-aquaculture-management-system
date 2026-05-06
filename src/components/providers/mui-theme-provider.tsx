"use client"

import type React from "react"
import CssBaseline from "@mui/material/CssBaseline"
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles"
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter"
import { lightTheme } from "@/theme"

export function MuiProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <MuiThemeProvider theme={lightTheme}>
        <CssBaseline enableColorScheme />
        {children}
      </MuiThemeProvider>
    </AppRouterCacheProvider>
  )
}
