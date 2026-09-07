"use client"

import Link from "next/link"
import { useCallback, useMemo, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Button } from "@/components/app-ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/data-states"
import TimePeriodSelector from "@/components/shared/time-period-selector"
import ProductionChart from "@/features/production/components/production-chart"
import ProductionMetricFilter from "@/features/production/components/metrics-filter"
import ProductionCompareFilter from "@/features/production/components/compare-filter"
import ProductionScopeFilter from "@/features/production/components/scope-filter"
import { parseProductionCompareMetric, parseProductionMetric, type ProductionMetric } from "@/features/production/components/metrics"
import { buildProductionTableColumns } from "@/features/production/components/production-table-columns"
import { buildProductionDailyMetricRows, buildProductionMetricRows } from "@/features/production/lib/production-page"
import { buildProductionPeriodViewRows } from "@/features/production/period-view"
import type { ProductionPageInitialData, ProductionPageFilters } from "@/features/production/queries.server"
import { formatCageLabel, type SystemOption } from "@/lib/system-options"
import { formatCustomRangeLabel, parseCustomPeriodUrlValue, TIME_PERIOD_LABELS, type TimePeriod } from "@/lib/time-period"
import { downloadCsv } from "@/lib/utils/report-export"
import { cn } from "@/lib/utils"

// Auto-generated stand-in batches from historical data reconstruction, e.g.
// "INFERRED-C4-2025-10-18" or "BATCH-7-2024-11-26". Real farm batches follow the
// farm's own codes (e.g. "02.26aK").
const SYNTHETIC_BATCH_NAME_RE = /^\s*(INFERRED-|BATCH-\d)/i
const isSyntheticBatchName = (name: string | null | undefined) =>
  typeof name === "string" && SYNTHETIC_BATCH_NAME_RE.test(name)

const PRODUCTION_DATE_TYPES: TimePeriod[] = [
  "day",
  "week",
  "2 weeks",
  "month",
  "quarter",
  "6 months",
  "year",
  "all history",
]

function ProductionPeriodFilter({
  selectedPeriod,
  startTransition,
}: {
  selectedPeriod: TimePeriod
  /** See ProductionMetricFilter's `startTransition` prop for why this exists. */
  startTransition?: (callback: () => void) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const customRange = useMemo(() => parseCustomPeriodUrlValue(searchParams.get("date")), [searchParams])

  const handleChange = (value: TimePeriod) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("date", value)
    const navigate = () => router.replace(`${pathname}?${params.toString()}`)
    if (startTransition) startTransition(navigate)
    else navigate()
  }

  const handleCustomRangeChange = (range: { start: string; end: string }) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("date", `custom_${range.start}_${range.end}`)
    const navigate = () => router.replace(`${pathname}?${params.toString()}`)
    if (startTransition) startTransition(navigate)
    else navigate()
  }

  return (
    <div className="min-w-[190px] shrink-0">
      <TimePeriodSelector
        selectedPeriod={selectedPeriod}
        onPeriodChange={handleChange}
        label={null}
        customRange={customRange}
        onCustomRangeChange={handleCustomRangeChange}
        variant="compact"
        periods={PRODUCTION_DATE_TYPES}
      />
    </div>
  )
}

