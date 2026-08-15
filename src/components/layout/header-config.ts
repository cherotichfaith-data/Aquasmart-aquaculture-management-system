import type { TimePeriod } from "@/components/shared/time-period-selector"
import type { AnalyticsTimeScope } from "@/lib/time-period"

export type PageMeta = {
  title: string
  description?: string
}

export type PageTimeConfig = {
  defaultPeriod: TimePeriod
  scope: AnalyticsTimeScope
  useSystemBounds: boolean
  showBatchFilter: boolean
  showStageFilter: boolean
  showSystemFilter?: boolean
  /** Defaults to true. Set false to hide the date/time-period selector (and the
   * resolved date-range text under the title) for pages that always show the
   * full picture rather than a filterable rolling window. */
  showTimePeriod?: boolean
}

export const getHeaderPageTimeConfig = (pathname: string): PageTimeConfig => {
  if (pathname.startsWith("/feed")) {
    return { defaultPeriod: "month", scope: "production", useSystemBounds: true, showBatchFilter: true, showStageFilter: true }
  }
  if (pathname.startsWith("/production") || pathname.startsWith("/reports")) {
    if (pathname.startsWith("/production")) {
      return { defaultPeriod: "month", scope: "production", useSystemBounds: true, showBatchFilter: false, showStageFilter: false, showSystemFilter: false }
    }
    return { defaultPeriod: "month", scope: "production", useSystemBounds: true, showBatchFilter: true, showStageFilter: true }
  }
  if (pathname.startsWith("/batches")) {
    return {
      defaultPeriod: "all history",
      scope: "dashboard",
      useSystemBounds: false,
      showBatchFilter: true,
      showStageFilter: true,
      showSystemFilter: false,
      showTimePeriod: false,
    }
  }
  if (pathname.startsWith("/systems")) {
    return {
      defaultPeriod: "all history",
      scope: "dashboard",
      useSystemBounds: false,
      showBatchFilter: true,
      showStageFilter: true,
      showTimePeriod: false,
    }
  }
  if (pathname.startsWith("/actions")) {
    return { defaultPeriod: "month", scope: "dashboard", useSystemBounds: true, showBatchFilter: true, showStageFilter: true }
  }
  return { defaultPeriod: "month", scope: "dashboard", useSystemBounds: false, showBatchFilter: true, showStageFilter: true }
}

export const getHeaderPageMeta = (pathname: string, tab: string | null): PageMeta | null => {
  void tab
  if (pathname === "/") {
    return {
      title: "Farm Performance Dashboard",
      description: "Live production, feed, water-quality, and activity signals across the farm.",
    }
  }
  if (pathname.startsWith("/systems")) {
    return {
      title: "Cages",
      description: "Every cage with its current stocking, stage, and latest performance status.",
    }
  }
  if (pathname.startsWith("/batches")) {
    return {
      title: "Batches",
      description: "Batch-level rollups across every cage each batch is currently stocked in.",
    }
  }
  if (pathname.startsWith("/feed")) {
    return {
      title: "Feed Management Dashboard",
      description: "Model-guided feed planning, actual feed execution, feeding response, and feed-risk alerts.",
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
