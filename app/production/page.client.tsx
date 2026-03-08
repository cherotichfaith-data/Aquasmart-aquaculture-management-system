"use client"

import { Suspense, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams, useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import type { Enums } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { parseDateToTimePeriod, sortByDateAsc } from "@/lib/utils"
import type { TimePeriod } from "@/components/shared/time-period-selector"
import { useSharedFilters } from "@/hooks/use-shared-filters"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useProductionSummary } from "@/lib/hooks/use-production"
import { useDailyFishInventory } from "@/lib/hooks/use-inventory"
import { useSystemOptions } from "@/lib/hooks/use-options"
import { useBatchSystemIds } from "@/lib/hooks/use-reports"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import { getTimePeriodBounds } from "@/lib/api/dashboard"
import ProductionMetricFilter from "@/components/production/metrics-filter"
import ProductionChart from "@/components/production/production-chart"
import ProductionTable from "@/components/production/production-table"
import { PRODUCTION_METRICS, parseProductionMetric } from "@/components/production/metrics"

const parseStageParam = (value: string | null): "all" | Enums<"system_growth_stage"> => {
  if (value === "nursing" || value === "grow_out") return value
  return "all"
}

const formatDateLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed)
}

function ProductionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { farmId } = useActiveFarm()

  const metricParam = searchParams.get("metric")
  const filterParam = searchParams.get("filter")
  const startDateParam = searchParams.get("startDate")
  const endDateParam = searchParams.get("endDate")
  const paramSystem = searchParams.get("system") ?? "all"
  const paramStage = parseStageParam(searchParams.get("stage"))
  const periodParam = searchParams.get("period")
  const parsedPeriod = parseDateToTimePeriod(periodParam)
  const paramPeriod: TimePeriod = parsedPeriod.period
  const paramBatch = searchParams.get("batch") ?? "all"
  const hasUrlFilters = ["system", "stage", "period", "batch"].some((key) => searchParams.get(key) != null)

  const {
    selectedSystem,
    setSelectedSystem,
    selectedStage,
    setSelectedStage,
    timePeriod,
    setTimePeriod,
    selectedBatch,
    setSelectedBatch,
  } = useSharedFilters(paramPeriod)

  useEffect(() => {
    if (!hasUrlFilters) return
    setSelectedSystem(paramSystem)
    setSelectedStage(paramStage)
    setTimePeriod(paramPeriod)
    setSelectedBatch(paramBatch)
  }, [
    hasUrlFilters,
    paramBatch,
    paramPeriod,
    paramStage,
    paramSystem,
    setSelectedBatch,
    setSelectedStage,
    setSelectedSystem,
    setTimePeriod,
  ])

  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedSystem !== "all") params.set("system", selectedSystem)
    if (selectedStage !== "all") params.set("stage", selectedStage)
    params.set("period", timePeriod)
    if (selectedBatch !== "all") params.set("batch", selectedBatch)
    if (filterParam) params.set("filter", filterParam)
    if (metricParam) params.set("metric", metricParam)
    if (startDateParam) params.set("startDate", startDateParam)
    if (endDateParam) params.set("endDate", endDateParam)

    router.replace(`/production?${params.toString()}`)
  }, [
    selectedSystem,
    selectedStage,
    timePeriod,
    selectedBatch,
    router,
    metricParam,
    startDateParam,
    endDateParam,
    filterParam,
  ])

  const metricFilter = parseProductionMetric(filterParam)
  const metricMeta = PRODUCTION_METRICS[metricFilter]
  const systemId = selectedSystem !== "all" ? Number(selectedSystem) : undefined
  const batchId = selectedBatch !== "all" ? Number(selectedBatch) : undefined

  const boundsQuery = useQuery({
    queryKey: ["time-period-bounds", farmId ?? "all", timePeriod],
    queryFn: ({ signal }) => getTimePeriodBounds(timePeriod, signal, farmId ?? null),
    enabled: Boolean(farmId),
    staleTime: 5 * 60_000,
  })
  const hasBounds = Boolean(boundsQuery.data?.start && boundsQuery.data?.end)
  const dateRange = useMemo(() => {
    if (startDateParam && endDateParam) {
      return { startDate: startDateParam, endDate: endDateParam }
    }
    if (hasBounds) {
      return { startDate: boundsQuery.data?.start ?? "", endDate: boundsQuery.data?.end ?? "" }
    }
    return { startDate: "", endDate: "" }
  }, [endDateParam, hasBounds, startDateParam, boundsQuery.data])
  const rangeEnabled = Boolean(startDateParam && endDateParam) || hasBounds

  const systemOptionsQuery = useSystemOptions({
    farmId,
    stage: selectedStage,
    activeOnly: true,
  })
  const batchSystemIdsQuery = useBatchSystemIds({
    batchId: Number.isFinite(batchId) ? batchId : undefined,
  })

  const productionSummaryQuery = useProductionSummary({
    farmId,
    systemId: Number.isFinite(systemId) ? systemId : undefined,
    stage: selectedStage !== "all" ? selectedStage : undefined,
    dateFrom: dateRange.startDate || undefined,
    dateTo: dateRange.endDate || undefined,
    limit: 2500,
    enabled: rangeEnabled,
  })

  const inventoryEnabled = metricMeta.source === "inventory"
  const inventoryQuery = useDailyFishInventory({
    farmId,
    systemId: Number.isFinite(systemId) ? systemId : undefined,
    dateFrom: dateRange.startDate || undefined,
    dateTo: dateRange.endDate || undefined,
    limit: 5000,
    orderAsc: true,
    enabled: inventoryEnabled && rangeEnabled,
  })

  const stageSystemIds = useMemo(() => {
    if (selectedStage === "all") return null
    if (systemOptionsQuery.data?.status !== "success") return null
    const ids = systemOptionsQuery.data.data
      .map((row) => row.id)
      .filter((id): id is number => typeof id === "number")
    return ids
  }, [selectedStage, systemOptionsQuery.data])

  const batchSystemIds = useMemo(() => {
    if (selectedBatch === "all") return null
    if (batchSystemIdsQuery.data?.status !== "success") return null
    const ids = batchSystemIdsQuery.data.data
      .map((row) => row.system_id)
      .filter((id): id is number => typeof id === "number")
    return ids
  }, [batchSystemIdsQuery.data, selectedBatch])

  const scopedSystemIds = useMemo(() => {
    if (selectedSystem !== "all") return null
    if (!stageSystemIds && !batchSystemIds) return null
    const stageSet = stageSystemIds ? new Set(stageSystemIds) : null
    if (batchSystemIds) {
      if (!stageSet) return new Set(batchSystemIds)
      return new Set(batchSystemIds.filter((id) => stageSet.has(id)))
    }
    return stageSet
  }, [batchSystemIds, selectedSystem, stageSystemIds])

  const productionRowsRaw =
    productionSummaryQuery.data?.status === "success" ? productionSummaryQuery.data.data : []
  const inventoryRowsRaw =
    inventoryQuery.data?.status === "success" ? inventoryQuery.data.data : []

  const productionRows = useMemo(() => {
    let rows = productionRowsRaw
    if (scopedSystemIds) {
      rows = rows.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id))
    }
    return rows
  }, [productionRowsRaw, scopedSystemIds])

  const inventoryRows = useMemo(() => {
    let rows = inventoryRowsRaw
    if (scopedSystemIds) {
      rows = rows.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id))
    }
    return rows
  }, [inventoryRowsRaw, scopedSystemIds])

  const chartRows = useMemo(() => {
    const averageByDate = (
      items: Array<{ date: string; value: number | null }>,
    ) => {
      const byDate = new Map<string, { sum: number; count: number }>()
      items.forEach((item) => {
        if (!item.date || typeof item.value !== "number") return
        const current = byDate.get(item.date) ?? { sum: 0, count: 0 }
        current.sum += item.value
        current.count += 1
        byDate.set(item.date, current)
      })
      return Array.from(byDate.entries()).map(([date, current]) => ({
        date,
        value: current.count > 0 ? current.sum / current.count : null,
      }))
    }

    const weightedByDate = (
      items: Array<{ date: string; value: number | null; weight: number | null }>,
    ) => {
      const byDate = new Map<
        string,
        { weighted: number; weight: number; fallback: number; fallbackCount: number }
      >()
      items.forEach((item) => {
        if (!item.date || typeof item.value !== "number") return
        const current = byDate.get(item.date) ?? {
          weighted: 0,
          weight: 0,
          fallback: 0,
          fallbackCount: 0,
        }
        const weight = item.weight ?? 0
        if (weight > 0) {
          current.weighted += item.value * weight
          current.weight += weight
        } else {
          current.fallback += item.value
          current.fallbackCount += 1
        }
        byDate.set(item.date, current)
      })
      return Array.from(byDate.entries()).map(([date, current]) => ({
        date,
        value:
          current.weight > 0
            ? current.weighted / current.weight
            : current.fallbackCount > 0
              ? current.fallback / current.fallbackCount
              : null,
      }))
    }

    if (metricFilter === "efcr_periodic") {
      return weightedByDate(
        productionRows.map((row) => ({
          date: row.date ?? "",
          value: row.efcr_period ?? null,
          weight: row.total_feed_amount_period ?? null,
        })),
      )
    }
    if (metricFilter === "efcr_aggregated") {
      return weightedByDate(
        productionRows.map((row) => ({
          date: row.date ?? "",
          value: row.efcr_aggregated ?? null,
          weight: row.total_feed_amount_period ?? null,
        })),
      )
    }
    if (metricFilter === "abw") {
      return weightedByDate(
        productionRows.map((row) => ({
          date: row.date ?? "",
          value: row.average_body_weight ?? null,
          weight: row.number_of_fish_inventory ?? null,
        })),
      )
    }
    if (metricFilter === "mortality") {
      return averageByDate(
        inventoryRows.map((row) => ({
          date: row.inventory_date ?? "",
          value: row.mortality_rate ?? null,
        })),
      )
    }
    if (metricFilter === "feeding") {
      return averageByDate(
        inventoryRows.map((row) => ({
          date: row.inventory_date ?? "",
          value: row.feeding_rate ?? null,
        })),
      )
    }
    if (metricFilter === "density") {
      return averageByDate(
        inventoryRows.map((row) => ({
          date: row.inventory_date ?? "",
          value: row.biomass_density ?? null,
        })),
      )
    }
    return []
  }, [inventoryRows, metricFilter, productionRows])

  const formattedChartRows = useMemo(
    () =>
      sortByDateAsc(chartRows, (row) => row.date).map((row) => ({
        ...row,
        label: formatDateLabel(row.date),
      })),
    [chartRows],
  )

  const tableRows = useMemo(() => {
    const sorted = [...productionRows].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))
    return sorted
  }, [productionRows])

  const summaryError = getErrorMessage(productionSummaryQuery.error) ?? getQueryResultError(productionSummaryQuery.data)
  const inventoryError =
    inventoryEnabled ? getErrorMessage(inventoryQuery.error) ?? getQueryResultError(inventoryQuery.data) : null
  const chartError = metricMeta.source === "inventory" ? inventoryError : summaryError
  const chartUpdatedAt =
    metricMeta.source === "inventory"
      ? Math.max(inventoryQuery.dataUpdatedAt ?? 0, productionSummaryQuery.dataUpdatedAt ?? 0)
      : productionSummaryQuery.dataUpdatedAt
  const tableUpdatedAt = productionSummaryQuery.dataUpdatedAt

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">System-level Analysis</h1>
            <p className="text-muted-foreground">
              System-level detail view for production metrics and trend analysis.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ProductionMetricFilter />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Production Metrics</h2>
        <ProductionChart
          metric={metricFilter}
          rows={formattedChartRows}
          isLoading={metricMeta.source === "inventory" ? inventoryQuery.isLoading : productionSummaryQuery.isLoading}
          isFetching={metricMeta.source === "inventory" ? inventoryQuery.isFetching : productionSummaryQuery.isFetching}
          updatedAt={chartUpdatedAt}
          error={chartError}
          onRetry={() => {
            productionSummaryQuery.refetch()
            if (inventoryEnabled) inventoryQuery.refetch()
          }}
        />
        <ProductionTable
          rows={tableRows}
          isLoading={productionSummaryQuery.isLoading}
          isFetching={productionSummaryQuery.isFetching}
          updatedAt={tableUpdatedAt}
          error={summaryError}
          onRetry={() => productionSummaryQuery.refetch()}
        />
      </div>
    </div>
  )
}

export default function ProductionPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <ProductionContent />
      </Suspense>
    </DashboardLayout>
  )
}
