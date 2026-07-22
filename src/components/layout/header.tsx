"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react"
import Avatar from "@mui/material/Avatar"
import Badge from "@mui/material/Badge"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import Divider from "@mui/material/Divider"
import Drawer from "@mui/material/Drawer"
import IconButton from "@mui/material/IconButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import Paper from "@mui/material/Paper"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
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
import FarmSelector from "@/components/shared/farm-selector"
import { FilterPopover } from "@/components/shared/filter-popover"
import { createSystemLabelResolver, getSystemFilterUrlValue, resolveSystemIdFromFilterValue } from "@/lib/system-options"
import TimePeriodSelector, { type TimePeriod } from "@/components/shared/time-period-selector"
import {
  DEFAULT_WQ_PARAMETER,
  isWqParameter,
  parameterLabels,
  type WqParameter,
} from "@/features/water-quality/wq-utils"
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
  type AnalyticsTimeScope,
  type CustomTimeRange,
} from "@/lib/time-period"

type PageMeta = {
  title: string
  description?: string
}

type PageTimeConfig = {
  defaultPeriod: TimePeriod
  scope: AnalyticsTimeScope
  useSystemBounds: boolean
  showBatchFilter: boolean
  showStageFilter: boolean
  /** Production owns its System select in-page (design guide); hide the header's. */
  showSystemFilter?: boolean
}

const getPageTimeConfig = (pathname: string): PageTimeConfig => {
  if (pathname.startsWith("/feed")) {
    return { defaultPeriod: "month", scope: "production", useSystemBounds: true, showBatchFilter: true, showStageFilter: true }
  }
  if (pathname.startsWith("/sampling") || pathname.startsWith("/production") || pathname.startsWith("/reports")) {
    if (pathname.startsWith("/production")) {
      return { defaultPeriod: "month", scope: "production", useSystemBounds: true, showBatchFilter: false, showStageFilter: false, showSystemFilter: false }
    }
    return { defaultPeriod: "month", scope: "production", useSystemBounds: true, showBatchFilter: true, showStageFilter: true }
  }
  if (pathname.startsWith("/water-quality")) {
    return { defaultPeriod: "month", scope: "water_quality", useSystemBounds: true, showBatchFilter: true, showStageFilter: true }
  }
  if (pathname.startsWith("/actions")) {
    return { defaultPeriod: "month", scope: "dashboard", useSystemBounds: true, showBatchFilter: true, showStageFilter: true }
  }
  return { defaultPeriod: "month", scope: "dashboard", useSystemBounds: false, showBatchFilter: true, showStageFilter: true }
}

