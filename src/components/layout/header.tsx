"use client"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type MouseEvent } from "react"
import {
  Bell,
  Droplets,
  Fish,
  FlaskConical,
  LogOut,
  Menu as MenuIcon,
  PlusCircle,
  Settings,
  X,
} from "lucide-react"
import { useNotifications } from "@/components/notifications/notifications-provider"
import { useAuth } from "@/components/providers/auth-provider"
import { getHeaderPageMeta, getHeaderPageTimeConfig } from "@/components/layout/header-config"
import { Avatar } from "@/components/app-ui/avatar"
import { Button } from "@/components/app-ui/button"
import { Menu, MenuItem } from "@/components/app-ui/menu"
import { Separator } from "@/components/app-ui/separator"
import { Sheet } from "@/components/app-ui/sheet"
import { Tooltip } from "@/components/app-ui/tooltip"
import { cn } from "@/lib/utils"
import FarmSelector from "@/components/shared/farm-selector"
import { createSystemLabelResolver, getSystemFilterUrlValue, resolveSystemIdFromFilterValue } from "@/lib/system-options"
import TimePeriodSelector, { type TimePeriod } from "@/components/shared/time-period-selector"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useSharedFilters } from "@/lib/hooks/app/use-shared-filters"
import type { SharedFiltersState } from "@/lib/hooks/app/use-shared-filters"
import { useTimePeriodBounds } from "@/lib/hooks/app/use-time-period-bounds"
import { canAccessDataEntry, DATA_ENTRY_PATH, stripDashboardPath, toDashboardPath } from "@/lib/app-entry"
import { useActiveFarmRole } from "@/lib/hooks/use-active-farm-role"
import { useBatchOptions, useSystemOptions } from "@/lib/hooks/use-options"
import { formatStableDateTime } from "@/lib/analytics-format"
import { formatGrowthStage, normalizeStageFilter } from "@/lib/stage-filter"
import {
  formatCustomRangeLabel,
  getAvailableTimePeriods,
  formatResolvedTimeWindow,
  parseCustomPeriodUrlValue,
  resolveTimePeriod,
  toCustomPeriodUrlValue,
  toTimePeriodUrlValue,
  type CustomTimeRange,
  type TimeBounds,
} from "@/lib/time-period"

const normalizeBatchDisplayLabel = (label: string | null | undefined) => {
  const trimmed = label?.trim() ?? ""
  if (!trimmed) return ""

  return trimmed
    .replace(/\s*\(\s*split\s+[^)]+\)$/i, "")
    .replace(/\s*[-/|]\s*split\s+.+$/i, "")
    .replace(/\s+split\s+.+$/i, "")
    .trim()
}

