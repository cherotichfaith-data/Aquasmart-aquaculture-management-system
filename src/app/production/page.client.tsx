"use client"

import { Suspense, useCallback, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Button } from "@/components/app-ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { DataTable } from "@/components/shared/data-table"
import { DataErrorState, EmptyState } from "@/components/shared/data-states"
import TimePeriodSelector from "@/components/shared/time-period-selector"
import ProductionChart from "@/features/production/components/production-chart"
import ProductionCompareFilter from "@/features/production/components/compare-filter"
import ProductionMetricFilter from "@/features/production/components/metrics-filter"
import ProductionSystemFilter from "@/features/production/components/system-filter"
import { parseProductionMetric, type ProductionMetric } from "@/features/production/components/metrics"
import { productionTableColumns } from "@/features/production/components/production-table-columns"
import { buildProductionMetricRows } from "@/features/production/lib/production-page"
import { buildProductionPeriodViewRows } from "@/features/production/period-view"
import { useProductionSummary } from "@/features/production/hooks"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useTimePeriodBounds } from "@/lib/hooks/app/use-time-period-bounds"
import { useSystemOptions } from "@/lib/hooks/use-options"
import { formatCageLabel, resolveSystemIdFromFilterValue, type SystemOption } from "@/lib/system-options"
import { parseCustomPeriodUrlValue, resolveTimePeriod, toTimePeriodUrlValue, type TimePeriod } from "@/lib/time-period"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import { downloadCsv } from "@/lib/utils/report-export"
import type { SharedFiltersState } from "@/lib/hooks/app/use-shared-filters"

const LIVE_PRODUCTION_STALE_TIME_MS = 60_000

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

function ProductionPeriodFilter({ selectedPeriod }: { selectedPeriod: TimePeriod }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const customRange = useMemo(
    () => parseCustomPeriodUrlValue(searchParams.get("period")),
    [searchParams],
  )

  const handleChange = (value: TimePeriod) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("period", toTimePeriodUrlValue(value))
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleCustomRangeChange = (range: { start: string; end: string }) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("period", `custom_${range.start}_${range.end}`)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="min-w-[190px] shrink-0">
      <TimePeriodSelector
        selectedPeriod={selectedPeriod}
        onPeriodChange={handleChange}
        customRange={customRange}
        onCustomRangeChange={handleCustomRangeChange}
        variant="compact"
        periods={PRODUCTION_DATE_TYPES}
      />
    </div>
  )
}

function getSystemWithLowestId(systems: SystemOption[]): SystemOption | null {
  if (systems.length === 0) return null
  return systems.reduce((lowest, candidate) => (candidate.id < lowest.id ? candidate : lowest))
}

