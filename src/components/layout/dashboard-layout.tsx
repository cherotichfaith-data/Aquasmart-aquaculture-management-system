"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState, type SetStateAction } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/app-ui/button"
import { Dialog } from "@/components/app-ui/dialog"
import { cn } from "@/lib/utils"
import { SyncStatusBar } from "@/components/offline/sync-status-bar"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useActiveFarmRole } from "@/lib/hooks/use-active-farm-role"
import { canAccessDataEntry, DATA_ENTRY_PATH, toDashboardPath } from "@/lib/app-entry"
import Header from "./header"
import Sidebar, { DASHBOARD_SIDEBAR_COLLAPSED_WIDTH, DASHBOARD_SIDEBAR_WIDTH } from "./sidebar"
import type { TimeBounds } from "@/lib/time-period"
import type { SystemOption } from "@/lib/system-options"
import type { Database } from "@/lib/types/database"

type BatchOption = Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number]
type HeaderDataOverrides = {
  role?: string | null
  systemOptions?: SystemOption[]
  batchOptions?: BatchOption[]
  timeBounds?: TimeBounds
}

export default function DashboardLayout({
  children,
  hideHeader = false,
  showHeaderToolbar = true,
  initialFarmId,
  initialFarmName,
  headerDataOverrides,
}: {
  children: React.ReactNode
  hideHeader?: boolean
  showHeaderToolbar?: boolean
  initialFarmId?: string | null
  initialFarmName?: string | null
  headerDataOverrides?: HeaderDataOverrides
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`
  const isDesktopViewport = typeof window !== "undefined" ? window.innerWidth >= 768 : true
  const defaultCollapsedPreference = (() => {
    if (typeof window === "undefined") return false
    const stored = window.localStorage.getItem("dashboard:sidebar-collapsed")
    if (stored === "true") return true
    if (stored === "false") return false
    return window.innerWidth < 1280
  })()
  const [isDesktop, setIsDesktop] = useState(isDesktopViewport)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(defaultCollapsedPreference)
  const routeToken = useMemo(() => Symbol(routeKey), [routeKey])
  const [mobileSidebarDraft, setMobileSidebarDraft] = useState(() => ({
    sourceToken: routeToken,
    value: false,
  }))
  const [commandDraft, setCommandDraft] = useState(() => ({
    sourceToken: routeToken,
    value: false,
  }))
  const setMobileSidebarOpen = useCallback((value: SetStateAction<boolean>) => {
    setMobileSidebarDraft((current) => {
      const previousValue = current.sourceToken === routeToken ? current.value : false
      const nextValue = typeof value === "function" ? value(previousValue) : value
      return {
        sourceToken: routeToken,
        value: nextValue,
      }
    })
  }, [routeToken])
  const setCommandOpen = useCallback((value: SetStateAction<boolean>) => {
    setCommandDraft((current) => {
      const previousValue = current.sourceToken === routeToken ? current.value : false
      const nextValue = typeof value === "function" ? value(previousValue) : value
      return {
        sourceToken: routeToken,
        value: nextValue,
      }
    })
  }, [routeToken])
  const commandOpen = commandDraft.sourceToken === routeToken ? commandDraft.value : false
  const mobileSidebarOpen = mobileSidebarDraft.sourceToken === routeToken ? mobileSidebarDraft.value : false
  const { farmId } = useActiveFarm({ initialFarmId, initialFarmName })
  const farmRoleQuery = useActiveFarmRole(headerDataOverrides?.role ? null : farmId)
  const farmRole = (headerDataOverrides?.role ?? farmRoleQuery.data ?? null) as Parameters<typeof canAccessDataEntry>[0]
  const allowDataEntry = canAccessDataEntry(farmRole)

  useEffect(() => {
    if (typeof window === "undefined") return
    const applyResponsiveSidebarState = () => {
      setIsDesktop(window.innerWidth >= 768)
    }
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
  }, [allowDataEntry, router, setCommandOpen])

  const desktopOffset = sidebarCollapsed ? DASHBOARD_SIDEBAR_COLLAPSED_WIDTH : DASHBOARD_SIDEBAR_WIDTH

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        initialFarmId={initialFarmId}
        initialFarmName={initialFarmName}
        roleOverride={headerDataOverrides?.role ?? null}
        open={mobileSidebarOpen}
        collapsed={sidebarCollapsed}
        onToggle={() => {
          if (!isDesktop) {
            setMobileSidebarOpen((prev) => !prev)
          }
        }}
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
      <div
        id="app-scroll-root"
        className="flex min-h-screen flex-col overflow-x-hidden transition-[margin-left] duration-300 md:ml-[var(--dashboard-offset)]"
        style={{ "--dashboard-offset": `${desktopOffset}px` } as React.CSSProperties}
      >
        {hideHeader ? (
          <SyncStatusBar />
        ) : (
          <>
            <Header
              initialFarmId={initialFarmId}
              initialFarmName={initialFarmName}
              roleOverride={headerDataOverrides?.role ?? null}
              systemOptionsOverride={headerDataOverrides?.systemOptions}
              batchOptionsOverride={headerDataOverrides?.batchOptions}
              timeBoundsOverride={headerDataOverrides?.timeBounds}
              onMenuClick={() => {
                if (!isDesktop) {
                  setMobileSidebarOpen((prev) => !prev)
                }
              }}
              showToolbar={showHeaderToolbar}
            />
            <SyncStatusBar />
          </>
        )}
        <main
          className={cn(
            "flex-1 overflow-x-hidden px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 md:px-8 md:pb-16 lg:px-12",
            hideHeader ? "pt-2 md:pt-3" : showHeaderToolbar ? "pt-2 md:pt-3" : "pt-0",
          )}
        >
          <div className="mx-auto w-full max-w-[1640px]">{children}</div>
        </main>
      </div>
      <Dialog
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        title="Quick Actions"
        description="Jump straight to common tasks."
      >
        <div className="grid gap-2">
          <Button
            variant="outline"
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
                variant="outline"
                onClick={() => {
                  setCommandOpen(false)
                  router.push(DATA_ENTRY_PATH)
                }}
              >
                New Data Entry
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCommandOpen(false)
                  router.push(`${DATA_ENTRY_PATH}?type=feeding`)
                }}
              >
                Record Feeding
              </Button>
              <Button
                variant="outline"
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
            variant="outline"
            onClick={() => {
              setCommandOpen(false)
              router.push(toDashboardPath("/water-quality"))
            }}
          >
            Water Quality Dashboard
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
