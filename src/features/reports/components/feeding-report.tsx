"use client"

import { useMemo, useState } from "react"
import { useProductionSummary } from "@/features/production/hooks"
import { useFeedingBreakdown, useFeedingRecords, useFeedingSummary } from "@/features/reports/hooks"
import { sortByDateAsc } from "@/lib/utils"
import { AnalyticsSection } from "@/components/shared/analytics-section"
import { getCombinedQueryMessages } from "@/lib/utils/query-result"
import {
  EfcrByCageSection,
  FeedingBreakdownSection,
  FeedingRecordsSection,
  FeedingSummaryCards,
  FeedByCageSection,
} from "./feeding-report-sections"

const CHART_COLORS = [
  "var(--primary)",
  "var(--success)",
  "var(--warning)",
  "var(--destructive)",
  "var(--muted-foreground)",
]

const systemKey = (systemId: number) => `system_${systemId}`

export default function FeedingReport({
  farmId,
  dateRange,
  systemId,
  batchId,
  farmName,
}: {
  farmId?: string | null
  dateRange?: { from: string; to: string }
  systemId?: number
  batchId?: number
  farmName?: string | null
}) {
  const chartLimit = 5000
  const [tableLimit, setTableLimit] = useState("100")
  const [showFeedingRecords, setShowFeedingRecords] = useState(false)
  const boundsReady = Boolean(dateRange?.from && dateRange?.to)

  const feedingRecordsQuery = useFeedingRecords({
    farmId,
    systemId,
    batchId,
    limit: chartLimit,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    enabled: boundsReady,
  })
  const productionSummaryQuery = useProductionSummary({
    farmId,
    systemId,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    enabled: boundsReady,
    limit: chartLimit,
  })
  const feedingSummaryQuery = useFeedingSummary({
    farmId,
    systemId,
    batchId,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    enabled: boundsReady,
  })
  const feedingBreakdownQuery = useFeedingBreakdown({
    farmId,
    systemId,
    batchId,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    enabled: boundsReady,
  })
  const tableLimitValue = Number.isFinite(Number(tableLimit)) ? Number(tableLimit) : 100
  const feedingTableQuery = useFeedingRecords({
    farmId,
    systemId,
    batchId,
    limit: tableLimitValue,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    enabled: boundsReady && showFeedingRecords,
  })

  const records = useMemo(
    () => (feedingRecordsQuery.data?.status === "success" ? feedingRecordsQuery.data.data : []),
    [feedingRecordsQuery.data],
  )
  const tableRecords = feedingTableQuery.data?.status === "success" ? feedingTableQuery.data.data : []
  const summaryRows = useMemo(
    () => (productionSummaryQuery.data?.status === "success" ? productionSummaryQuery.data.data : []),
    [productionSummaryQuery.data],
  )
  const summary = feedingSummaryQuery.data?.status === "success" ? feedingSummaryQuery.data.data[0] ?? null : null
  const breakdownRows = feedingBreakdownQuery.data?.status === "success" ? feedingBreakdownQuery.data.data : []
  const loading = feedingRecordsQuery.isLoading || productionSummaryQuery.isLoading || feedingSummaryQuery.isLoading
  const tableLoading = feedingTableQuery.isLoading || feedingBreakdownQuery.isLoading
  const errorMessages = getCombinedQueryMessages(
    { error: feedingRecordsQuery.error, result: feedingRecordsQuery.data },
    { error: productionSummaryQuery.error, result: productionSummaryQuery.data },
    { error: feedingSummaryQuery.error, result: feedingSummaryQuery.data },
    { error: feedingBreakdownQuery.error, result: feedingBreakdownQuery.data },
    { error: feedingTableQuery.error, result: feedingTableQuery.data },
  )

  const systemNameById = useMemo(() => {
    const map = new Map<number, string>()
    summaryRows.forEach((row) => {
      if (row.system_id == null) return
      map.set(row.system_id, row.system_name ?? `Cage ${row.system_id}`)
    })
    records.forEach((row) => {
      if (row.system_id == null || map.has(row.system_id)) return
      map.set(row.system_id, `Cage ${row.system_id}`)
    })
    return map
  }, [records, summaryRows])

  const cageSeries = useMemo(() => {
    const systemIds = Array.from(
      new Set(
        [...records.map((row) => row.system_id), ...summaryRows.map((row) => row.system_id)].filter(
          (value): value is number => typeof value === "number",
        ),
      ),
    ).sort((left, right) => left - right)

    return systemIds.map((id, index) => ({
      systemId: id,
      key: systemKey(id),
      label: systemNameById.get(id) ?? `Cage ${id}`,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))
  }, [records, summaryRows, systemNameById])

  const feedByCageRows = useMemo(() => {
    const byDate = new Map<string, Record<string, number | string>>()

    records.forEach((row) => {
      if (!row.date || row.system_id == null) return
      const key = systemKey(row.system_id)
      const bucket = byDate.get(row.date) ?? { date: row.date }
      bucket[key] = Number(bucket[key] ?? 0) + (row.feeding_amount ?? 0)
      byDate.set(row.date, bucket)
    })

    return sortByDateAsc(Array.from(byDate.values()), (row) => String(row.date ?? ""))
  }, [records])

  const efcrByCageRows = useMemo(() => {
    const byDate = new Map<string, Record<string, number | string | null>>()

    summaryRows.forEach((row) => {
      if (!row.date || row.system_id == null || typeof row.efcr_period !== "number") return
      const date = row.date
      const systemKeyValue = systemKey(row.system_id)
      const bucket = byDate.get(date) ?? { date }
      bucket[systemKeyValue] = row.efcr_period
      byDate.set(date, bucket)
    })

    return sortByDateAsc(Array.from(byDate.values()), (row) => String(row.date ?? ""))
  }, [summaryRows])

  return (
    <AnalyticsSection
      errorTitle="Unable to load feeding report"
      errorMessage={errorMessages[0]}
      onRetry={() => {
        feedingRecordsQuery.refetch()
        productionSummaryQuery.refetch()
        feedingSummaryQuery.refetch()
        feedingTableQuery.refetch()
      }}
    >
      <FeedingSummaryCards
        totalKgFed={summary?.total_kg_fed ?? 0}
        avgEfcr={summary?.average_efcr ?? null}
        avgProtein={summary?.average_protein_pct ?? null}
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <FeedByCageSection loading={loading} rows={feedByCageRows} cageSeries={cageSeries} />
        <EfcrByCageSection loading={loading} rows={efcrByCageRows} cageSeries={cageSeries} />
      </div>
      <FeedingBreakdownSection
        rows={breakdownRows.map((row) => ({
          systemId: row.system_id,
          systemLabel: row.system_label,
          totalKg: row.total_kg,
          entries: row.entries,
          avgProtein: row.avg_protein,
          lastDate: row.last_date,
        }))}
      />
      <FeedingRecordsSection
        tableLimit={tableLimit}
        onTableLimitChange={setTableLimit}
        showFeedingRecords={showFeedingRecords}
        onToggleRecords={() => setShowFeedingRecords((prev) => !prev)}
        dateRange={dateRange}
        farmName={farmName}
        totalKgFed={summary?.total_kg_fed ?? 0}
        avgEfcr={summary?.average_efcr ?? null}
        avgProtein={summary?.average_protein_pct ?? null}
        biomassGain={summary?.biomass_gain_kg ?? 0}
        tableRecords={tableRecords}
        records={records}
        tableLimitValue={tableLimitValue}
        tableLoading={tableLoading}
      />
    </AnalyticsSection>
  )
}
