"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import { Dialog } from "@/components/app-ui/dialog"
import { SyncStatusBar } from "@/components/offline/sync-status-bar"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useActiveFarmRole } from "@/lib/hooks/use-active-farm-role"
import { canAccessDataEntry, DATA_ENTRY_PATH, toDashboardPath } from "@/lib/app-entry"
import Header from "./header"
import Sidebar, { DASHBOARD_SIDEBAR_COLLAPSED_WIDTH, DASHBOARD_SIDEBAR_WIDTH } from "./sidebar"

export default function DashboardLayout({
  children,
  hideHeader = false,
  showHeaderToolbar = true,
  initialFarmId,
  initialFarmName,
}: {
  children: React.ReactNode
  hideHeader?: boolean
  showHeaderToolbar?: boolean
  initialFarmId?: string | null
  initialFarmName?: string | null
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { farmId } = useActiveFarm({ initialFarmId, initialFarmName })
  const farmRoleQuery = useActiveFarmRole(farmId)
  const farmRole = (farmRoleQuery.data ?? null) as Parameters<typeof canAccessDataEntry>[0]
  const allowDataEntry = canAccessDataEntry(farmRole)

  useEffect(() => {
    if (typeof window === "undefined") return

    const storedCollapsed = window.localStorage.getItem("dashboard:sidebar-collapsed")

    const applyResponsiveSidebarState = () => {
      const isDesktop = window.innerWidth >= 768
      setSidebarOpen(isDesktop)

      if (storedCollapsed == null) {
        setSidebarCollapsed(window.innerWidth < 1280)
      }
    }

    if (storedCollapsed === "true") setSidebarCollapsed(true)
    if (storedCollapsed === "false") setSidebarCollapsed(false)

    applyResponsiveSidebarState()
    window.addEventListener("resize", applyResponsiveSidebarState)
    return () => window.removeEventListener("resize", applyResponsiveSidebarState)
  }, [])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
          return
        }
      }

      const isMeta = event.metaKey || event.ctrlKey
      if (!isMeta) return

      const key = event.key.toLowerCase()
      if (key === "k") {
        event.preventDefault()
        setCommandOpen(true)
        return
      }
      if (key === "n") {
        if (!allowDataEntry) return
        event.preventDefault()
        router.push(DATA_ENTRY_PATH)
        return
      }
      if (key === "f" && event.shiftKey) {
        if (!allowDataEntry) return
        event.preventDefault()
        router.push(`${DATA_ENTRY_PATH}?type=feeding`)
        return
      }
      if (key === "s" && event.shiftKey) {
        if (!allowDataEntry) return
        event.preventDefault()
        router.push(`${DATA_ENTRY_PATH}?type=sampling`)
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [allowDataEntry, router])

  useEffect(() => {
    setCommandOpen(false)
    setSidebarOpen((prev) => (typeof window !== "undefined" && window.innerWidth >= 768 ? prev : false))
  }, [pathname, searchParams])

  const desktopOffset = sidebarCollapsed ? DASHBOARD_SIDEBAR_COLLAPSED_WIDTH : DASHBOARD_SIDEBAR_WIDTH

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Sidebar
        initialFarmId={initialFarmId}
        initialFarmName={initialFarmName}
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarOpen((prev) => !prev)}
        onCollapseToggle={() =>
          setSidebarCollapsed((prev) => {
            const next = !prev
            if (typeof window !== "undefined") {
              window.localStorage.setItem("dashboard:sidebar-collapsed", String(next))
            }
            return next
          })
        }
      />
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          overflowX: "hidden",
          ml: { md: `${desktopOffset}px` },
          transition: (theme) =>
            theme.transitions.create("margin-left", {
              duration: theme.transitions.duration.standard,
            }),
        }}
        id="app-scroll-root"
      >
        {hideHeader ? (
          <SyncStatusBar />
        ) : (
          <>
            <Header
              initialFarmId={initialFarmId}
              initialFarmName={initialFarmName}
              onMenuClick={() => setSidebarOpen((prev) => !prev)}
              showToolbar={showHeaderToolbar}
            />
            <SyncStatusBar />
          </>
        )}
        <Box
          component="main"
          sx={{
            flex: 1,
            overflowX: "hidden",
            px: { xs: 0.75, sm: 1.5, md: 2, lg: 3 },
            pb: { xs: "calc(1.5rem + env(safe-area-inset-bottom))", md: 4 },
            pt: hideHeader ? { xs: 0.5, md: 0.75 } : showHeaderToolbar ? { xs: 0.5, md: 0.75 } : 0,
          }}
        >
          <Box sx={{ mx: "auto", width: "100%", maxWidth: 1640 }}>{children}</Box>
        </Box>
      </Box>
      <Dialog
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        title="Quick Actions"
        description="Jump straight to common tasks."
      >
        <Box sx={{ display: "grid", gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setCommandOpen(false)
              router.push(toDashboardPath("/"))
            }}
          >
            Go to Dashboard
          </Button>
          {allowDataEntry ? (
            <>
              <Button
                variant="outlined"
                onClick={() => {
                  setCommandOpen(false)
                  router.push(DATA_ENTRY_PATH)
                }}
              >
                New Data Entry
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setCommandOpen(false)
                  router.push(`${DATA_ENTRY_PATH}?type=feeding`)
                }}
              >
                Record Feeding
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setCommandOpen(false)
                  router.push(`${DATA_ENTRY_PATH}?type=sampling`)
                }}
              >
                Record Sampling
              </Button>
            </>
          ) : null}
          <Button
            variant="outlined"
            onClick={() => {
              setCommandOpen(false)
              router.push(toDashboardPath("/water-quality"))
            }}
          >
            Water Quality Dashboard
          </Button>
        </Box>
      </Dialog>
    </Box>
  )
}
