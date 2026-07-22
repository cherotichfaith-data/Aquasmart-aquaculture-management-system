"use client"

import type { MouseEvent, ReactNode } from "react"
import Link from "next/link"
import { ArrowDown, ArrowRight, ArrowUp, Clock, TriangleAlert, type LucideIcon } from "lucide-react"
import { formatNumberValue } from "@/lib/analytics-format"
import type { DashboardSystemRow } from "@/features/dashboard/types"

/**
 * Cell building blocks for the dashboard tables (aquasmart-main overview-table
 * cell anatomy: value + trend-arrow badge + latest-date subtext, wrapped in a
 * drill-down link).
 */

export type ArrowValue = string | null | undefined

type ArrowTone = "positive" | "neutral" | "negative" | "none"

export const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

/** Map an `arrows` enum value to a tone. `invert` flips up/down (eFCR: down is good). */
export function arrowTone(arrow: ArrowValue, options?: { invert?: boolean; neutral?: boolean }): ArrowTone {
  if (options?.neutral) return arrow ? "neutral" : "none"
  const normalized = String(arrow ?? "").trim().toLowerCase()
  if (normalized === "up") return options?.invert ? "negative" : "positive"
  if (normalized === "down") return options?.invert ? "positive" : "negative"
  if (normalized === "straight") return "neutral"
  return "none"
}

const toneClass: Record<ArrowTone, string> = {
  positive: "bg-success/15 text-success",
  neutral: "bg-muted text-muted-foreground",
  negative: "bg-destructive/15 text-destructive",
  none: "bg-muted text-muted-foreground",
}

export function ArrowBadge({
  arrow,
  invert,
  neutral,
}: {
  arrow: ArrowValue
  invert?: boolean
  neutral?: boolean
}) {
  const normalized = String(arrow ?? "").trim().toLowerCase()
  const tone = arrowTone(arrow, { invert, neutral })
  return (
    <span className={`inline-flex h-4 w-5 items-center justify-center rounded-full ${toneClass[tone]}`}>
      {normalized === "up" ? (
        <ArrowUp className="h-3 w-3" />
      ) : normalized === "down" ? (
        <ArrowDown className="h-3 w-3" />
      ) : normalized === "straight" ? (
        <ArrowRight className="h-3 w-3" />
      ) : (
        <span className="text-[9px] leading-none">–</span>
      )}
    </span>
  )
}

/** Relative "freshness" text for a metric's latest date. */
export function formatLastDate(value: string | null | undefined): string | null {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today.getTime() - parsed.getTime()) / 86_400_000)
  if (diffDays <= 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 60) return `${diffDays} days ago`
  return value
}

export function formatSampleAgeText(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return "No sample"
  if (value === 0) return "Today"
  if (value === 1) return "Yesterday"
  return `${formatNumberValue(value)}d ago`
}

export const NoData = () => <span className="text-sm text-muted-foreground">--</span>

/**
 * Standard metric cell: value + arrow badge on one line, freshness subtext
 * below, whole cell linking into the production page (or elsewhere) without
 * triggering the row's own click handler.
 */
export function MetricCell({
  href,
  value,
  arrow,
  invertArrow,
  neutralArrow,
  subtext,
}: {
  href?: string
  value: ReactNode
  arrow?: ArrowValue
  invertArrow?: boolean
  neutralArrow?: boolean
  subtext?: string | null
}) {
  const body = (
    <>
      <span className="flex items-center gap-1.5">
        <span className="text-sm leading-5 text-foreground">{value}</span>
        {arrow !== undefined ? <ArrowBadge arrow={arrow} invert={invertArrow} neutral={neutralArrow} /> : null}
      </span>
      {subtext ? <span className="mt-0.5 block text-[10px] leading-3 text-muted-foreground">{subtext}</span> : null}
    </>
  )

  if (!href) return <span className="block">{body}</span>

  return (
    <Link
      href={href}
      onClick={(event: MouseEvent) => event.stopPropagation()}
      className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {body}
    </Link>
  )
}

// --- Water quality helpers -------------------------------------------------

const normalizeWaterQuality = (value: string | null | undefined) => value?.trim().toLowerCase() ?? null

export const hasWaterQualityData = (value: string | null | undefined) => Boolean(normalizeWaterQuality(value))

export function waterQualityLabel(value: string | null | undefined) {
  const normalized = normalizeWaterQuality(value)
  if (normalized === "optimal") return "Optimal"
  if (normalized === "acceptable") return "Acceptable"
  if (normalized === "critical") return "Critical"
  if (normalized === "lethal") return "Lethal"
  return value ?? "Unknown"
}

