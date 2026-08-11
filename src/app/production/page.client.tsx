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
import ProductionSystemFilter from "@/features/production/components/system-filter"
import { parseProductionCompareMetric, parseProductionMetric, type ProductionMetric } from "@/features/production/components/metrics"
import { productionTableColumns } from "@/features/production/components/production-table-columns"
import { useStockedSystemIds } from "@/lib/hooks/use-stocked-system-ids"
import { buildProductionDailyMetricRows, buildProductionMetricRows } from "@/features/production/lib/production-page"
import { buildProductionPeriodViewRows } from "@/features/production/period-view"
import type { ProductionPageInitialData, ProductionPageFilters } from "@/features/production/queries.server"
import { formatCageLabel, type SystemOption } from "@/lib/system-options"
import { formatCustomRangeLabel, parseCustomPeriodUrlValue, TIME_PERIOD_LABELS, type TimePeriod } from "@/lib/time-period"
import { downloadCsv } from "@/lib/utils/report-export"
import { cn } from "@/lib/utils"

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
    startTransition ? startTransition(navigate) : navigate()
  }

  const handleCustomRangeChange = (range: { start: string; end: string }) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("date", `custom_${range.start}_${range.end}`)
    const navigate = () => router.replace(`${pathname}?${params.toString()}`)
    startTransition ? startTransition(navigate) : navigate()
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
  // The filter should only offer cages that currently hold fish -- once a
  // cage is fully harvested or emptied out it drops out until restocked.
  const { stockedIds: stockedSystemIds } = useStockedSystemIds(initialFarmId)
  const systems = useMemo(
    () => allSystems.filter((system) => stockedSystemIds.has(system.id)),
    [allSystems, stockedSystemIds],
  )
  const resolvedSelectedSystemId = initialData.systemId ?? null
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
  const buildRowsForMetric = useCallback(
    (targetMetric: ProductionMetric) => {
      if (
        (targetMetric === "abw" || targetMetric === "mortality" || targetMetric === "feeding" || targetMetric === "density") &&
        dailyTrendRows.length > 0
      ) {
        return buildProductionDailyMetricRows(dailyTrendRows, targetMetric, viewRows)
      }
      return buildProductionMetricRows(viewRows, targetMetric)
    },
    [dailyTrendRows, viewRows],
  )
  const chartRows = useMemo(() => buildRowsForMetric(metric), [buildRowsForMetric, metric])
  const compareChartRows = useMemo(
    () => (compareMetric ? buildRowsForMetric(compareMetric) : []),
    [buildRowsForMetric, compareMetric],
  )
  const markers = useMemo(() => initialData.markers ?? [], [initialData.markers])
  const tableRows = useMemo(
    () => [...viewRows].sort((left, right) => String(right.date).localeCompare(String(left.date))),
    [viewRows],
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
    return selectedSystemLabel ? `${rangeLabel} · ${selectedSystemLabel}` : rangeLabel
  }, [
    initialData.bounds.end,
    initialData.bounds.start,
    initialFilters.customTimeRange,
    initialFilters.timePeriod,
    selectedSystemLabel,
  ])
  const addDataHref = resolvedSelectedSystemId != null ? `/data-entry?system=${resolvedSelectedSystemId}` : "/data-entry"
  const downloadRecords = useCallback(() => {
    downloadCsv({
      filename: `production-records-${selectedSystemLabel ?? "system"}.csv`,
      headers: [
        "Date",
        "System",
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
  }, [selectedSystemLabel, tableRows])

  return (
    <DashboardLayout
      hideHeader
      initialFarmId={initialFarmId}
      initialFarmName={initialFarmName}
      headerDataOverrides={{ role: initialFarmRole ?? null }}
    >
      <main className="container mx-auto flex flex-col gap-8 p-4 md:p-8">
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
              <ProductionSystemFilter
                systems={systems}
                selectedSystemId={resolvedSelectedSystemId}
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
                  columns={productionTableColumns}
                  data={tableRows}
                  rowKey={(row) => `${row.date}|${row.systemName ?? ""}`}
                  emptyMessage="No production data available for the selected system and date range."
                  initialSorting={[{ id: "date", desc: true }]}
                  shellClassName="production-records-table"
                  tableClassName="min-w-[860px]"
                />
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </DashboardLayout>
  )
}
