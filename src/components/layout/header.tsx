"use client"

import { Bell, Droplets, Fish, FlaskConical, LogOut, Menu, PlusCircle, Settings } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/providers/auth-provider"
import FarmSelector from "@/components/shared/farm-selector"
import TimePeriodSelector, { type TimePeriod } from "@/components/shared/time-period-selector"
import { useSharedFilters } from "@/lib/hooks/app/use-shared-filters"
import type { SharedFiltersState } from "@/lib/hooks/app/use-shared-filters"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { useNotifications } from "@/components/notifications/notifications-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { resolveTimePeriod } from "@/lib/time-period"

const parseStageParam = (value: string | null): SharedFiltersState["selectedStage"] => {
  if (value === "nursing" || value === "grow_out") return value
  return "all"
}

export default function Header({
  onMenuClick,
}: {
  onMenuClick: () => void
}) {
  const { user, role, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [signingOut, setSigningOut] = useState(false)
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications()
  const { farm } = useActiveFarm()
  const hideBorder = pathname === "/water-quality" && searchParams.get("tab") === "depth"
  const showAddData = pathname === "/"
  const defaultPeriod: TimePeriod = (() => {
    if (pathname.startsWith("/feed") || pathname.startsWith("/sampling")) return "quarter"
    if (pathname.startsWith("/water-quality")) return "month"
    return "2 weeks"
  })()
  const sharedFilterInitialValues = useMemo<Partial<SharedFiltersState> | undefined>(() => {
    const hasFilterParams = ["system", "batch", "stage", "period"].some((key) => searchParams.get(key) != null)
    if (!hasFilterParams) return undefined

    return {
      selectedBatch: searchParams.get("batch") ?? "all",
      selectedSystem: searchParams.get("system") ?? "all",
      selectedStage: parseStageParam(searchParams.get("stage")),
      timePeriod: resolveTimePeriod(searchParams.get("period"), defaultPeriod),
    }
  }, [defaultPeriod, searchParams])
  const {
    selectedBatch,
    setSelectedBatch,
    selectedSystem,
    setSelectedSystem,
    selectedStage,
    setSelectedStage,
    timePeriod,
    setTimePeriod,
  } = useSharedFilters(defaultPeriod, sharedFilterInitialValues)
  const systemParam = selectedSystem !== "all" ? `&system=${selectedSystem}` : ""
  const batchParam = selectedBatch !== "all" ? `&batch=${selectedBatch}` : ""

  const replaceFilterParams = (next: {
    selectedBatch?: string
    selectedSystem?: string
    selectedStage?: SharedFiltersState["selectedStage"]
    timePeriod?: TimePeriod
  }) => {
    const params = new URLSearchParams(searchParams.toString())
    const nextBatch = next.selectedBatch ?? selectedBatch
    const nextSystem = next.selectedSystem ?? selectedSystem
    const nextStage = next.selectedStage ?? selectedStage
    const nextPeriod = next.timePeriod ?? timePeriod

    if (nextSystem !== "all") params.set("system", nextSystem)
    else params.delete("system")

    if (nextBatch !== "all") params.set("batch", nextBatch)
    else params.delete("batch")

    if (nextStage !== "all") params.set("stage", nextStage)
    else params.delete("stage")

    params.set("period", nextPeriod)

    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery === currentQuery) return
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }

  const handleBatchChange = (value: string) => {
    setSelectedBatch(value)
    replaceFilterParams({ selectedBatch: value })
  }

  const handleSystemChange = (value: string) => {
    setSelectedSystem(value)
    replaceFilterParams({ selectedSystem: value })
  }

  const handleStageChange = (value: SharedFiltersState["selectedStage"]) => {
    setSelectedStage(value)
    replaceFilterParams({ selectedStage: value })
  }

  const handleTimePeriodChange = (value: TimePeriod) => {
    setTimePeriod(value)
    replaceFilterParams({ timePeriod: value })
  }

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
    } catch {
      // Ignore and continue redirect flow.
    } finally {
      router.replace("/auth")
      if (typeof window !== "undefined") {
        window.location.href = "/auth"
      }
      setSigningOut(false)
    }
  }

  // Helper to format role name (e.g., "farm_manager" -> "Farm Manager")
  const formatRole = (r: string | null) => {
    if (!r) return "User"
    return r.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  return (
    <header className={`sticky top-0 z-20 bg-background/72 backdrop-blur-xl ${hideBorder ? "" : "border-b border-border/70"}`}>
      <div className="flex flex-col gap-4 px-4 py-4 md:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onMenuClick} className="rounded-xl border border-border/70 bg-card/80 p-2 transition-colors hover:bg-accent md:hidden">
              <Menu size={20} />
            </button>
            <div className="hidden md:block">
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-foreground">{farm?.name ?? "Aquasmart"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Role Badge */}
            {role && (
              <Badge
                variant="outline"
                className="hidden sm:flex capitalize bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary/70"
              >
                {formatRole(role)}
              </Badge>
            )}

            <ThemeToggle />

            {/* Notifications Dropdown */}
            <DropdownMenu onOpenChange={(open) => open && markAllRead()}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-10 w-10 rounded-2xl cursor-pointer border border-border/70 bg-card/80 text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 px-1 h-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  <span className="sr-only">Notifications</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-sm text-center text-muted-foreground">
                      <p>No New Notifications</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 p-2">
                      {notifications.map((note) => (
                        <button
                          key={note.id}
                          type="button"
                          onClick={() => markRead(note.id)}
                          className={`text-left rounded-md px-3 py-2 border ${
                            note.read ? "border-border/40" : "border-primary/50 bg-primary/5"
                          }`}
                        >
                          <p className="font-medium text-foreground">{note.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{note.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-2">
                            {new Date(note.createdAt).toLocaleString()}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer justify-center text-primary font-medium" onClick={clearAll}>
                  Clear notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-2xl cursor-pointer border border-border/70 bg-card/80 text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="/avatars/01.png" alt={user?.email || "User"} />
                    <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {user?.email && <p className="font-medium">{user.email}</p>}
                    {role && <p className="w-[200px] truncate text-xs text-muted-foreground">{formatRole(role)}</p>}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive cursor-pointer"
                  disabled={signingOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{signingOut ? "Logging out..." : "Log out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="page-toolbar">
          <div className="flex flex-wrap items-center gap-2">
            <TimePeriodSelector
              selectedPeriod={timePeriod}
              onPeriodChange={handleTimePeriodChange}
              variant="compact"
            />
            <FarmSelector
              selectedBatch={selectedBatch}
              selectedSystem={selectedSystem}
              selectedStage={selectedStage}
              onBatchChange={handleBatchChange}
              onSystemChange={handleSystemChange}
              onStageChange={handleStageChange}
              showStage
              showCounts={false}
              variant="compact"
            />
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
          {showAddData ? (
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-10 rounded-xl px-4 text-xs font-semibold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Data
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Quick Entry</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push(`/data-entry?type=feeding${systemParam}${batchParam}`)}
                  >
                    <Fish className="mr-2 h-4 w-4" />
                    Record Feeding
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push(`/data-entry?type=sampling${systemParam}${batchParam}`)}
                  >
                    <FlaskConical className="mr-2 h-4 w-4" />
                    Record Sampling
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push(`/data-entry?type=water_quality${systemParam}`)}
                  >
                    <Droplets className="mr-2 h-4 w-4" />
                    Record Water Quality
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/data-entry")}>
                    View All Entry Types
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