export default function ProductionPageClient({
  initialFarmId,
  initialFarmName,
  initialFarmRole,
  initialFilters,
  initialData,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialFarmRole?: string | null
  initialFilters: ProductionPageFilters
  initialData: ProductionPageInitialData
}) {
  const searchParams = useSearchParams()
  // Filter changes (period/system/metric/compare) all write to the URL and
  // re-render this page from the server with fresh initialData -- there's no
  // client-side query to key a loading state off. Wrapping those navigations
  // in a transition gives the chart/table something real to show instead of
  // a hardcoded isLoading={false} that goes stale the moment a filter is
  // clicked.
  const [isPending, startTransition] = useTransition()
  const metric = parseProductionMetric(searchParams.get("filter"))
  const compareMetric = parseProductionCompareMetric(searchParams.get("compare"), metric)
  const allSystems = useMemo<SystemOption[]>(
    () => (initialData.systems.status === "success" ? initialData.systems.data : []),
    [initialData.systems],
  )
  const selectedSystemParam = searchParams.get("system") ?? searchParams.get("cage") ?? "all"
  const resolvedSelectedSystemId = initialData.systemId ?? null
  // "Batches" mode: the whole page reports per batch -- consolidated chart line
  // and a records table rolled up by batch (with a "Batch" column) rather than
  // by cage.
  const scopeMode: "cage" | "batch" =
    searchParams.get("scope") === "batch" || searchParams.get("batch") ? "batch" : "cage"
  // No specific cage picked -> the chart shows a consolidated line instead of a
  // single cage.
  const isConsolidated = selectedSystemParam === "all"
  const summaryRows = useMemo(
    () => (initialData.productionSummary.status === "success" ? initialData.productionSummary.data : []),
    [initialData.productionSummary],
  )
  const dailyTrendRows = useMemo(
    () => (initialData.dailyTrend.status === "success" ? initialData.dailyTrend.data : []),
    [initialData.dailyTrend],
  )
  const volumeBySystemId = useMemo(
    () => new Map((initialData.enrichment.volumeRows ?? []).map((row) => [row.id, row.volume ?? 0])),
    [initialData.enrichment.volumeRows],
  )
  const totalScopedVolumeM3 = useMemo(
    () => (initialData.enrichment.volumeRows ?? []).reduce((sum, row) => sum + (row.volume ?? 0), 0),
    [initialData.enrichment.volumeRows],
  )
  const growthBySystemDate = useMemo(
    () =>
      new Map(
        (initialData.enrichment.growthTrendRows ?? []).map((row) => [
          `${row.system_id}|${row.sample_date}`,
          { adgGDay: row.adg_g_day, sgrPctDay: row.sgr_pct_day },
        ]),
      ),
    [initialData.enrichment.growthTrendRows],
  )
  const feedTypeBySystemDate = useMemo(
    () =>
      new Map(
        (initialData.enrichment.feedingRecords ?? [])
          .filter((row) => typeof row.system_id === "number" && typeof row.date === "string")
          .map((row) => [`${row.system_id}|${row.date}`, row.feed_type?.feed_line ?? null]),
      ),
    [initialData.enrichment.feedingRecords],
  )
  // Per-cage rows: always drive the records table (and the single-cage daily
  // metric chart) from these.
  const viewRows = useMemo(
    () =>
      buildProductionPeriodViewRows({
        productionRows: summaryRows,
        consolidate: false,
        volumeBySystemId,
        growthBySystemDate,
        feedTypeBySystemDate,
        totalScopedVolumeM3,
      }),
    [feedTypeBySystemDate, growthBySystemDate, summaryRows, totalScopedVolumeM3, volumeBySystemId],
  )
  // Chart rows: one consolidated series per date when no single cage is picked,
  // otherwise the same per-cage rows.
  const chartViewRows = useMemo(
    () =>
      isConsolidated
        ? buildProductionPeriodViewRows({
            productionRows: summaryRows,
            consolidate: "farm",
            volumeBySystemId,
            growthBySystemDate,
            feedTypeBySystemDate,
            totalScopedVolumeM3,
          })
        : viewRows,
    [isConsolidated, viewRows, summaryRows, volumeBySystemId, growthBySystemDate, feedTypeBySystemDate, totalScopedVolumeM3],
  )
  // "All cages" / "All batches" with nothing else pinned.
  const isAllScope = selectedSystemParam === "all" && !searchParams.get("batch")
  // In an "All cages" / "All batches" view the records table lists the periodic
  // recorded events -- one row per sampling / stocking / transfer date -- rather
  // than the carried-forward "today" snapshot every cage emits (which just
  // stacks a wall of same-date rows). A single cage still shows its full
  // timeline including that live row.
  const periodicSummaryRows = useMemo(() => {
    // In the "All ..." view drop the data-repair placeholder batches
    // (INFERRED-*, BATCH-<n>-*) -- they aren't real production batches. A
    // specific cage or batch view keeps everything.
    const scoped = isAllScope
      ? summaryRows.filter((row) => !isSyntheticBatchName(row.batch_name))
      : summaryRows
    // Per cage: prefer the recorded sampling/stocking/transfer rows; keep the
    // live "current" row only for cages that have nothing else in the window,
    // so every stocked cage still shows up.
    const bySystem = new Map<number | string, typeof summaryRows>()
    for (const row of scoped) {
      const key = row.system_id ?? "unassigned"
      const bucket = bySystem.get(key)
      if (bucket) bucket.push(row)
      else bySystem.set(key, [row])
    }
    const out: typeof summaryRows = []
    for (const rows of bySystem.values()) {
      const events = rows.filter((row) => row.activity !== "current")
      out.push(...(events.length > 0 ? events : rows))
    }
    return out
  }, [summaryRows, isAllScope])
  // Records table rows: rolled up by batch in "Batches" mode, per cage otherwise.
  const tableViewRows = useMemo(() => {
    if (scopeMode === "batch") {
      return buildProductionPeriodViewRows({
        productionRows: periodicSummaryRows,
        consolidate: "batch",
        volumeBySystemId,
        growthBySystemDate,
        feedTypeBySystemDate,
        totalScopedVolumeM3,
      })
    }
    if (isConsolidated) {
      return buildProductionPeriodViewRows({
        productionRows: periodicSummaryRows,
        consolidate: false,
        volumeBySystemId,
        growthBySystemDate,
        feedTypeBySystemDate,
        totalScopedVolumeM3,
      })
    }
    return viewRows
  }, [
    scopeMode,
    isConsolidated,
    viewRows,
    periodicSummaryRows,
    volumeBySystemId,
    growthBySystemDate,
    feedTypeBySystemDate,
    totalScopedVolumeM3,
  ])
  const buildRowsForMetric = useCallback(
    (targetMetric: ProductionMetric) => {
      // The per-day trend RPC drops the cage id, so it can only be trusted for
      // a single cage -- consolidated views read the period-view rows instead.
      if (
        !isConsolidated &&
        (targetMetric === "abw" || targetMetric === "mortality" || targetMetric === "feeding" || targetMetric === "density") &&
        dailyTrendRows.length > 0
      ) {
        return buildProductionDailyMetricRows(dailyTrendRows, targetMetric, viewRows)
      }
      return buildProductionMetricRows(chartViewRows, targetMetric)
    },
    [isConsolidated, dailyTrendRows, viewRows, chartViewRows],
  )
  const chartRows = useMemo(() => buildRowsForMetric(metric), [buildRowsForMetric, metric])
  const compareChartRows = useMemo(
    () => (compareMetric ? buildRowsForMetric(compareMetric) : []),
    [buildRowsForMetric, compareMetric],
  )
  const markers = useMemo(() => initialData.markers ?? [], [initialData.markers])
  const tableRows = useMemo(
    () => [...tableViewRows].sort((left, right) => String(right.date).localeCompare(String(left.date))),
    [tableViewRows],
  )
  const tableColumns = useMemo(
    () => buildProductionTableColumns(scopeMode === "batch" ? "Batch" : "System"),
    [scopeMode],
  )
  const selectedSystemLabel = useMemo(() => {
    // Look up against the unfiltered list so a system that's since emptied
    // out still resolves its label correctly when viewed via a direct link.
    const match = allSystems.find((system) => system.id === resolvedSelectedSystemId)
    return match ? formatCageLabel(match) : null
  }, [allSystems, resolvedSelectedSystemId])
  const periodLabel = useMemo(() => {
    if (!initialData.bounds.start || !initialData.bounds.end) return null
    const rangeLabel = initialFilters.customTimeRange
      ? formatCustomRangeLabel(initialFilters.customTimeRange)
      : TIME_PERIOD_LABELS[initialFilters.timePeriod]
    if (scopeMode === "batch") {
      return `${rangeLabel} · ${initialData.batchName ?? "All batches"}`
    }
    if (selectedSystemLabel) return `${rangeLabel} · ${selectedSystemLabel}`
    return isConsolidated ? `${rangeLabel} · All cages` : rangeLabel
  }, [
    initialData.batchName,
    initialData.bounds.end,
    initialData.bounds.start,
    initialFilters.customTimeRange,
    initialFilters.timePeriod,
    isConsolidated,
    scopeMode,
    selectedSystemLabel,
  ])
  const addDataHref = resolvedSelectedSystemId != null ? `/data-entry?system=${resolvedSelectedSystemId}` : "/data-entry"
  const downloadRecords = useCallback(() => {
    downloadCsv({
      filename: `production-records-${selectedSystemLabel ?? (scopeMode === "batch" ? "batches" : "cages")}.csv`,
      headers: [
        "Date",
        scopeMode === "batch" ? "Batch" : "System",
        "Number of fish",
        "Total weight (kg)",
        "ABW (g)",
        "Biomass increase (kg)",
        "Feed amount (kg)",
        "eFCR periodic",
        "Daily mortality rate (%)",
      ],
      rows: tableRows.map((row) => [
        row.date,
        row.systemName,
        row.numberOfFish,
        row.biomassKg,
        row.abwG,
        row.growthKg,
        row.feedPeriodKg,
        row.periodEfcr,
        row.mortalityRatePct,
      ]),
    })
  }, [scopeMode, selectedSystemLabel, tableRows])

  return (
    <DashboardLayout
      hideHeader
      initialFarmId={initialFarmId}
      initialFarmName={initialFarmName}
      headerDataOverrides={{ role: initialFarmRole ?? null }}
    >
      <div className="page-shell">
        {allSystems.length === 0 ? (
          <EmptyState
            title="No systems available"
            description="Please add a system to view production data."
          />
        ) : (
          <>
            <section className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Production</h1>
              <div className="flex flex-wrap gap-2">
                <ProductionPeriodFilter selectedPeriod={initialFilters.timePeriod} startTransition={startTransition} />
                <Button asChild variant="secondary" className="h-10 px-4">
                  <Link href={addDataHref}>Add data</Link>
                </Button>
                <Button type="button" className="h-10 px-4" onClick={downloadRecords}>Download</Button>
              </div>
            </section>

            <div className="flex flex-wrap items-end gap-2">
              <ProductionScopeFilter
                initialFarmId={initialFarmId}
                startTransition={startTransition}
              />
              <div className="w-[200px] shrink-0 md:w-[210px]">
                <ProductionMetricFilter className="production-select" startTransition={startTransition} />
              </div>
              <ProductionCompareFilter
                primaryMetric={metric}
                compareMetric={compareMetric}
                startTransition={startTransition}
              />
            </div>

            <ProductionChart
              metric={metric}
              rows={chartRows}
              compareMetric={compareMetric}
              compareRows={compareChartRows}
              markers={markers}
              periodLabel={periodLabel}
              isLoading={isPending}
              onRetry={undefined}
            />

            <Card className="production-records-card rounded-2xl">
              <CardHeader className="pb-1">
                <CardTitle>Production records</CardTitle>
              </CardHeader>
              <CardContent className={cn("pt-2 transition-opacity duration-200", isPending && "opacity-50")}>
                <DataTable
                  columns={tableColumns}
                  data={tableRows}
                  rowKey={(row) => row.rowId}
                  emptyMessage="No production data available for the selected system and date range."
                  initialSorting={[{ id: "date", desc: true }]}
                  shellClassName="production-records-table"
                  tableClassName="md:min-w-[860px]"
                  priorityColumnIds={["date", "system", "biomassKg"]}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
