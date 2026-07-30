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
}

export const getHeaderPageTimeConfig = (pathname: string): PageTimeConfig => {
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

export const getHeaderPageMeta = (pathname: string, tab: string | null): PageMeta | null => {
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
