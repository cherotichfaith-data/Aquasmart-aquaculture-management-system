"use client"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react"
import {
  Bell,
  Droplets,
  Fish,
  FlaskConical,
  Menu as MenuIcon,
  PackageOpen,
  PlusCircle,
  X,
} from "lucide-react"
import { useNotifications } from "@/components/notifications/notifications-provider"
import { useAuth } from "@/components/providers/auth-provider"
import { getHeaderPageMeta, getHeaderPageTimeConfig } from "@/components/layout/header-config"
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
import { canAccessDataEntry, DATA_ENTRY_PATH, stripDashboardPath } from "@/lib/app-entry"
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

// Leading icon per alert kind (water quality / mortality / empty cage), so the
// notification list is scannable by type at a glance instead of reading titles.
function notificationIcon(kind: string) {
  if (kind === "water_quality") return Droplets
  if (kind === "mortality") return Fish
  if (kind === "cage_empty") return PackageOpen
  return Bell
}

// Icon-circle tint by severity, using the accessible destructive/warning tokens.
// A read history item drops to muted so unread entries stand out.
function notificationTint(severity: string, read?: boolean) {
  if (read) return "bg-muted text-muted-foreground"
  if (severity === "critical") return "bg-destructive/10 text-destructive-strong"
  return "bg-warning/15 text-warning-foreground"
}

