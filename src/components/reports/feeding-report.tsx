"use client"

import { useMemo, useState } from "react"
import { useFeedingRecords } from "@/lib/hooks/use-reports"
import { useProductionSummary } from "@/lib/hooks/use-production"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { sortByDateAsc } from "@/lib/utils"
import { AnalyticsSection } from "@/components/shared/analytics-section"
import { getCombinedQueryMessages } from "@/lib/utils/query-result"
import {
  FeedingBreakdownSection,
  FeedingRecordsSection,
  FeedingStatusRow,
  FeedingSummaryCards,
  FeedingTrendSection,
} from "./feeding-report-sections"

export default function FeedingReport({
  dateRange,
  systemId,
  batchId,
  farmName,
}: {
  dateRange?: { from: string; to: string }
  systemId?: number
  batchId?: number
  farmName?: string | null
}) {
  const { farmId } = useActiveFarm()
  const chartLimit = 2000
  const [tableLimit, setTableLimit] = useState("100")
  const [showFeedingRecords, setShowFeedingRecords] = useState(false)
  const boundsReady = Boolean(dateRange?.from && dateRange?.to)
  const feedingRecordsQuery = useFeedingRecords({
    systemId,
    batchId,
    limit: chartLimit,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    enabled: boundsReady,
  })
  const summaryQuery = useProductionSummary({
    farmId,
    systemId,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    limit: chartLimit,
    enabled: boundsReady,
  })
  const tableLimitValue = Number.isFinite(Number(tableLimit)) ? Number(tableLimit) : 100
  const feedingTableQuery = useFeedingRecords({
    systemId,
    batchId,
    limit: tableLimitValue,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    enabled: boundsReady && showFeedingRecords,
  })
  const records = feedingRecordsQuery.data?.status === "success" ? feedingRecordsQuery.data.data : []
  const tableRecords = feedingTableQuery.data?.status === "success" ? feedingTableQuery.data.data : []
  const summaryRows = summaryQuery.data?.status === "success" ? summaryQuery.data.data : []
  const loading = feedingRecordsQuery.isLoading
  const tableLoading = feedingTableQuery.isLoading
  const errorMessages = getCombinedQueryMessages(
    { error: feedingRecordsQuery.error, result: feedingRecordsQuery.data },
    { error: summaryQuery.error, result: summaryQuery.data },
    { error: feedingTableQuery.error, result: feedingTableQuery.data },
  )
  const latestUpdatedAt = Math.max(
    feedingRecordsQuery.dataUpdatedAt ?? 0,
    summaryQuery.dataUpdatedAt ?? 0,
    feedingTableQuery.dataUpdatedAt ?? 0,
  )
  const chartRecords = useMemo(() => {
    const byDate = new Map<string, number>()
    records.forEach((row) => {
      if (!row.date) return
      byDate.set(row.date, (byDate.get(row.date) ?? 0) + (row.feeding_amount ?? 0))
    })
    return sortByDateAsc(
      Array.from(byDate.entries()).map(([date, feeding_amount]) => ({ date, feeding_amount })),
      (row) => row.date,
    )
  }, [records])
  const efficiencyTrendRows = useMemo(() => {
    const byDate = new Map<string, { weightedEfcr: number; weight: number; fallbackTotal: number; fallbackCount: number }>()
    summaryRows.forEach((row) => {
      if (!row.date || typeof row.efcr_period !== "number") return
      const bucket = byDate.get(row.date) ?? { weightedEfcr: 0, weight: 0, fallbackTotal: 0, fallbackCount: 0 }
      const weight = row.total_feed_amount_period ?? 0
      if (weight > 0) {
        bucket.weightedEfcr += row.efcr_period * weight
        bucket.weight += weight
      } else {
        bucket.fallbackTotal += row.efcr_period
        bucket.fallbackCount += 1
      }
      byDate.set(row.date, bucket)
    })

    return sortByDateAsc(
      Array.from(byDate.entries()).map(([date, bucket]) => ({
        date,
        efcr_period:
          bucket.weight > 0
            ? bucket.weightedEfcr / bucket.weight
            : bucket.fallbackCount > 0
              ? bucket.fallbackTotal / bucket.fallbackCount
              : null,
      })),
      (row) => row.date,
    )
  }, [summaryRows])

  const totalKgFed = useMemo(() => records.reduce((sum, row) => sum + (row.feeding_amount ?? 0), 0), [records])
  const avgProtein = useMemo(() => {
    const weighted = records.reduce(
      (acc, row) => {
        const p = row.feed_type?.crude_protein_percentage
        const amount = row.feeding_amount ?? 0
        if (typeof p === "number") {
          acc.proteinMass += p * amount
          acc.amount += amount
        }
        return acc
      },
      { proteinMass: 0, amount: 0 },
    )
    return weighted.amount > 0 ? weighted.proteinMass / weighted.amount : null
  }, [records])
  const avgEfcr = useMemo(() => {
    const vals = summaryRows.map((row) => row.efcr_period).filter((v): v is number => typeof v === "number")
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }, [summaryRows])
  const biomassGain = useMemo(() => {
    const vals = summaryRows.map((row) => row.biomass_increase_period).filter((v): v is number => typeof v === "number")
    return vals.reduce((a, b) => a + b, 0)
  }, [summaryRows])
  const costPerKgGainDisplay = totalKgFed > 0 && biomassGain > 0 ? "Awaiting cost data" : "N/A"
  const systemBreakdownRows = useMemo(() => {
    const bySystem = new Map<number, { totalKg: number; entries: number; proteinMass: number; proteinWeight: number; lastDate: string | null }>()
    records.forEach((row) => {
      if (row.system_id == null) return
      const bucket = bySystem.get(row.system_id) ?? {
        totalKg: 0,
        entries: 0,
        proteinMass: 0,
        proteinWeight: 0,
        lastDate: null,
      }
      const amount = row.feeding_amount ?? 0
      bucket.totalKg += amount
      bucket.entries += 1
      if (typeof row.feed_type?.crude_protein_percentage === "number") {
        bucket.proteinMass += row.feed_type.crude_protein_percentage * amount
        bucket.proteinWeight += amount
      }
      if (!bucket.lastDate || String(row.date ?? "") > bucket.lastDate) {
        bucket.lastDate = row.date ?? null
      }
      bySystem.set(row.system_id, bucket)
    })
    return Array.from(bySystem.entries())
      .map(([systemId, bucket]) => ({
        systemId,
        totalKg: bucket.totalKg,
        entries: bucket.entries,
        avgProtein: bucket.proteinWeight > 0 ? bucket.proteinMass / bucket.proteinWeight : null,
        lastDate: bucket.lastDate,
      }))
      .sort((left, right) => right.totalKg - left.totalKg)
  }, [records])

  return (
    <AnalyticsSection
      errorTitle="Unable to load feeding report"
      errorMessage={errorMessages[0]}
      onRetry={() => {
        feedingRecordsQuery.refetch()
        summaryQuery.refetch()
        feedingTableQuery.refetch()
      }}
      statusContent={
        <FeedingStatusRow
          latestUpdatedAt={latestUpdatedAt}
          recordsCount={records.length}
          systemCount={systemBreakdownRows.length}
          isFetching={feedingRecordsQuery.isFetching || summaryQuery.isFetching || feedingTableQuery.isFetching}
          isLoading={loading}
        />
      }
    >
      <FeedingSummaryCards totalKgFed={totalKgFed} avgEfcr={avgEfcr} avgProtein={avgProtein} costPerKgGainDisplay={costPerKgGainDisplay} />
      <FeedingTrendSection title="Feeding Amounts Over Time" description="Daily feeding records from the backend" legendLabel="Feed (kg)" stroke="var(--color-chart-1)" loading={loading} rows={chartRecords} dataKey="feeding_amount" valueSuffix=" kg" name="Feed (kg)" />
      <FeedingTrendSection title="Feed Efficiency Trend" description="Daily eFCR trend from `api_production_summary`, limited to systems with resolved production timelines." legendLabel="eFCR" stroke="var(--color-chart-3)" loading={loading} rows={efficiencyTrendRows} dataKey="efcr_period" valueSuffix="" name="eFCR" />
      <FeedingBreakdownSection rows={systemBreakdownRows} />
      <FeedingRecordsSection
        tableLimit={tableLimit}
        onTableLimitChange={setTableLimit}
        showFeedingRecords={showFeedingRecords}
        onToggleRecords={() => setShowFeedingRecords((prev) => !prev)}
        dateRange={dateRange}
        farmName={farmName}
        totalKgFed={totalKgFed}
        avgEfcr={avgEfcr}
        avgProtein={avgProtein}
        biomassGain={biomassGain}
        tableRecords={tableRecords}
        records={records}
        tableLimitValue={tableLimitValue}
        tableLoading={tableLoading}
      />
    </AnalyticsSection>
  )
}