const getPageMeta = (pathname: string, tab: string | null): PageMeta | null => {
  if (pathname === "/") {
    return {
      title: "Farm Performance Dashboard",
      description: "Live production, feed, water-quality, and activity signals across the farm.",
    }
  }
  if (pathname.startsWith("/sampling")) {
    return {
      title: "Growth Dashboard",
      description: "Growth sampling trends, biomass progress, and harvest-readiness indicators.",
    }
  }
  if (pathname.startsWith("/feed")) {
    return {
      title: "Feed Management Dashboard",
      description: "Model-guided feed planning, actual feed execution, feeding response, and feed-risk alerts.",
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
      title: "Production",
      description: "System-level production trends with snapshot-safe reporting across the selected period.",
    }
  }
  if (pathname.startsWith("/reports")) {
    return {
      title: "Reports",
      description: "Exports, compliance, and period summaries without inferring fake production dates.",
    }
  }
  if (pathname.startsWith("/actions")) {
    return {
      title: "Recommended Actions",
      description: "Operational priorities generated from recent farm signals.",
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

function FilterChip({
  label,
  onDelete,
}: {
  label: string
  onDelete: () => void
}) {
  return (
    <Chip
      size="small"
      label={label}
      onDelete={onDelete}
      deleteIcon={<X size={12} />}
      sx={{
        borderRadius: 999,
        bgcolor: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
        color: "primary.main",
        "& .MuiChip-deleteIcon": {
          color: "inherit",
          "&:hover": {
            color: "inherit",
          },
        },
      }}
    />
  )
}

export default function Header({
  initialFarmId,
  initialFarmName,
  onMenuClick,
  showToolbar = true,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  onMenuClick: () => void
  showToolbar?: boolean
}) {
  const { user, role, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const appPathname = stripDashboardPath(pathname)
  const searchParams = useSearchParams()
  const { farmId } = useActiveFarm({ initialFarmId, initialFarmName })
  const activeFarmRoleQuery = useActiveFarmRole(farmId)
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications()
  const [signingOut, setSigningOut] = useState(false)
  const [isCondensed, setIsCondensed] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [notificationsAnchor, setNotificationsAnchor] = useState<HTMLElement | null>(null)
  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null)
  const [addDataAnchor, setAddDataAnchor] = useState<HTMLElement | null>(null)

  const pageMeta = getPageMeta(appPathname, searchParams.get("tab"))
  const pageTimeConfig = useMemo(() => getPageTimeConfig(appPathname), [appPathname])
  const resolvedRole = (activeFarmRoleQuery.data ?? role ?? null) as Parameters<typeof canAccessDataEntry>[0]
  const resolvedUser = user ?? null
  const resolvedUnreadCount = unreadCount ?? 0
  const canAccessSettings = resolvedRole === "admin" || resolvedRole === "farm_manager"
  const allowDataEntry = canAccessDataEntry(resolvedRole)
  const showAddData = appPathname === "/" && allowDataEntry
  const isWaterQualityPage = appPathname.startsWith("/water-quality")
  const defaultPeriod: TimePeriod = pageTimeConfig.defaultPeriod
  const selectedParameter =
    isWaterQualityPage && isWqParameter(searchParams.get("parameter"))
      ? (searchParams.get("parameter") as WqParameter)
      : DEFAULT_WQ_PARAMETER
  const batchesQuery = useBatchOptions(farmId ? { farmId } : undefined)
  const systemsQuery = useSystemOptions(
    farmId ? { farmId, activeOnly: appPathname.startsWith("/feed") ? false : true } : undefined,
  )
  const allSystemsForChips = useMemo(
    () => (systemsQuery.data?.status === "success" ? systemsQuery.data.data : []),
    [systemsQuery.data],
  )
  const allBatchesForChips = useMemo(
    () => (batchesQuery.data?.status === "success" ? batchesQuery.data.data : []),
    [batchesQuery.data],
  )
  const rawPeriodParam = searchParams.get("period")

  // Custom date range (aquasmart-main / v2 design): same URL param as
  // presets, encoded as `custom_YYYY-MM-DD_YYYY-MM-DD`.
  const customTimeRange = useMemo(
    () => parseCustomPeriodUrlValue(rawPeriodParam),
    [rawPeriodParam],
  )

  const sharedFilterInitialValues = useMemo<Partial<SharedFiltersState> | undefined>(() => {
    const hasFilterParams = ["cage", "system", "batch", "stage", "period"].some((key) => searchParams.get(key) != null)
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
            // Preserve the custom range token in the URL instead of
            // rewriting it to the fallback preset.
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
    enabled: showToolbar,
  })
  const timeWindowSummary = useMemo(
    () =>
      customTimeRange
        ? `${formatCustomRangeLabel(customTimeRange)} (Custom)`
        : formatResolvedTimeWindow(timePeriod, timeWindowBoundsQuery.start, timeWindowBoundsQuery.end),
    [customTimeRange, timePeriod, timeWindowBoundsQuery.end, timeWindowBoundsQuery.start],
  )

  const selectedBatchAgeDays = useMemo(() => {
    if (selectedBatch === "all") return null
    const deliveryDate = allBatchesForChips.find((item) => String(item.id) === selectedBatch)?.date_of_delivery
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
    return batch?.label ?? null
  }, [allBatchesForChips, pageTimeConfig.showBatchFilter, selectedBatch])

  const activeStageLabel = useMemo(() => {
    if (!pageTimeConfig.showStageFilter) return null
    if (selectedStage === "all") return null
    return formatGrowthStage(selectedStage)
  }, [pageTimeConfig.showStageFilter, selectedStage])

  const activeParameterLabel = useMemo(() => {
    if (!isWaterQualityPage) return null
    if (selectedParameter === DEFAULT_WQ_PARAMETER) return null
    return parameterLabels[selectedParameter] ?? null
  }, [isWaterQualityPage, selectedParameter])

  const hasActiveFilters = Boolean(activeSystemLabel || activeBatchLabel || activeStageLabel || activeParameterLabel)
  const waterQualityParameterOptions = useMemo(
    () =>
      Object.entries(parameterLabels).map(([key, label]) => ({
        value: key,
        label,
      })),
    [],
  )

  const replaceFilterParams = useCallback((next: {
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

    if (nextSystem !== "all") {
      const system = allSystemsForChips.find((item) => String(item.id) === nextSystem)
      params.set("system", getSystemFilterUrlValue(system) || nextSystem)
      params.delete("cage")
    }
    else {
      params.delete("cage")
      params.delete("system")
    }

    if (nextBatch !== "all") params.set("batch", nextBatch)
    else params.delete("batch")

    if (nextStage !== "all") params.set("stage", nextStage)
    else params.delete("stage")

    // Keep an active custom range unless this change explicitly picks a preset.
    if (next.timePeriod == null && customTimeRange) {
      const customValue = toCustomPeriodUrlValue(customTimeRange)
      params.set("period", customValue)
    } else {
      const nextPeriodValue = toTimePeriodUrlValue(nextPeriod)
      params.set("period", nextPeriodValue)
    }

    if (isWaterQualityPage) {
      if (nextParameter !== DEFAULT_WQ_PARAMETER) params.set("parameter", nextParameter)
      else params.delete("parameter")
    }

    const nextQuery = params.toString()
    if (nextQuery === searchParams.toString()) return
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }, [
    allSystemsForChips,
    customTimeRange,
    isWaterQualityPage,
    pathname,
    router,
    searchParams,
    selectedBatch,
    selectedParameter,
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

  // Custom range (aquasmart-main / v2 design): writes the whole range into
  // the same `period` URL param as `custom_from_to`.
  const handleCustomRangeChange = useCallback(
    (range: CustomTimeRange) => {
      const params = new URLSearchParams(searchParams.toString())
      const customValue = toCustomPeriodUrlValue(range)
      params.set("period", customValue)
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

  const handleWaterQualityParameterChange = (value: string) => {
    if (!isWqParameter(value)) return
    replaceFilterParams({ selectedParameter: value as WqParameter })
  }

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

  const userInitial = useMemo(() => {
    const nameCandidate = [
      resolvedUser?.user_metadata?.first_name,
      resolvedUser?.user_metadata?.full_name,
      resolvedUser?.user_metadata?.name,
      resolvedUser?.email,
    ].find((value): value is string => typeof value === "string" && value.trim().length > 0)

    const firstToken = nameCandidate?.trim().split(/[\s@._-]+/).find(Boolean) ?? ""
    return firstToken.charAt(0).toUpperCase() || ""
  }, [resolvedUser?.email, resolvedUser?.user_metadata])

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
    handleSystemChange("all")
    handleBatchChange("all")
    handleStageChange("all")
    if (isWaterQualityPage) {
      handleWaterQualityParameterChange(DEFAULT_WQ_PARAMETER)
    }
  }

  return (
    <Box component="header" sx={{ position: "relative", px: { xs: 0.75, sm: 1.5, md: 2 }, pt: { xs: 0.5, md: 0.75 } }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 1,
          px: { xs: 1, sm: 1.5, md: 2 },
          py: isCondensed ? 1 : 1.25,
          backgroundColor: "background.paper",
          border: (theme) => `1px solid ${theme.palette.divider}`,
          boxShadow: "none",
          transition: (theme) =>
            theme.transitions.create(["padding"], {
              duration: theme.transitions.duration.standard,
            }),
        }}
      >
        <Box sx={{ display: "grid", gap: showToolbar ? 1.25 : 0 }}>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", justifyContent: "space-between", flexWrap: "nowrap" }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", minWidth: 0, flex: 1 }}>
              <IconButton
                onClick={onMenuClick}
                aria-label="Open navigation"
                sx={{
                  display: { md: "none" },
                  minWidth: 44,
                  minHeight: 44,
                  borderRadius: 999,
                  bgcolor: "transparent",
                  color: "text.secondary",
                }}
              >
                <MenuIcon size={20} />
              </IconButton>
              {pageMeta ? (
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontSize: isCondensed ? { xs: "1.15rem", sm: "1.35rem" } : { xs: "1.35rem", sm: "1.8rem" },
                      fontWeight: 700,
                      lineHeight: 1.15,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {pageMeta.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.35, fontWeight: 500 }}
                  >
                    {timeWindowSummary}
                  </Typography>
                </Box>
              ) : null}
            </Box>
            <Box
              sx={{
                display: "flex",
                gap: 0.5,
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: "flex-end",
                borderRadius: 999,
                bgcolor: "transparent",
              }}
            >
              <Tooltip title="Notifications">
                <IconButton
                  onClick={openMenu((value) => {
                    if (value) markAllRead()
                    setNotificationsAnchor(value)
                  })}
                  sx={{
                    minWidth: 44,
                    minHeight: 44,
                    borderRadius: 999,
                    color: "text.secondary",
                    bgcolor: "transparent",
                  }}
                >
                  <Badge badgeContent={resolvedUnreadCount > 9 ? "9+" : resolvedUnreadCount} color="error" invisible={resolvedUnreadCount === 0}>
                    <Bell size={18} />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title="Account">
                <IconButton
                  onClick={openMenu(setUserMenuAnchor)}
                  sx={{
                    p: 0.25,
                    minWidth: 44,
                    minHeight: 44,
                    borderRadius: 999,
                    bgcolor: "transparent",
                  }}
                >
                  <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 700 }}>
                    {userInitial}
                  </Avatar>
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {showToolbar ? (
            <Box sx={{ display: "grid", gap: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  gap: 1,
                  alignItems: { xs: "stretch", md: "center" },
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", minWidth: 0, flex: 1 }}>
                  <Box sx={{ minWidth: { xs: "100%", sm: 210, md: 210 }, flexShrink: 0 }}>
                    <TimePeriodSelector
                      selectedPeriod={timePeriod}
                      onPeriodChange={handleTimePeriodChange}
                      customRange={customTimeRange}
                      onCustomRangeChange={handleCustomRangeChange}
                      variant="compact"
                      periods={timePeriodOptions}
                    />
                  </Box>
                  <Box sx={{ display: { xs: "none", md: "block" }, minWidth: 0, flex: 1 }}>
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
                  </Box>
                  {isWaterQualityPage ? (
                    <Box sx={{ display: { xs: "none", md: "block" }, minWidth: 170 }}>
                      <FilterPopover
                        label="Parameter"
                        value={selectedParameter}
                        options={waterQualityParameterOptions}
                        placeholder="Select parameter"
                        onChange={handleWaterQualityParameterChange}
                        triggerSx={{ width: 170 }}
                      />
                    </Box>
                  ) : null}
                  <Box sx={{ display: { xs: "flex", md: "none" }, flex: 1 }}>
                    <Button
                      variant="text"
                      fullWidth
                      onClick={() => setMobileFiltersOpen(true)}
                      sx={{
                        minHeight: 40,
                        borderRadius: 1.5,
                        bgcolor: "var(--accent)",
                        color: "var(--foreground)",
                      }}
                    >
                      Filters
                    </Button>
                  </Box>
                </Box>
                {showAddData ? (
                  <Box sx={{ width: { xs: "100%", sm: "auto" }, ml: { md: "auto" } }}>
                    <Button
                      variant="contained"
                      onClick={openMenu(setAddDataAnchor)}
                      startIcon={<PlusCircle size={18} />}
                      fullWidth
                      sx={{
                        minHeight: 40,
                        borderRadius: 1.5,
                        px: 2,
                        fontWeight: 700,
                      }}
                    >
                      Add Data
                    </Button>
                  </Box>
                ) : null}
              </Box>

              {hasActiveFilters ? (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                  {activeSystemLabel ? <FilterChip label={`Cage: ${activeSystemLabel}`} onDelete={() => handleSystemChange("all")} /> : null}
                  {activeBatchLabel ? <FilterChip label={`Batch: ${activeBatchLabel}`} onDelete={() => handleBatchChange("all")} /> : null}
                  {activeStageLabel ? <FilterChip label={`Stage: ${activeStageLabel}`} onDelete={() => handleStageChange("all")} /> : null}
                  {activeParameterLabel ? (
                    <FilterChip
                      label={`Parameter: ${activeParameterLabel}`}
                      onDelete={() => handleWaterQualityParameterChange(DEFAULT_WQ_PARAMETER)}
                    />
                  ) : null}
                  <Button variant="text" size="small" onClick={clearAllFilters} sx={{ minWidth: 0, px: 0.5 }}>
                    Clear all
                  </Button>
                </Box>
              ) : null}
            </Box>
          ) : null}
        </Box>
      </Paper>

      <Menu
        anchorEl={notificationsAnchor}
        open={Boolean(notificationsAnchor)}
        onClose={() => setNotificationsAnchor(null)}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: { xs: "calc(100vw - 24px)", sm: 340 }, maxWidth: 340, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Notifications
          </Typography>
        </Box>
        <Divider />
        <Box sx={{ maxHeight: 320, overflowY: "auto", py: 1 }}>
          {notifications.length === 0 ? (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography variant="body2" color="text.secondary" align="center">
                No New Notifications
              </Typography>
            </Box>
          ) : (
            notifications.map((note) => (
              <MenuItem
                key={note.id}
                onClick={() => markRead(note.id)}
                sx={{
                  alignItems: "flex-start",
                  whiteSpace: "normal",
                  mx: 1,
                  my: 0.25,
                  borderRadius: 2,
                  border: note.read
                    ? "1px solid color-mix(in srgb, var(--color-border) 50%, transparent)"
                    : "1px solid color-mix(in srgb, var(--color-primary) 35%, transparent)",
                  bgcolor: note.read ? "transparent" : "color-mix(in srgb, var(--color-primary) 5%, transparent)",
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {note.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    {note.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    {formatStableDateTime(note.createdAt)}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          )}
        </Box>
        <Divider />
        <MenuItem onClick={clearAll} sx={{ justifyContent: "center", fontWeight: 700 }}>
          Clear notifications
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 240, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {displayName}
          </Typography>
          {resolvedUser?.email && displayName !== resolvedUser.email ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              {resolvedUser.email}
            </Typography>
          ) : null}
          {resolvedRole ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
              {formatRole(resolvedRole)}
            </Typography>
          ) : null}
        </Box>
        <Divider />
        {canAccessSettings ? (
          <MenuItem component={Link} href={toDashboardPath("/settings")} onClick={() => setUserMenuAnchor(null)}>
            <ListItemIcon>
              <Settings size={16} />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>
        ) : null}
        <MenuItem
          onClick={async () => {
            setUserMenuAnchor(null)
            await handleSignOut()
          }}
          disabled={signingOut}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <LogOut size={16} />
          </ListItemIcon>
          <ListItemText>{signingOut ? "Logging out..." : "Log out"}</ListItemText>
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={addDataAnchor}
        open={Boolean(addDataAnchor)}
        onClose={() => setAddDataAnchor(null)}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 240, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Quick Entry
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setAddDataAnchor(null)
            router.push(`${DATA_ENTRY_PATH}?type=feeding${systemParam}${batchParam}`)
          }}
        >
          <ListItemIcon>
            <Fish size={16} />
          </ListItemIcon>
          <ListItemText>Record Feeding</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAddDataAnchor(null)
            router.push(`${DATA_ENTRY_PATH}?type=sampling${systemParam}${batchParam}`)
          }}
        >
          <ListItemIcon>
            <FlaskConical size={16} />
          </ListItemIcon>
          <ListItemText>Record Sampling</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAddDataAnchor(null)
            router.push(`${DATA_ENTRY_PATH}?type=water_quality${systemParam}`)
          }}
        >
          <ListItemIcon>
            <Droplets size={16} />
          </ListItemIcon>
          <ListItemText>Record Water Quality</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAddDataAnchor(null)
            router.push(DATA_ENTRY_PATH)
          }}
        >
          <ListItemText>View All Entry Types</ListItemText>
        </MenuItem>
      </Menu>

      <Drawer
        anchor="bottom"
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            px: 0,
            pb: 2,
            maxHeight: "85vh",
          },
        }}
      >
        <Box sx={{ px: 2, py: 2 }}>
          <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 700 }}>
            Filters
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Refine the current view.
          </Typography>
        </Box>
        <Divider />
        <Box sx={{ display: "grid", gap: 1.5, px: 2, py: 2, overflowY: "auto" }}>
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
          {isWaterQualityPage ? (
            <FilterPopover
              label="Parameter"
              value={selectedParameter}
              options={waterQualityParameterOptions}
              placeholder="Select parameter"
              onChange={handleWaterQualityParameterChange}
              triggerSx={{ width: "100%" }}
            />
          ) : null}
        </Box>
      </Drawer>
    </Box>
  )
}