function ProductionContent({
  initialFarmId,
  initialFarmName,
  initialFilters,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialFilters?: Partial<SharedFiltersState>
}) {
  const searchParams = useSearchParams()
  const { farmId } = useActiveFarm({ initialFarmId, initialFarmName })

  const metric = parseProductionMetric(searchParams.get("filter"))
  const compareMetric = useMemo<ProductionMetric | null>(() => {
    const rawValue = searchParams.get("compare")
    if (!rawValue) return null
    const parsed = parseProductionMetric(rawValue)
    return parsed === metric ? null : parsed
  }, [metric, searchParams])
  // Time window and cage come from the shared header filters, which write
  // `?period=` and `?system=` to the URL — this page only reads them.
  const timePeriod = resolveTimePeriod(
    searchParams.get("period"),
    initialFilters?.timePeriod ?? "month",
  )
  const customTimeRange = useMemo(() => parseCustomPeriodUrlValue(searchParams.get("period")), [searchParams])

  // Same source as the shared header's cage filter: existing ACTIVE cages.
  const systemOptionsQuery = useSystemOptions({ farmId, activeOnly: true })
  const systems = useMemo<SystemOption[]>(
    () => (systemOptionsQuery.data?.status === "success" ? systemOptionsQuery.data.data : []),
    [systemOptionsQuery.data],
  )
  const systemsReady = systemOptionsQuery.data?.status === "success"

  // One system at a time: URL `?system=` (dashboard drill-down links land here),
  // falling back to the lowest-id system, like aquasmart-main.
  const urlSystemParam = searchParams.get("system") ?? searchParams.get("cage")
  const selectedSystemId = useMemo(() => {
    const resolved = resolveSystemIdFromFilterValue(urlSystemParam, systems)
    if (resolved != null) return resolved
    return getSystemWithLowestId(systems)?.id ?? null
  }, [systems, urlSystemParam])

  const boundsQuery = useTimePeriodBounds({
    farmId,
    timePeriod,
    customRange: customTimeRange,
    systemId: selectedSystemId ?? undefined,
    scope: "production",
    enabled: systemsReady && selectedSystemId != null,
  })

  const summaryQuery = useProductionSummary({
    farmId,
    systemId: selectedSystemId ?? undefined,
    dateFrom: boundsQuery.start ?? undefined,
    dateTo: boundsQuery.end ?? undefined,
    limit: 2500,
    enabled: boundsQuery.hasBounds && selectedSystemId != null,
    staleTime: LIVE_PRODUCTION_STALE_TIME_MS,
  })

  const summaryRows = useMemo(
    () => (summaryQuery.data?.status === "success" ? summaryQuery.data.data : []),
    [summaryQuery.data],
  )
  const viewRows = useMemo(
    () => buildProductionPeriodViewRows({ productionRows: summaryRows, consolidate: false }),
    [summaryRows],
  )
  const chartRows = useMemo(() => buildProductionMetricRows(viewRows, metric), [metric, viewRows])
  const compareChartRows = useMemo(
    () => (compareMetric ? buildProductionMetricRows(viewRows, compareMetric) : []),
    [compareMetric, viewRows],
  )
  const tableRows = useMemo(
    () => [...viewRows].sort((left, right) => String(right.date).localeCompare(String(left.date))),
    [viewRows],
  )
  const selectedSystemLabel = useMemo(() => {
    const match = systems.find((system) => system.id === selectedSystemId)
    return match ? formatCageLabel(match) : null
  }, [selectedSystemId, systems])
  const periodLabel = useMemo(() => {
    if (!boundsQuery.hasBounds) return null
    return `${boundsQuery.start} → ${boundsQuery.end}`
  }, [boundsQuery.hasBounds, boundsQuery.start, boundsQuery.end])

  const summaryError = getErrorMessage(summaryQuery.error) ?? getQueryResultError(summaryQuery.data)
  const systemsError = getErrorMessage(systemOptionsQuery.error) ?? getQueryResultError(systemOptionsQuery.data)
  const loading = !boundsQuery.hasBounds || summaryQuery.isLoading
  const addDataHref = selectedSystemId != null ? `/data-entry?system=${selectedSystemId}` : "/data-entry"
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

  if (systemsError) {
    return (
      <DataErrorState
        title="Unable to load systems"
        description={systemsError}
        onRetry={() => systemOptionsQuery.refetch()}
      />
    )
  }

  return (
    <main className="container flex flex-col gap-8 p-4 md:p-8">
      {systemsReady && systems.length === 0 ? (
        <EmptyState
          title="No systems available"
          description="Please add a system to view production data."
        />
      ) : (
        <>
          <section className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Production</h1>
            <div className="flex flex-wrap gap-2">
              <ProductionPeriodFilter selectedPeriod={timePeriod} />
              <Button asChild variant="secondary" className="h-10 px-4">
                <Link href={addDataHref}>Add data</Link>
              </Button>
              <Button type="button" className="h-10 px-4" onClick={downloadRecords}>Download</Button>
            </div>
          </section>

          <div className="flex flex-wrap items-end gap-2">
            <ProductionSystemFilter systems={systems} selectedSystemId={selectedSystemId} />
            <div className="w-[200px] shrink-0 md:w-[210px]">
              <ProductionMetricFilter className="production-select" />
            </div>
            <ProductionCompareFilter primaryMetric={metric} compareMetric={compareMetric} />
          </div>

          <ProductionChart
            metric={metric}
            rows={chartRows}
            compareMetric={compareMetric}
            compareRows={compareChartRows}
            periodLabel={periodLabel}
            isLoading={loading}
            isFetching={summaryQuery.isFetching}
            error={summaryError}
            onRetry={() => {
              void summaryQuery.refetch()
            }}
          />

          <Card className="production-records-card rounded-2xl">
            <CardHeader className="pb-1">
              <CardTitle>Production records</CardTitle>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Aggregated by date range · raw detail available via export
              </p>
            </CardHeader>
            <CardContent className="pt-2">
              {loading ? (
                <div className="h-[200px] animate-pulse rounded-lg bg-muted/50" />
              ) : (
                <DataTable
                  columns={productionTableColumns}
                  data={tableRows}
                  rowKey={(row) => `${row.date}|${row.systemName ?? ""}`}
                  emptyMessage="No production data available for the selected system and date range."
                  initialSorting={[{ id: "date", desc: true }]}
                  shellClassName="production-records-table"
                  tableClassName="min-w-[860px]"
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  )
}

export default function ProductionPage(props: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialFilters?: Partial<SharedFiltersState>
}) {
  return (
    <DashboardLayout hideHeader initialFarmId={props.initialFarmId} initialFarmName={props.initialFarmName}>
      <Suspense
        fallback={
          <main className="flex flex-col gap-5 p-5 md:p-8">
            <div className="h-10 w-[440px] max-w-full animate-pulse rounded-lg bg-muted/50" />
            <div className="h-[640px] animate-pulse rounded-2xl bg-muted/50" />
          </main>
        }
      >
        <ProductionContent {...props} />
      </Suspense>
    </DashboardLayout>
  )
}