function FilterChip({
  label,
  onDelete,
}: {
  label: string
  onDelete: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-2.5 py-1 text-xs font-medium text-primary">
      {label}
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Remove ${label} filter`}
        className="inline-flex size-4 items-center justify-center rounded-full text-current hover:opacity-70"
      >
        <X size={12} />
      </button>
    </span>
  )
}

export default function Header({
  initialFarmId,
  initialFarmName,
  roleOverride,
  timeBoundsOverride,
  onMenuClick,
  showToolbar = true,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  roleOverride?: string | null
  timeBoundsOverride?: TimeBounds
  onMenuClick: () => void
  showToolbar?: boolean
}) {
  const { user, role, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const appPathname = stripDashboardPath(pathname)
  const searchParams = useSearchParams()
  const { farmId } = useActiveFarm({ initialFarmId, initialFarmName })
  const activeFarmRoleQuery = useActiveFarmRole(roleOverride ? null : farmId)
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications()
  const [signingOut, setSigningOut] = useState(false)
  const [isCondensed, setIsCondensed] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [notificationsAnchor, setNotificationsAnchor] = useState<HTMLElement | null>(null)
  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null)
  const [addDataAnchor, setAddDataAnchor] = useState<HTMLElement | null>(null)

  const pageMeta = getHeaderPageMeta(appPathname, searchParams.get("tab"))
  const pageTimeConfig = useMemo(() => getHeaderPageTimeConfig(appPathname), [appPathname])
  const resolvedRole = (roleOverride ?? activeFarmRoleQuery.data ?? role ?? null) as Parameters<typeof canAccessDataEntry>[0]
  const resolvedUser = user ?? null
  const resolvedUnreadCount = unreadCount ?? 0
  const canAccessSettings = resolvedRole === "admin" || resolvedRole === "farm_manager"
  const allowDataEntry = canAccessDataEntry(resolvedRole)
  // Available from every page the shared header renders on, not just the
  // dashboard -- logging a reading shouldn't require navigating back first.
  // Hidden below `md`: MobileQuickEntry (components/layout/mobile-quick-entry)
  // covers phones with a thumb-reach button instead of this header dropdown.
  const showAddData = allowDataEntry
  const defaultPeriod: TimePeriod = pageTimeConfig.defaultPeriod
  const batchesQuery = useBatchOptions(farmId ? { farmId } : undefined)
  const systemsQuery = useSystemOptions(
    farmId
      ? {
          farmId,
          activeOnly: appPathname.startsWith("/feed") ? false : true,
        }
      : undefined,
  )
  const allSystemsForChips = useMemo(
    () => (systemsQuery.data?.status === "success" ? systemsQuery.data.data : []),
    [systemsQuery.data],
  )
  const allBatchesForChips = useMemo(
    () => (batchesQuery.data?.status === "success" ? batchesQuery.data.data : []),
    [batchesQuery.data],
  )
  const rawPeriodParam = searchParams.get("date")

  const customTimeRange = useMemo(
    () => parseCustomPeriodUrlValue(rawPeriodParam),
    [rawPeriodParam],
  )

  const sharedFilterInitialValues = useMemo<Partial<SharedFiltersState> | undefined>(() => {
    const hasFilterParams = ["cage", "system", "batch", "stage", "date"].some((key) => searchParams.get(key) != null)
    if (!hasFilterParams) return undefined
    const cageParam = searchParams.get("cage") ?? searchParams.get("system")
    const selectedSystemId = resolveSystemIdFromFilterValue(cageParam, allSystemsForChips)

    return {
      selectedBatch: searchParams.get("batch") ?? "all",
      selectedSystem: selectedSystemId != null ? String(selectedSystemId) : cageParam ?? "all",
      selectedStage: normalizeStageFilter(searchParams.get("stage")),
      timePeriod: resolveTimePeriod(rawPeriodParam, defaultPeriod),
    }
  }, [allSystemsForChips, defaultPeriod, rawPeriodParam, searchParams])

  const {
    selectedBatch,
    setSelectedBatch,
    selectedSystem,
    setSelectedSystem,
    selectedStage,
    setSelectedStage,
    timePeriod,
    setTimePeriod,
  } = useSharedFilters(defaultPeriod, sharedFilterInitialValues, {
    urlValues:
      sharedFilterInitialValues?.selectedSystem && sharedFilterInitialValues.selectedSystem !== "all"
        ? {
            selectedSystem:
              getSystemFilterUrlValue(
                allSystemsForChips.find((item) => String(item.id) === sharedFilterInitialValues.selectedSystem),
              ) ?? sharedFilterInitialValues.selectedSystem,
            timePeriod: customTimeRange
              ? toCustomPeriodUrlValue(customTimeRange)
              : toTimePeriodUrlValue(sharedFilterInitialValues.timePeriod ?? defaultPeriod),
          }
        : {
            timePeriod: customTimeRange
              ? toCustomPeriodUrlValue(customTimeRange)
              : toTimePeriodUrlValue(sharedFilterInitialValues?.timePeriod ?? defaultPeriod),
          },
  })

  const systemParam = selectedSystem !== "all" ? `&system=${selectedSystem}` : ""
  const batchParam = selectedBatch !== "all" ? `&batch=${selectedBatch}` : ""
  const selectedSystemId = useMemo(
    () => resolveSystemIdFromFilterValue(selectedSystem, allSystemsForChips),
    [allSystemsForChips, selectedSystem],
  )
  const selectedBatchId = useMemo(
    () => (selectedBatch !== "all" && Number.isFinite(Number(selectedBatch)) ? Number(selectedBatch) : undefined),
    [selectedBatch],
  )
  const timeWindowBoundsQuery = useTimePeriodBounds({
    farmId,
    timePeriod,
    customRange: customTimeRange,
    systemId: pageTimeConfig.useSystemBounds ? selectedSystemId : undefined,
    batchId: selectedBatchId,
    scope: pageTimeConfig.scope,
    enabled: showToolbar && !timeBoundsOverride,
  })
  const resolvedTimeBounds = timeBoundsOverride ?? timeWindowBoundsQuery.data
  const timeWindowSummary = useMemo(
    () =>
      customTimeRange
        ? `${formatCustomRangeLabel(customTimeRange)} (Custom)`
        : formatResolvedTimeWindow(timePeriod, resolvedTimeBounds.start, resolvedTimeBounds.end),
    [customTimeRange, resolvedTimeBounds.end, resolvedTimeBounds.start, timePeriod],
  )

  const selectedBatchAgeDays = useMemo(() => {
    if (selectedBatch === "all") return null
    const match = allBatchesForChips.find((item) => String(item.id) === selectedBatch)
    if (!match) return null
    const deliveryDate = match.date_of_delivery
    if (!deliveryDate) return null
    const [year, month, day] = deliveryDate.split("-").map(Number)
    if (!year || !month || !day) return null
    const deliveryUtc = Date.UTC(year, month - 1, day)
    const now = new Date()
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    return Math.max(Math.floor((todayUtc - deliveryUtc) / 86_400_000) + 1, 1)
  }, [allBatchesForChips, selectedBatch])

  const timePeriodOptions = useMemo(() => {
    return getAvailableTimePeriods(selectedBatchAgeDays)
  }, [selectedBatchAgeDays])

  const activeSystemLabel = useMemo(() => {
    if (selectedSystem === "all") return null
    return createSystemLabelResolver(allSystemsForChips)(Number(selectedSystem))
  }, [allSystemsForChips, selectedSystem])

  const activeBatchLabel = useMemo(() => {
    if (!pageTimeConfig.showBatchFilter) return null
    if (selectedBatch === "all") return null
    const batch = allBatchesForChips.find((item) => String(item.id) === selectedBatch)
    const label = batch?.label ?? null
    return normalizeBatchDisplayLabel(label) || label || null
  }, [allBatchesForChips, pageTimeConfig.showBatchFilter, selectedBatch])

  const activeStageLabel = useMemo(() => {
    if (!pageTimeConfig.showStageFilter) return null
    if (selectedStage === "all") return null
    return formatGrowthStage(selectedStage)
  }, [pageTimeConfig.showStageFilter, selectedStage])

  const activeFilterCount = [activeSystemLabel, activeBatchLabel, activeStageLabel].filter(
    Boolean,
  ).length
  const hasActiveFilters = activeFilterCount > 0

  const replaceFilterParams = useCallback((next: {
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

    if (nextSystem !== "all") {
      const system = allSystemsForChips.find((item) => String(item.id) === nextSystem)
      params.set("system", getSystemFilterUrlValue(system) || nextSystem)
      params.delete("cage")
    } else {
      params.delete("cage")
      params.delete("system")
    }

    if (nextBatch !== "all") params.set("batch", nextBatch)
    else params.delete("batch")

    if (nextStage !== "all") params.set("stage", nextStage)
    else params.delete("stage")

    if (next.timePeriod == null && customTimeRange) {
      const customValue = toCustomPeriodUrlValue(customTimeRange)
      params.set("date", customValue)
    } else {
      const nextPeriodValue = toTimePeriodUrlValue(nextPeriod)
      params.set("date", nextPeriodValue)
    }

    const nextQuery = params.toString()
    if (nextQuery === searchParams.toString()) return
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }, [
    allSystemsForChips,
    customTimeRange,
    pathname,
    router,
    searchParams,
    selectedBatch,
    selectedStage,
    selectedSystem,
    timePeriod,
  ])

  const handleBatchChange = useCallback((value: string) => {
    setSelectedBatch(value)
    replaceFilterParams({ selectedBatch: value })
  }, [replaceFilterParams, setSelectedBatch])

  const handleSystemChange = useCallback((value: string) => {
    setSelectedSystem(value)
    replaceFilterParams({ selectedSystem: value })
  }, [replaceFilterParams, setSelectedSystem])

  const handleStageChange = useCallback((value: SharedFiltersState["selectedStage"]) => {
    setSelectedStage(value)
    replaceFilterParams({ selectedStage: value })
  }, [replaceFilterParams, setSelectedStage])

  const handleTimePeriodChange = useCallback((value: TimePeriod) => {
    setTimePeriod(value)
    replaceFilterParams({ timePeriod: value })
  }, [replaceFilterParams, setTimePeriod])

  const handleCustomRangeChange = useCallback(
    (range: CustomTimeRange) => {
      const params = new URLSearchParams(searchParams.toString())
      const customValue = toCustomPeriodUrlValue(range)
      params.set("date", customValue)
      const nextQuery = params.toString()
      if (nextQuery === searchParams.toString()) return
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
    },
    [pathname, router, searchParams],
  )

  useEffect(() => {
    if (!timePeriodOptions?.length || timePeriodOptions.includes(timePeriod)) return
    const nextPeriod = timePeriodOptions.includes("all history") ? "all history" : timePeriodOptions[0]
    if (!nextPeriod) return
    handleTimePeriodChange(nextPeriod)
  }, [handleTimePeriodChange, timePeriod, timePeriodOptions])

  useEffect(() => {
    if (pageTimeConfig.showBatchFilter || selectedBatch === "all") return
    handleBatchChange("all")
  }, [handleBatchChange, pageTimeConfig.showBatchFilter, selectedBatch])

  useEffect(() => {
    if (pageTimeConfig.showStageFilter || selectedStage === "all") return
    handleStageChange("all")
  }, [handleStageChange, pageTimeConfig.showStageFilter, selectedStage])

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  const formatRole = (value: string | null) => {
    if (!value) return ""
    return value
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  // Auth state resolves client-side only (see AuthProvider), so the very first
  // client render can already have `user` populated while the server render
  // never does. Gate the initial-dependent render behind a mounted flag so
  // both the server HTML and the client's first hydration pass agree (both
  // render nothing), avoiding a hydration mismatch on the avatar text node.
  const hasMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const userInitial = useMemo(() => {
    if (!hasMounted) return ""

    const nameCandidate = [
      resolvedUser?.user_metadata?.first_name,
      resolvedUser?.user_metadata?.full_name,
      resolvedUser?.user_metadata?.name,
      resolvedUser?.email,
    ].find((value): value is string => typeof value === "string" && value.trim().length > 0)

    const firstToken = nameCandidate?.trim().split(/[\s@._-]+/).find(Boolean) ?? ""
    return firstToken.charAt(0).toUpperCase() || ""
  }, [hasMounted, resolvedUser?.email, resolvedUser?.user_metadata])

  const displayName = useMemo(() => {
    return (
      [resolvedUser?.user_metadata?.full_name, resolvedUser?.user_metadata?.name, resolvedUser?.user_metadata?.first_name].find(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      ) ??
      resolvedUser?.email ??
      null
    )
  }, [resolvedUser?.email, resolvedUser?.user_metadata])

  useEffect(() => {
    if (typeof window === "undefined") return

    const scrollRoot = document.getElementById("app-scroll-root")
    const handleScroll = () => {
      const scrollTop = scrollRoot instanceof HTMLElement ? scrollRoot.scrollTop : window.scrollY
      setIsCondensed(scrollTop > 72)
    }

    handleScroll()

    if (scrollRoot instanceof HTMLElement) {
      scrollRoot.addEventListener("scroll", handleScroll, { passive: true })
      return () => scrollRoot.removeEventListener("scroll", handleScroll)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    setMobileFiltersOpen(false)
    setNotificationsAnchor(null)
    setUserMenuAnchor(null)
    setAddDataAnchor(null)
  }, [pathname, searchParams])

  const openMenu = (setter: (element: HTMLElement | null) => void) => (event: MouseEvent<HTMLElement>) => {
    setter(event.currentTarget)
  }

  const clearAllFilters = () => {
    // Update local state directly and issue a single combined URL replace.
    // Calling handleSystemChange/handleBatchChange/handleStageChange back to
    // back here would fire three separate replaceFilterParams() calls in the
    // same tick, each closing over the *same* stale selectedSystem/selectedBatch/
    // selectedStage values (React hasn't re-rendered between them yet) — the
    // last router.replace() wins and silently reintroduces the filters the
    // earlier calls thought they'd just cleared, leaving the dashboard's data
    // stuck on the pre-clear filter set even though the dropdowns show "All".
    setSelectedSystem("all")
    setSelectedBatch("all")
    setSelectedStage("all")
    replaceFilterParams({ selectedSystem: "all", selectedBatch: "all", selectedStage: "all" })
  }

  return (
    <header className="relative px-3 pt-1.5 sm:px-6 sm:pt-2 md:px-8 md:pt-3 lg:px-12">
      <div
        className={cn(
          "mx-auto max-w-[1640px] px-4 transition-[padding] duration-300 md:px-8",
          isCondensed ? "py-2" : "py-2.5",
        )}
      >
        <div className={cn("grid", showToolbar ? "gap-3" : "gap-0")}>
          <div className="flex flex-nowrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={onMenuClick}
                aria-label="Open navigation"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent md:hidden"
              >
                <MenuIcon size={20} />
              </button>
              {pageMeta ? (
                <div className="min-w-0">
                  <h1
                    className={cn(
                      "overflow-wrap-anywhere font-bold leading-[1.15] text-foreground",
                      isCondensed ? "text-lg sm:text-xl" : "text-xl sm:text-3xl",
                    )}
                  >
                    {pageMeta.title}
                  </h1>
                  <p className="mt-1 block text-xs font-medium text-muted-foreground">{timeWindowSummary}</p>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5 rounded-full">
              <Tooltip content="Notifications">
                <button
                  type="button"
                  onClick={openMenu((value) => {
                    if (value) markAllRead()
                    setNotificationsAnchor(value)
                  })}
                  className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
                >
                  <Bell size={18} />
                  {resolvedUnreadCount > 0 ? (
                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-micro font-bold leading-none text-destructive-foreground">
                      {resolvedUnreadCount > 9 ? "9+" : resolvedUnreadCount}
                    </span>
                  ) : null}
                </button>
              </Tooltip>
              <Tooltip content="Account">
                <button
                  type="button"
                  onClick={openMenu(setUserMenuAnchor)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-0.5 hover:bg-accent"
                >
                  <Avatar className="size-[34px]">{userInitial}</Avatar>
                </button>
              </Tooltip>
            </div>
          </div>

          {showToolbar ? (
            <div className="grid gap-2">
              <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                  <div className="hidden min-w-0 flex-1 md:block">
                    <FarmSelector
                      initialFarmId={initialFarmId}
                      selectedBatch={selectedBatch}
                      selectedSystem={selectedSystem}
                      selectedStage={selectedStage}
                      onBatchChange={handleBatchChange}
                      onSystemChange={handleSystemChange}
                      onStageChange={handleStageChange}
                      showBatch={pageTimeConfig.showBatchFilter}
                      showStage={pageTimeConfig.showStageFilter}
                      showSystem={pageTimeConfig.showSystemFilter !== false}
                      showCounts={false}
                      variant="compact"
                      layout="row"
                    />
                  </div>
                  <div className="flex flex-1 md:hidden">
                    <Button
                      variant="ghost"
                      onClick={() => setMobileFiltersOpen(true)}
                      className="min-h-10 w-full gap-2 rounded-lg bg-accent text-foreground"
                    >
                      Filters
                      {activeFilterCount > 0 ? (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-tag font-bold leading-none text-primary-foreground">
                          {activeFilterCount}
                        </span>
                      ) : null}
                    </Button>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 md:ml-auto md:w-auto md:flex-row md:items-center md:justify-end">
                  <div className="w-full shrink-0 md:w-[170px]">
                    <TimePeriodSelector
                      selectedPeriod={timePeriod}
                      onPeriodChange={handleTimePeriodChange}
                      label={undefined}
                      customRange={customTimeRange}
                      onCustomRangeChange={handleCustomRangeChange}
                      variant="compact"
                      periods={timePeriodOptions}
                    />
                  </div>
                  {showAddData ? (
                    <Button
                      variant="default"
                      onClick={openMenu(setAddDataAnchor)}
                      className="hidden h-10 justify-center rounded-lg px-4 font-bold md:inline-flex md:min-w-[140px]"
                    >
                      <PlusCircle size={18} />
                      Add Data
                    </Button>
                  ) : null}
                </div>
              </div>

              {hasActiveFilters ? (
                <div className="flex flex-wrap items-center gap-2">
                  {activeSystemLabel ? <FilterChip label={`Cage: ${activeSystemLabel}`} onDelete={() => handleSystemChange("all")} /> : null}
                  {activeBatchLabel ? <FilterChip label={`Batch: ${activeBatchLabel}`} onDelete={() => handleBatchChange("all")} /> : null}
                  {activeStageLabel ? <FilterChip label={`Stage: ${activeStageLabel}`} onDelete={() => handleStageChange("all")} /> : null}
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="min-w-0 px-1">
                    Clear all
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <Menu anchorEl={notificationsAnchor} open={Boolean(notificationsAnchor)} onClose={() => setNotificationsAnchor(null)} className="mt-1 w-[calc(100vw-24px)] sm:w-[340px]">
        <div className="px-4 py-3">
          <p className="text-sm font-bold">Notifications</p>
        </div>
        <Separator />
        <div className="max-h-80 overflow-y-auto py-1">
          {notifications.length === 0 ? (
            <div className="px-4 py-6">
              <p className="text-center text-sm text-muted-foreground">No New Notifications</p>
            </div>
          ) : (
            notifications.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => markRead(note.id)}
                className={cn(
                  "mx-1 my-0.5 block w-[calc(100%-0.5rem)] rounded-lg border px-3 py-2.5 text-left transition-colors",
                  note.read
                    ? "border-[color-mix(in_srgb,var(--color-border)_50%,transparent)]"
                    : "border-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)]",
                )}
              >
                <p className="text-sm font-bold">{note.title}</p>
                <p className="mt-1 block text-xs text-muted-foreground">{note.description}</p>
                <p className="mt-2 block text-xs text-muted-foreground">{formatStableDateTime(note.createdAt)}</p>
              </button>
            ))
          )}
        </div>
        <Separator />
        <MenuItem onClick={clearAll} className="mx-1 justify-center font-bold">
          Clear notifications
        </MenuItem>
      </Menu>

      <Menu anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={() => setUserMenuAnchor(null)} className="mt-1 w-60">
        <div className="px-4 py-3">
          <p className="text-sm font-bold">{displayName}</p>
          {resolvedUser?.email && displayName !== resolvedUser.email ? (
            <p className="mt-1 block text-xs text-muted-foreground">{resolvedUser.email}</p>
          ) : null}
          {resolvedRole ? <p className="mt-0.5 block text-xs text-muted-foreground">{formatRole(resolvedRole)}</p> : null}
        </div>
        <Separator />
        {canAccessSettings ? (
          <MenuItem href={toDashboardPath("/settings")} onClick={() => setUserMenuAnchor(null)}>
            <Settings size={16} />
            Settings
          </MenuItem>
        ) : null}
        <MenuItem
          onClick={async () => {
            setUserMenuAnchor(null)
            await handleSignOut()
          }}
          disabled={signingOut}
          destructive
        >
          <LogOut size={16} />
          {signingOut ? "Logging out..." : "Log out"}
        </MenuItem>
      </Menu>

      <Menu anchorEl={addDataAnchor} open={Boolean(addDataAnchor)} onClose={() => setAddDataAnchor(null)} className="mt-1 w-60">
        <div className="px-4 py-3">
          <p className="text-sm font-bold">Quick Entry</p>
        </div>
        <Separator />
        <MenuItem
          onClick={() => {
            setAddDataAnchor(null)
            router.push(`${DATA_ENTRY_PATH}?type=feeding${systemParam}${batchParam}`)
          }}
        >
          <Fish size={16} />
          Record Feeding
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAddDataAnchor(null)
            router.push(`${DATA_ENTRY_PATH}?type=sampling${systemParam}${batchParam}`)
          }}
        >
          <FlaskConical size={16} />
          Record Sampling
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAddDataAnchor(null)
            router.push(`${DATA_ENTRY_PATH}?type=water_quality${systemParam}`)
          }}
        >
          <Droplets size={16} />
          Record Water Quality
        </MenuItem>
        <Separator />
        <MenuItem
          onClick={() => {
            setAddDataAnchor(null)
            router.push(DATA_ENTRY_PATH)
          }}
        >
          View All Entry Types
        </MenuItem>
      </Menu>

      <Sheet open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} side="bottom">
        <div className="flex items-start justify-between gap-3 px-4 py-4">
          <div>
            <h2 className="text-base font-bold">Filters</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Refine the current view.</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            aria-label="Close filters"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
          >
            <X size={18} />
          </button>
        </div>
        <Separator />
        <div className="grid gap-3 overflow-y-auto px-4 py-4">
          <FarmSelector
            initialFarmId={initialFarmId}
            selectedBatch={selectedBatch}
            selectedSystem={selectedSystem}
            selectedStage={selectedStage}
            onBatchChange={handleBatchChange}
            onSystemChange={handleSystemChange}
            onStageChange={handleStageChange}
            showBatch={pageTimeConfig.showBatchFilter}
            showStage={pageTimeConfig.showStageFilter}
            showSystem={pageTimeConfig.showSystemFilter !== false}
            showCounts={false}
            variant="compact"
            layout="grid"
          />
        </div>
      </Sheet>
    </header>
  )
}
