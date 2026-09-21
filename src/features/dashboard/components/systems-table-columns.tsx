"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { DashboardSystemRow } from "@/features/dashboard/types"
import type { ProductionMetric } from "@/features/production/components/metrics"
import { formatNumberValue } from "@/lib/analytics-format"
import { formatCageLabel } from "@/lib/system-options"
import { toTimePeriodUrlValue, type TimePeriod } from "@/lib/time-period"
import {
  MetricCell,
  NoData,
  SeverityValue,
  WaterQualityFlagsCell,
  formatLastDate,
  isFiniteNumber,
  isMortalityCritical,
} from "@/features/dashboard/lib/table-cells"

const identityDotColor = (systemId: number) => `var(--chart-${(Math.abs(systemId) % 5) + 1})`

export function buildDashboardSystemColumns(params: {
  timePeriod?: TimePeriod
}): Array<ColumnDef<DashboardSystemRow, unknown>> {
  const { timePeriod } = params

  const productionHref = (systemId: number, filter?: ProductionMetric) => {
    const query = new URLSearchParams()
    query.set("system", String(systemId))
    if (filter) query.set("filter", filter)
    if (timePeriod) query.set("date", toTimePeriodUrlValue(timePeriod))
    return `/production?${query.toString()}`
  }

  const waterQualityHref = (systemId: number) => {
    const query = new URLSearchParams()
    query.set("tab", "water-quality")
    query.set("system", String(systemId))
    if (timePeriod) query.set("date", toTimePeriodUrlValue(timePeriod))
    return `/reports?${query.toString()}`
  }

  const metricValue = (value: number | null | undefined, decimals: number) =>
    isFiniteNumber(value) ? formatNumberValue(value, { decimals, minimumDecimals: decimals }) : null

  return [
    {
      id: "system",
      header: "System",
      accessorFn: (row) => formatCageLabel({ id: row.system_id, label: row.system_name, unit: null }).toLowerCase(),
      sortDescFirst: false,
      meta: { width: "220px" },
      cell: ({ row }) => {
        const data = row.original
        const title = formatCageLabel({ id: data.system_id, label: data.system_name, unit: null })

        return (
          <span className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: identityDotColor(data.system_id) }}
            />
            <span className="min-w-0">
              <span title={title} className="block truncate text-sm font-semibold leading-5 text-foreground">{title}</span>
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
      meta: { width: "110px", align: "right" },
      cell: ({ row }) => {
        const data = row.original
        const value = metricValue(data.efcr, 2)
        if (value == null) return <NoData />
        return (
          <MetricCell
            href={productionHref(data.system_id, "efcr")}
            value={value}
            arrow={data.efcr_arrow}
            invertArrow
            // eFCR is only as current as the biomass it's measured against, so
            // its freshness tracks the last known ABW (latest sampling or
            // stocking) -- the same date the ABW column shows -- not the daily
            // production-summary date, which would look misleadingly fresh.
            subtext={formatLastDate(data.abw_latest_date)}
            align="right"
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
      meta: { width: "120px", unit: "g", align: "right" },
      cell: ({ row }) => {
        const data = row.original
        const value = metricValue(data.abw, 1)
        if (value == null) return <NoData />
        return (
          <MetricCell
            href={productionHref(data.system_id, "abw")}
            value={value}
            arrow={data.abw_arrow}
            subtext={formatLastDate(data.abw_latest_date)}
            align="right"
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
      meta: { width: "120px", unit: "%", align: "right" },
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
            align="right"
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
      meta: { width: "140px", unit: "%", align: "right" },
      cell: ({ row }) => {
        const data = row.original
        const value = metricValue(data.mortality_rate, 2)
        if (value == null) return <NoData />
        return (
          <MetricCell
            href={productionHref(data.system_id, "mortality")}
            value={<SeverityValue value={value} active={isMortalityCritical(data)} />}
            arrow={data.mortality_rate_arrow}
            invertArrow
            subtext={formatLastDate(data.mortality_rate_latest_date)}
            align="right"
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
      meta: { width: "120px", unit: "kg/m3", align: "right" },
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
            align="right"
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
          value={<WaterQualityFlagsCell row={row.original} size="table" />}
        />
      ),
    },
  ]
}