export function ratingToneClass(value: string | null | undefined) {
  const normalized = normalizeWaterQuality(value)
  if (normalized === "optimal") return "bg-success/15 text-success"
  if (normalized === "acceptable") return "bg-warning/15 text-warning"
  if (normalized === "critical" || normalized === "lethal") return "bg-destructive/15 text-destructive"
  return "bg-muted text-muted-foreground"
}

export function worstParameterLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "dissolved_oxygen") return "DO"
  if (normalized === "temperature") return "Temp"
  if (normalized === "ph") return "pH"
  if (normalized === "ammonia") return "Ammonia"
  if (normalized === "nitrite") return "Nitrite"
  if (normalized === "nitrate") return "Nitrate"
  return value ?? null
}

export function formatWorstParameterText(row: DashboardSystemRow): string | null {
  const label = worstParameterLabel(row.worst_parameter)
  if (!label || !isFiniteNumber(row.worst_parameter_value)) return null
  const unit = row.worst_parameter_unit ? ` ${row.worst_parameter_unit}` : ""
  return `${label} ${formatNumberValue(row.worst_parameter_value, { decimals: 1, minimumDecimals: 1 })}${unit}`
}

// --- Row flags -------------------------------------------------------------

export type SystemFlag = {
  key: string
  title: string
  icon: LucideIcon
  className: string
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function buildSystemFlags(row: DashboardSystemRow, farmMedianEfcr: number | null): SystemFlag[] {
  const staleSample = (row.sample_age_days ?? 0) > 30
  const wqBreach =
    isFiniteNumber(row.water_quality_rating_numeric_average) && row.water_quality_rating_numeric_average <= 1
  const efcrOutlier =
    isFiniteNumber(row.efcr) && isFiniteNumber(farmMedianEfcr) && farmMedianEfcr > 0 && row.efcr > farmMedianEfcr * 3

  return [
    staleSample
      ? {
          key: "stale-sample",
          title: `Sample is ${row.sample_age_days} days old.`,
          icon: Clock,
          className: "bg-warning/15 text-warning",
        }
      : null,
    wqBreach
      ? {
          key: "wq-breach",
          title: `Water quality is ${row.water_quality_rating_average}. Immediate action required.`,
          icon: TriangleAlert,
          className: "bg-destructive/15 text-destructive",
        }
      : null,
    efcrOutlier
      ? {
          key: "efcr-outlier",
          title: "eFCR is above 3x the farm median.",
          icon: TriangleAlert,
          className: "bg-destructive/15 text-destructive",
        }
      : null,
  ].filter(Boolean) as SystemFlag[]
}

export function WaterQualityFlagsCell({
  row,
  farmMedianEfcr,
  size = "table",
}: {
  row: DashboardSystemRow
  farmMedianEfcr: number | null
  size?: "table" | "card"
}) {
  const flags = buildSystemFlags(row, farmMedianEfcr)
  const showWaterQuality = hasWaterQualityData(row.water_quality_rating_average)
  const thresholdFlag = flags.find((flag) => flag.key === "wq-breach") ?? null
  const displayFlags = showWaterQuality ? flags.filter((flag) => flag.key !== "wq-breach") : flags
  const worstParameterText = formatWorstParameterText(row)
  const compact = size === "table"

  return (
    <div className={compact ? "flex flex-wrap items-center gap-1" : "mt-1 flex flex-wrap items-center gap-1.5"}>
      {showWaterQuality ? (
        <span className="relative inline-flex">
          <span
            className={`inline-flex rounded-full font-semibold ${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"} ${ratingToneClass(row.water_quality_rating_average)}`}
          >
            {waterQualityLabel(row.water_quality_rating_average)}
          </span>
          {thresholdFlag ? (
            <span
              title={thresholdFlag.title}
              aria-label={thresholdFlag.title}
              className={`absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`}
            >
              <TriangleAlert className={compact ? "h-2 w-2" : "h-2.5 w-2.5"} />
            </span>
          ) : null}
        </span>
      ) : null}
      {displayFlags.map((flag) => {
        const Icon = flag.icon
        return (
          <span
            key={flag.key}
            title={flag.title}
            aria-label={flag.title}
            className={`inline-flex items-center justify-center rounded-full ${compact ? "h-6 w-6" : "h-7 w-7"} ${flag.className}`}
          >
            <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          </span>
        )
      })}
      {!showWaterQuality && displayFlags.length === 0 ? (
        <span className={compact ? "text-[10px] text-muted-foreground" : "text-[11px] text-muted-foreground"}>—</span>
      ) : null}
      {worstParameterText ? (
        <p className="mt-0.5 w-full text-[10px] leading-3 text-muted-foreground">{worstParameterText}</p>
      ) : null}
    </div>
  )
}