// Relative time for recent alerts ("6 min ago"); falls back to the absolute
// stamp once an item is more than a week old.
function formatRelativeTime(iso: string) {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ""
  const diffMs = Date.now() - then
  if (diffMs < 60_000) return "just now"
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} d ago`
  return formatStableDateTime(iso)
}

// Human category label for a notification kind, shown in each row's meta line.
function notificationCategory(kind: string) {
  if (kind === "water_quality") return "Water quality"
  if (kind === "mortality") return "Mortality"
  if (kind === "cage_empty") return "Empty cage"
  return "Alert"
}

type NotifIcon = ReturnType<typeof notificationIcon>

// One notification row: tinted icon box, title, description, a "time · category"
// meta line, an optional dismiss (X) and an unread dot -- the PropXYZ layout.
function NotificationRow({
  Icon,
  tint,
  title,
  description,
  time,
  category,
  unread,
  onClick,
  onDismiss,
}: {
  Icon: NotifIcon
  tint: string
  title: string
  description: string
  time?: string
  category: string
  unread?: boolean
  onClick?: () => void
  onDismiss?: () => void
}) {
  return (
    <div className="flex items-start gap-3 border-t border-border/60 px-4 py-3 first:border-t-0">
      <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg", tint)}>
        <Icon size={17} aria-hidden />
      </span>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className="min-w-0 flex-1 text-left disabled:cursor-default"
      >
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span>
        <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {time ? (
            <>
              <span>{time}</span>
              <span aria-hidden className="inline-block size-1 rounded-full bg-current opacity-50" />
            </>
          ) : null}
          <span>{category}</span>
        </span>
      </button>
      <div className="flex shrink-0 flex-col items-center gap-2 pt-0.5">
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X size={15} />
          </button>
        ) : (
          <span className="size-[15px]" aria-hidden />
        )}
        {unread ? <span aria-hidden className="size-2 rounded-full bg-primary" /> : null}
      </div>
    </div>
  )
}

function NotificationEmpty({ text }: { text: string }) {
  return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{text}</p>
}

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
  const { role } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const appPathname = stripDashboardPath(pathname)
  const isReportsPage = appPathname.startsWith("/reports")
  const searchParams = useSearchParams()
  const { farmId } = useActiveFarm({ initialFarmId, initialFarmName })
  const activeFarmRoleQuery = useActiveFarmRole(roleOverride ? null : farmId)
  const { notifications, markAllRead, markRead, dismiss, activeAlerts } = useNotifications()
  const [isCondensed, setIsCondensed] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [notificationsAnchor, setNotificationsAnchor] = useState<HTMLElement | null>(null)
  const [addDataAnchor, setAddDataAnchor] = useState<HTMLElement | null>(null)
  const [notifTab, setNotifTab] = useState<"alerts" | "recent">("alerts")

  const pageMeta = getHeaderPageMeta(appPathname, searchParams.get("tab"))
  const pageTimeConfig = useMemo(() => getHeaderPageTimeConfig(appPathname), [appPathname])
  const resolvedRole = (roleOverride ?? activeFarmRoleQuery.data ?? role ?? null) as Parameters<typeof canAccessDataEntry>[0]
  // The persistent "cage empty" condition is now owned by activeAlerts; drop it
  // from the point-in-time history list so it isn't shown twice.
  const historyNotifications = useMemo(
    () => notifications.filter((note) => note.kind !== "cage_empty"),
    [notifications],
  )
  // Unread count for the discrete event log only. cage_empty rows are excluded
  // because that condition is already surfaced by activeAlerts (and the
  // always-on banner) -- counting the raw unreadCount double-counts it and,
  // since cage_empty rows are hidden from the list below, leaves a phantom the
  // user can never open to clear, so the badge looks permanently stuck.
  const historyUnreadCount = useMemo(
    () => historyNotifications.filter((note) => !note.read).length,
    [historyNotifications],
  )
  // Active alerts are standing conditions (empty cage, mortality spiking) that
  // stay until resolved, so they always count toward the bell badge.
  const bellBadgeCount = historyUnreadCount + activeAlerts.length
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

  useEffect(() => {
    if (typeof window === "undefined") return

    // #app-scroll-root (dashboard-layout.tsx) is min-h-screen with no
    // overflow-y of its own, so the page actually scrolls at the window
    // level, not inside that div -- listen there directly instead of on an
    // element that never emits a scroll event.
    const handleScroll = () => {
      setIsCondensed(window.scrollY > 72)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    setMobileFiltersOpen(false)
    setNotificationsAnchor(null)
    setAddDataAnchor(null)
  }, [pathname, searchParams])

  // When the bell panel opens, land on whichever tab actually has something.
  useEffect(() => {
    if (notificationsAnchor) setNotifTab(activeAlerts.length > 0 ? "alerts" : "recent")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsAnchor])

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
    <header
      className={cn(
        "sticky top-0 z-30 border-b bg-background px-3 pt-1.5 transition-colors duration-300 sm:px-6 sm:pt-2 md:px-8 md:pt-3 lg:px-12",
        isCondensed ? "border-border" : "border-transparent",
      )}
    >
      <div
        className={cn(
          "mx-auto max-w-[1640px] transition-[padding] duration-300",
          isCondensed ? "py-2" : "py-2.5",
        )}
      >
        <div className={cn("grid", showToolbar ? "gap-3" : "gap-0")}>
          <div className={cn("flex flex-nowrap items-center justify-between gap-2", isReportsPage && "md:hidden")}>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={onMenuClick}
                aria-label="Open navigation"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent md:hidden"
              >
                <MenuIcon size={20} />
              </button>
              {pageMeta && !isReportsPage ? (
                <div className="min-w-0">
                  <h1
                    className={cn(
                      "overflow-wrap-anywhere font-bold leading-[1.15] text-foreground",
                      isCondensed ? "text-lg sm:text-xl" : "text-xl sm:text-3xl",
                    )}
                  >
                    {pageMeta.title}
                  </h1>
                  {isReportsPage ? null : <p className="mt-1 block text-xs font-medium text-muted-foreground">{appPathname.startsWith("/production") ? timeWindowSummary.replace("All History", "Cycle to date") : timeWindowSummary}</p>}
                </div>
              ) : null}
            </div>
            <div className={cn("flex flex-wrap items-center justify-end gap-1.5 rounded-full", isReportsPage && "hidden")}>
              <Tooltip content="Notifications">
                <button
                  type="button"
                  onClick={openMenu(setNotificationsAnchor)}
                  className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
                >
                  <Bell size={18} />
                  {bellBadgeCount > 0 ? (
                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-micro font-bold leading-none text-destructive-foreground">
                      {bellBadgeCount > 9 ? "9+" : bellBadgeCount}
                    </span>
                  ) : null}
                </button>
              </Tooltip>
            </div>
          </div>

          {showToolbar ? (
            <div className="grid gap-2">
              <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <div className="hidden min-w-0 md:flex md:flex-wrap md:items-center md:gap-2">
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
                <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                  {pageTimeConfig.showTimePeriod !== false ? (
                    <div className="w-full shrink-0 md:w-[170px]">
                      <TimePeriodSelector
                        selectedPeriod={timePeriod}
                        onPeriodChange={handleTimePeriodChange}
                        label={undefined}
                        customRange={customTimeRange}
                        onCustomRangeChange={handleCustomRangeChange}
                        variant="compact"
                        periods={timePeriodOptions}
                        customLabels={appPathname.startsWith("/production") ? { "all history": "Cycle to date" } : undefined}
                      />
                    </div>
                  ) : null}
                  {showAddData && !isReportsPage ? (
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

      <Menu anchorEl={notificationsAnchor} open={Boolean(notificationsAnchor)} onClose={() => setNotificationsAnchor(null)} className="mt-1 w-[calc(100vw-24px)] p-0 sm:w-[400px]">
        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Notifications</p>
            {bellBadgeCount > 0 ? (
              <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-bold text-primary">{bellBadgeCount} New</span>
            ) : null}
          </div>
          {historyUnreadCount > 0 ? (
            <button type="button" onClick={markAllRead} className="text-xs font-semibold text-primary hover:underline">
              Mark all read
            </button>
          ) : null}
        </div>
        <div role="tablist" aria-label="Notifications" className="flex items-center gap-5 border-b border-border px-4">
          {(
            [
              ["alerts", "Alerts"],
              ["recent", "Recent"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={notifTab === key}
              onClick={() => setNotifTab(key)}
              className={cn(
                "-mb-px border-b-2 pb-2 pt-1 text-sm font-semibold transition-colors",
                notifTab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="max-h-[26rem] overflow-y-auto">
          {notifTab === "alerts" ? (
            activeAlerts.length === 0 ? (
              <NotificationEmpty text="No active alerts — everything is within range." />
            ) : (
              activeAlerts.map((alert) => (
                <NotificationRow
                  key={alert.id}
                  Icon={notificationIcon(alert.kind)}
                  tint={notificationTint(alert.severity)}
                  title={alert.title}
                  description={alert.description}
                  category={notificationCategory(alert.kind)}
                  unread
                  onClick={
                    alert.href
                      ? () => {
                          router.push(alert.href!)
                          setNotificationsAnchor(null)
                        }
                      : undefined
                  }
                />
              ))
            )
          ) : historyNotifications.length === 0 ? (
            <NotificationEmpty text="No recent notifications." />
          ) : (
            historyNotifications.map((note) => (
              <NotificationRow
                key={note.id}
                Icon={notificationIcon(note.kind)}
                tint={notificationTint(note.severity, note.read)}
                title={note.title}
                description={note.description}
                time={formatRelativeTime(note.createdAt)}
                category={notificationCategory(note.kind)}
                unread={!note.read}
                onClick={() => {
                  markRead(note.id)
                  if (note.href) {
                    router.push(note.href)
                    setNotificationsAnchor(null)
                  }
                }}
                onDismiss={() => dismiss(note.id)}
              />
            ))
          )}
        </div>
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
