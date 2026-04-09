"use client"

import { Bell, Droplets, Fish, FlaskConical, LogOut, Menu, PlusCircle, Settings } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/providers/auth-provider"
import FarmSelector from "@/components/shared/farm-selector"
import TimePeriodSelector, { type TimePeriod } from "@/components/shared/time-period-selector"
import { FilterPopover } from "@/components/shared/filter-popover"
import { useSharedFilters } from "@/lib/hooks/app/use-shared-filters"
import type { SharedFiltersState } from "@/lib/hooks/app/use-shared-filters"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { useEffect, useMemo, useState } from "react"
import { useNotifications } from "@/components/notifications/notifications-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { resolveTimePeriod } from "@/lib/time-period"
import {
  DEFAULT_WQ_PARAMETER,
  isWqParameter,
  parameterLabels,
  type WqParameter,
} from "@/app/water-quality/_lib/water-quality-utils"

type PageMeta = {
  title: string
  description?: string
}

const parseStageParam = (value: string | null): SharedFiltersState["selectedStage"] => {
  if (value === "nursing" || value === "grow_out") return value
  return "all"
}

const getPageMeta = (pathname: string, tab: string | null): PageMeta | null => {
  if (pathname === "/") {
    return {
      title: "Farm Performance Dashboard",
      description: "Live production, feed, water-quality, and activity signals across the farm.",
    }
  }
  if (pathname.startsWith("/feed")) {
    return {
      title: "Feed Performance Dashboard",
      description: "Feed efficiency, response quality, and inventory pressure across the selected scope.",
    }
  }
  if (pathname.startsWith("/sampling")) {
    return {
      title: "Growth Dashboard",
      description: "Growth sampling trends, biomass progress, and harvest-readiness indicators.",
    }
  }
  if (pathname.startsWith("/mortality")) {
    return {
      title: "Mortality Dashboard",
      description: "Risk signals, driver correlation, and recent loss events in one operational view.",
    }
  }
  if (pathname.startsWith("/water-quality")) {
    const tabDescriptions: Record<string, string> = {
      overview: "Farm-wide quality status, alerts, and system health at a glance.",
      parameter: "Parameter trends with feeding and mortality overlays for deeper analysis.",
      environment: "Environmental indicators and system-level water quality exposure.",
      depth: "Stratification and depth-profile analysis across the water column.",
      alerts: "Current risk conditions, emerging issues, and threshold-based alerts.",
      sensors: "Sensor coverage, freshness, and operational status by system.",
    }

    return {
      title: "Water Quality Dashboard",
      description: tabDescriptions[tab ?? "overview"] ?? tabDescriptions.overview,
    }
  }
  if (pathname.startsWith("/production")) {
    return {
      title: "Production Analysis",
      description: "System-level production trends with snapshot-safe reporting across the selected period.",
    }
  }
  if (pathname.startsWith("/reports")) {
    return {
      title: "Reports",
      description: "Exports, compliance, and period summaries without inferring fake production dates.",
    }
  }
  if (pathname.startsWith("/settings")) {
    return {
      title: "Settings",
      description: "Manage farm configuration, alert thresholds, and workspace preferences.",
    }
  }

  return null
}

