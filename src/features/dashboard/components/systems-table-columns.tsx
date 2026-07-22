"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { DashboardSystemRow } from "@/features/dashboard/types"
import type { ProductionMetric } from "@/features/production/components/metrics"
import { formatNumberValue } from "@/lib/analytics-format"
import { formatCageLabel } from "@/lib/system-options"
import { formatGrowthStage } from "@/lib/stage-filter"
import { toTimePeriodUrlValue, type TimePeriod } from "@/lib/time-period"
import {
  MetricCell,
  NoData,
  WaterQualityFlagsCell,
  formatLastDate,
  formatSampleAgeText,
  isFiniteNumber,
} from "@/features/dashboard/lib/table-cells"

/**
 * Dashboard systems table — design-guide column set: System | eFCR | ABW |
 * Feeding rate | Daily mortality rate | Density | Water quality.
 * Every metric cell drills into the production page with that metric
 * pre-selected. Warning values render in the destructive tone.
 */

/** Deterministic per-system identity dot color from the chart palette vars. */
const identityDotColor = (systemId: number) => `var(--chart-${(Math.abs(systemId) % 5) + 1})`

export function buildDashboardSystemColumns(params: {
  farmMedianEfcr: number | null
  timePeriod?: TimePeriod
}): Array<ColumnDef<DashboardSystemRow, unknown>> {
  const { farmMedianEfcr, timePeriod } = params

  const productionHref = (systemId: number, filter?: ProductionMetric) => {
    const query = new URLSearchParams()
    query.set("system", String(systemId))
    if (filter) query.set("filter", filter)
    if (timePeriod) query.set("period", toTimePeriodUrlValue(timePeriod))
    return `/production?${query.toString()}`
  }

  const waterQualityHref = (systemId: number) => {
    const query = new URLSearchParams()
    query.set("system", String(systemId))
    if (timePeriod) query.set("period", toTimePeriodUrlValue(timePeriod))
    return `/water-quality?${query.toString()}`
  }

  const metricValue = (value: number | null | undefined, decimals: number) =>
    isFiniteNumber(value) ? formatNumberValue(value, { decimals, minimumDecimals: decimals }) : null

  return [
    {
      id: "system",
      header: "System",
      accessorFn: (row) => (row.system_name ?? "").toLowerCase(),
      sortDescFirst: false,
      meta: { width: "190px" },
      cell: ({ row }) => {
        const data = row.original
        const cageLabel = formatCageLabel({ id: data.system_id, label: data.system_name, unit: null })
        const stageLabel = data.growth_stage ? formatGrowthStage(data.growth_stage) : null
        const subtitle = [stageLabel, data.batch_name].filter(Boolean).join(" · ")
        return (
          <span className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: identityDotColor(data.system_id) }}
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-5 text-foreground">{cageLabel}</span>
              {subtitle ? (
                <span className="block truncate text-xs leading-4 text-muted-foreground">{subtitle}</span>
              ) : null}
            </span>
          </span>
        )
      },
    },
    {
      id: "efcr",
      header: "eFCR",
      accessorFn: (row) => row.efcr ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "110px" },
      cell: ({ row }) => {
        const data = row.original
        const value = metricValue(data.efcr, 2)
        if (value == null) return <NoData />
        const isOutlier =
          isFiniteNumber(data.efcr) &&
          isFiniteNumber(farmMedianEfcr) &&
          farmMedianEfcr > 0 &&
          data.efcr > farmMedianEfcr * 3
        return (
          <MetricCell
            href={productionHref(data.system_id, "efcr_periodic")}
            value={<span className={isOutlier ? "text-destructive" : undefined}>{value}</span>}
            arrow={data.efcr_arrow}
            invertArrow
            subtext={formatLastDate(data.efcr_latest_date)}
          />
        )
      },
    },
    {
      id: "abw",
      header: "ABW",
      accessorFn: (row) => row.abw ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "120px", unit: "g" },
      cell: ({ row }) => {
        const data = row.original
        const value = metricValue(data.abw, 1)
        if (value == null) return <NoData />
        return (
          <MetricCell
            href={productionHref(data.system_id, "abw")}
            value={value}
            arrow={data.abw_arrow}
            subtext={formatSampleAgeText(data.sample_age_days)}
          />
        )
      },
    },
    {
      id: "feeding_rate",
      header: "Feeding rate",
      accessorFn: (row) => row.feeding_rate ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "120px", unit: "%" },
      cell: ({ row }) => {
        const data = row.original
        const value = metricValue(data.feeding_rate, 2)
        if (value == null) return <NoData />
        return (
          <MetricCell
            href={productionHref(data.system_id, "feeding")}
            value={value}
            arrow={data.feeding_rate_arrow}
            subtext={formatLastDate(data.feeding_rate_latest_date)}
          />
        )
      },
    },
    {
      id: "mortality_rate",
      header: "Daily mortality rate",
      accessorFn: (row) => row.mortality_rate ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "140px", unit: "%" },
      cell: ({ row }) => {
        const data = row.original
        const value = metricValue(data.mortality_rate, 2)
        if (value == null) return <NoData />
        const rising = String(data.mortality_rate_arrow ?? "").toLowerCase() === "up"
        return (
          <MetricCell
            href={productionHref(data.system_id, "mortality")}
            value={<span className={rising ? "text-destructive" : undefined}>{value}</span>}
            arrow={data.mortality_rate_arrow}
            invertArrow
            subtext={formatLastDate(data.mortality_rate_latest_date)}
          />
        )
      },
    },
    {
      id: "biomass_density",
      header: "Density",
      accessorFn: (row) => row.biomass_density ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "120px", unit: "kg/m³" },
      cell: ({ row }) => {
        const data = row.original
        const value = metricValue(data.biomass_density, 1)
        if (value == null) return <NoData />
        return (
          <MetricCell
            href={productionHref(data.system_id, "density")}
            value={value}
            arrow={data.biomass_density_arrow}
            neutralArrow
            subtext={formatLastDate(data.biomass_density_latest_date)}
          />
        )
      },
    },
    {
      id: "water_quality",
      header: "Water quality",
      accessorFn: (row) => row.water_quality_rating_numeric_average ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "160px" },
      cell: ({ row }) => (
        <MetricCell
          href={waterQualityHref(row.original.system_id)}
          value={<WaterQualityFlagsCell row={row.original} farmMedianEfcr={farmMedianEfcr} size="table" />}
        />
      ),
    },
  ]
}
