"use client"

import Image from "next/image"
import type React from "react"
import { useMemo, useState, useSyncExternalStore } from "react"
import { LayoutDashboard, LogOut, Settings } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { Avatar } from "@/components/app-ui/avatar"
import { Menu, MenuItem } from "@/components/app-ui/menu"
import { Separator } from "@/components/app-ui/separator"
import { SyncStatusBar } from "@/components/offline/sync-status-bar"
import { InstallBanner } from "@/components/pwa/install-banner"
import { DASHBOARD_ROOT } from "@/lib/app-entry"
import type { Database } from "@/lib/types/database"

type FarmRole = Database["public"]["Tables"]["farm_user"]["Row"]["role"] | null

/**
 * Minimal, mobile-first app shell for the Data Entry experience.
 *
 * Unlike DashboardLayout, this never mounts the desktop dashboard sidebar and
 * never applies the dashboard's md:ml-[offset] spacing — the goal is for
 * `/data-entry` to feel like its own small, focused app (in the spirit of
 * Farm360 / Aquanetix) rather than a page inside the full back-office
 * dashboard, especially when launched standalone from the home screen.
 */
export function DataEntryAppShell({
  children,
  initialFarmId,
  initialFarmName,
  farmRole,
  tabs,
}: {
  children: React.ReactNode
  initialFarmId?: string | null
  initialFarmName?: string | null
  farmRole?: FarmRole
  tabs?: React.ReactNode
}) {
  const { user, signOut } = useAuth()
  const { farm } = useActiveFarm({ initialFarmId, initialFarmName })
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<HTMLElement | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const farmName = farm?.name ?? initialFarmName ?? null
  const canReturnToDashboard = farmRole === "admin" || farmRole === "farm_manager"
  const canOpenSettings = farmRole === "admin" || farmRole === "farm_manager"

  // Auth state resolves client-side only, so the very first client render can
  // already have `user` populated while the server render never does. Gate
  // the initial-dependent bits behind a mounted flag so both the server HTML
  // and the client's first hydration pass agree, avoiding a hydration
  // mismatch on the avatar initial (same pattern as the dashboard Header).
  const hasMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const userInitial = useMemo(() => {
    if (!hasMounted) return ""
    const nameCandidate = [
      user?.user_metadata?.first_name,
      user?.user_metadata?.full_name,
      user?.user_metadata?.name,
      user?.email,
    ].find((value): value is string => typeof value === "string" && value.trim().length > 0)
    const firstToken = nameCandidate?.trim().split(/[\s@._-]+/).find(Boolean) ?? ""
    return firstToken.charAt(0).toUpperCase() || ""
  }, [hasMounted, user?.email, user?.user_metadata])

  const displayName = useMemo(() => {
    return (
      [user?.user_metadata?.full_name, user?.user_metadata?.name, user?.user_metadata?.first_name].find(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      ) ??
      user?.email ??
      null
    )
  }, [user?.email, user?.user_metadata])

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b-2 border-primary/20 bg-card">
        <div
          className="flex items-center justify-between gap-3 px-3.5 py-2 sm:px-5"
          style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Image
                src="/use this.png"
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 shrink-0 rounded-md"
                priority
              />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold text-foreground">AquaSmart</p>
              {farmName ? <p className="truncate text-[11px] font-medium text-primary">{farmName}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={(event) => setAccountMenuAnchor(event.currentTarget)}
            aria-label="Account"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-0.5 hover:bg-accent"
          >
            <Avatar className="size-8">{userInitial}</Avatar>
          </button>
        </div>
        {tabs}
        <SyncStatusBar />
      </header>

      <InstallBanner />

      <main className="flex-1 overflow-x-hidden pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="mx-auto w-full max-w-[1240px] px-1 pt-1.5 sm:px-4 md:pt-2 lg:px-5">{children}</div>
      </main>

      <Menu
        anchorEl={accountMenuAnchor}
        open={Boolean(accountMenuAnchor)}
        onClose={() => setAccountMenuAnchor(null)}
        className="mt-1 w-60"
      >
        <div className="px-4 py-3">
          <p className="text-sm font-bold">{displayName}</p>
          {user?.email && displayName !== user.email ? (
            <p className="mt-1 block text-xs text-muted-foreground">{user.email}</p>
          ) : null}
        </div>
        <Separator />
        {canReturnToDashboard ? (
          <MenuItem href={DASHBOARD_ROOT} onClick={() => setAccountMenuAnchor(null)}>
            <LayoutDashboard size={16} />
            Dashboard
          </MenuItem>
        ) : null}
        {canOpenSettings ? (
          <MenuItem href="/settings" onClick={() => setAccountMenuAnchor(null)}>
            <Settings size={16} />
            Settings
          </MenuItem>
        ) : null}
        <MenuItem
          onClick={async () => {
            setAccountMenuAnchor(null)
            await handleSignOut()
          }}
          disabled={signingOut}
          destructive
        >
          <LogOut size={16} />
          {signingOut ? "Logging out..." : "Log out"}
        </MenuItem>
      </Menu>
    </div>
  )
}