export default function Header({
  onMenuClick,
  showToolbar = true,
}: {
  onMenuClick: () => void
  showToolbar?: boolean
}) {
  const { user, role, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [signingOut, setSigningOut] = useState(false)
  const [isCondensed, setIsCondensed] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications()
  const pageMeta = getPageMeta(pathname, searchParams.get("tab"))
  const showAddData = pathname === "/"
  const isWaterQualityPage = pathname.startsWith("/water-quality")
  const defaultPeriod: TimePeriod = (() => {
    if (pathname.startsWith("/feed") || pathname.startsWith("/sampling")) return "quarter"
    if (pathname.startsWith("/water-quality")) return "month"
    return "2 weeks"
  })()
  const selectedParameter =
    isWaterQualityPage && isWqParameter(searchParams.get("parameter"))
      ? (searchParams.get("parameter") as WqParameter)
      : DEFAULT_WQ_PARAMETER
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
  const waterQualityParameterOptions = useMemo(
    () =>
      Object.entries(parameterLabels).map(([key, label]) => ({
        value: key,
        label,
      })),
    [],
  )

  const replaceFilterParams = (next: {
    selectedBatch?: string
    selectedSystem?: string
    selectedStage?: SharedFiltersState["selectedStage"]
    timePeriod?: TimePeriod
    selectedParameter?: WqParameter
  }) => {
    const params = new URLSearchParams(searchParams.toString())
    const nextBatch = next.selectedBatch ?? selectedBatch
    const nextSystem = next.selectedSystem ?? selectedSystem
    const nextStage = next.selectedStage ?? selectedStage
    const nextPeriod = next.timePeriod ?? timePeriod
    const nextParameter = next.selectedParameter ?? selectedParameter

    if (nextSystem !== "all") params.set("system", nextSystem)
    else params.delete("system")

    if (nextBatch !== "all") params.set("batch", nextBatch)
    else params.delete("batch")

    if (nextStage !== "all") params.set("stage", nextStage)
    else params.delete("stage")

    params.set("period", nextPeriod)
    if (isWaterQualityPage) {
      if (nextParameter !== DEFAULT_WQ_PARAMETER) params.set("parameter", nextParameter)
      else params.delete("parameter")
    }

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

  const handleWaterQualityParameterChange = (value: string) => {
    if (!isWqParameter(value)) return
    replaceFilterParams({ selectedParameter: value as WqParameter })
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

  const userInitial = useMemo(() => {
    const nameCandidate = [
      user?.user_metadata?.first_name,
      user?.user_metadata?.full_name,
      user?.user_metadata?.name,
      user?.email,
    ].find((value): value is string => typeof value === "string" && value.trim().length > 0)

    const firstToken = nameCandidate?.trim().split(/[\s@._-]+/).find(Boolean) ?? ""
    return firstToken.charAt(0).toUpperCase() || "U"
  }, [user?.email, user?.user_metadata])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleScroll = () => {
      setIsCondensed(window.scrollY > 72)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return (
    <header className="sticky top-3 z-20 px-3 sm:px-4 md:px-6 lg:px-8">
      <div
        className={`rounded-[1.5rem] bg-background/78 shadow-[0_18px_44px_-30px_rgba(15,23,32,0.22)] backdrop-blur-xl transition-[border-radius,box-shadow,transform] duration-300 dark:shadow-[0_20px_54px_-34px_rgba(15,23,32,0.52)] ${
          isCondensed ? "translate-y-0 shadow-[0_16px_34px_-28px_rgba(15,23,32,0.18)]" : ""
        }`}
      >
      <div
        className={`flex flex-col transition-[gap,padding] duration-300 ${
          isCondensed
            ? "gap-2 px-4 py-3 sm:px-5 md:px-6"
            : "gap-2 px-3 py-3 sm:px-4 sm:py-3 md:px-6"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <button onClick={onMenuClick} className="rounded-xl bg-card/55 p-2 text-foreground/85 shadow-[0_12px_28px_-22px_rgba(15,23,32,0.45)] transition-colors hover:bg-accent/70 hover:text-accent-foreground md:hidden">
              <Menu size={20} />
            </button>
            {pageMeta ? (
              <h1
                className={`min-w-0 text-balance font-semibold leading-tight tracking-tight text-foreground transition-[font-size] duration-300 ${
                  isCondensed ? "text-lg sm:text-xl" : "text-xl sm:text-[1.85rem]"
                }`}
              >
                {pageMeta.title}
              </h1>
            ) : null}
          </div>

          <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2 self-start">
            {/* Role Badge */}
            {role && (
              <Badge
                variant="outline"
                className="hidden sm:flex capitalize border-transparent bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_14px_30px_-24px_rgba(15,23,32,0.35)]"
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
                  size="icon-lg"
                  className="topbar-control relative rounded-full p-0 hover:bg-accent/70 hover:text-accent-foreground"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute right-0 top-0 flex h-4 min-w-4 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  <span className="sr-only">Notifications</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[calc(100vw-1.5rem)] max-w-80 sm:w-80">
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
                  size="icon-lg"
                  className="topbar-control relative rounded-full p-0 hover:bg-accent/70 hover:text-accent-foreground"
                >
                  <Avatar className="size-full">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {userInitial}
                    </AvatarFallback>
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

        {showToolbar ? (
          <div className="page-toolbar overflow-visible border-0 bg-transparent px-0 py-0 shadow-none">
            <div className="flex w-full flex-col gap-2 md:hidden">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <TimePeriodSelector
                    selectedPeriod={timePeriod}
                    onPeriodChange={handleTimePeriodChange}
                    variant="compact"
                  />
                </div>
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="topbar-control h-10 shrink-0 rounded-lg px-3 text-sm font-medium"
                    >
                      Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="max-h-[85vh] rounded-t-[1.5rem] border-border/80 px-0">
                    <SheetHeader className="border-b border-border/70 px-4 pb-3">
                      <SheetTitle>Filters</SheetTitle>
                      <SheetDescription>Refine the current view.</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-3 overflow-y-auto px-4 py-4">
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
                        layout="grid"
                      />
                      {isWaterQualityPage ? (
                        <FilterPopover
                          label="Parameter"
                          value={selectedParameter}
                          options={waterQualityParameterOptions}
                          placeholder="Select parameter"
                          onChange={handleWaterQualityParameterChange}
                          triggerClassName="w-full"
                        />
                      ) : null}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              {showAddData ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="h-10 w-full rounded-lg px-4 text-sm font-semibold cursor-pointer bg-primary text-primary-foreground shadow-[0_16px_28px_-22px_rgba(34,197,94,0.4)] hover:bg-primary/90">
                      <PlusCircle className="mr-2 h-4 w-4" />
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
              ) : null}
            </div>

            <div className="hidden w-full items-center gap-2 md:flex">
              <div className="min-w-0 flex flex-1 flex-wrap items-center gap-2">
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
                  layout="row"
                />
                {isWaterQualityPage ? (
                  <FilterPopover
                    label="Parameter"
                    value={selectedParameter}
                    options={waterQualityParameterOptions}
                    placeholder="Select parameter"
                    onChange={handleWaterQualityParameterChange}
                    triggerClassName="w-[170px]"
                  />
                ) : null}
              </div>
              {showAddData ? (
                <div className="ml-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="h-10 rounded-lg px-4 text-sm font-semibold cursor-pointer bg-primary text-primary-foreground shadow-[0_16px_28px_-22px_rgba(34,197,94,0.4)] hover:bg-primary/90">
                        <PlusCircle className="mr-2 h-4 w-4" />
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
        ) : null}
      </div>
      </div>
    </header>
  )
}
