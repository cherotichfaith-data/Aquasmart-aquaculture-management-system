"use client"

import { useMemo, useState } from "react"
import { useFeedingRecords } from "@/lib/hooks/use-reports"
import { useProductionSummary } from "@/lib/hooks/use-production"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
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
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

const systemKey = (systemId: number) => `system_${systemId}`

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
  const chartLimit = 5000
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
  const loading = feedingRecordsQuery.isLoading || summaryQuery.isLoading
  const tableLoading = feedingTableQuery.isLoading
  const errorMessages = getCombinedQueryMessages(
    { error: feedingRecordsQuery.error, result: feedingRecordsQuery.data },
    { error: summaryQuery.error, result: summaryQuery.data },
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
    const byDateAndSystem = new Map<string, { weightedEfcr: number; weight: number; fallbackTotal: number; fallbackCount: number }>()

    summaryRows.forEach((row) => {
      if (!row.date || row.system_id == null || typeof row.efcr_period !== "number") return
      const compositeKey = `${row.date}|${row.system_id}`
      const bucket = byDateAndSystem.get(compositeKey) ?? { weightedEfcr: 0, weight: 0, fallbackTotal: 0, fallbackCount: 0 }
      const weight = row.biomass_increase_period ?? 0
      if (weight > 0) {
        bucket.weightedEfcr += row.efcr_period * weight
        bucket.weight += weight
      } else {
        bucket.fallbackTotal += row.efcr_period
        bucket.fallbackCount += 1
      }
      byDateAndSystem.set(compositeKey, bucket)
    })

    byDateAndSystem.forEach((bucket, compositeKey) => {
      const [date, rawSystemId] = compositeKey.split("|")
      const systemKeyValue = systemKey(Number(rawSystemId))
      const row = byDate.get(date) ?? { date }
      row[systemKeyValue] =
        bucket.weight > 0
          ? bucket.weightedEfcr / bucket.weight
          : bucket.fallbackCount > 0
            ? bucket.fallbackTotal / bucket.fallbackCount
            : null
      byDate.set(date, row)
    })

    return sortByDateAsc(Array.from(byDate.values()), (row) => String(row.date ?? ""))
  }, [summaryRows])

  const totalKgFed = useMemo(() => records.reduce((sum, row) => sum + (row.feeding_amount ?? 0), 0), [records])

  const avgProtein = useMemo(() => {
    const relevantRows = records.filter((row) => (row.feeding_amount ?? 0) > 0)
    if (relevantRows.some((row) => typeof row.feed_type?.crude_protein_percentage !== "number")) {
      return null
    }

    const weighted = relevantRows.reduce(
      (acc, row) => {
        const amount = row.feeding_amount ?? 0
        acc.proteinMass += (row.feed_type?.crude_protein_percentage ?? 0) * amount
        acc.amount += amount
        return acc
      },
      { proteinMass: 0, amount: 0 },
    )

    return weighted.amount > 0 ? weighted.proteinMass / weighted.amount : null
  }, [records])

  const avgEfcr = useMemo(() => {
    const aggregate = summaryRows.reduce(
      (acc, row) => {
        if (typeof row.efcr_period !== "number") return acc
        const weight = row.biomass_increase_period ?? 0
        if (weight > 0) {
          acc.weightedEfcr += row.efcr_period * weight
          acc.weight += weight
        } else {
          acc.fallbackTotal += row.efcr_period
          acc.fallbackCount += 1
        }
        return acc
      },
      { weightedEfcr: 0, weight: 0, fallbackTotal: 0, fallbackCount: 0 },
    )

    if (aggregate.weight > 0) return aggregate.weightedEfcr / aggregate.weight
    return aggregate.fallbackCount > 0 ? aggregate.fallbackTotal / aggregate.fallbackCount : null
  }, [summaryRows])

  const biomassGain = useMemo(() => {
    const vals = summaryRows.map((row) => row.biomass_increase_period).filter((v): v is number => typeof v === "number")
    return vals.reduce((a, b) => a + b, 0)
  }, [summaryRows])

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
      .map(([id, bucket]) => ({
        systemId: id,
        systemLabel: systemNameById.get(id) ?? `Cage ${id}`,
        totalKg: bucket.totalKg,
        entries: bucket.entries,
        avgProtein: bucket.proteinWeight > 0 ? bucket.proteinMass / bucket.proteinWeight : null,
        lastDate: bucket.lastDate,
      }))
      .sort((left, right) => right.totalKg - left.totalKg)
  }, [records, systemNameById])

  return (
    <AnalyticsSection
      errorTitle="Unable to load feeding report"
      errorMessage={errorMessages[0]}
      onRetry={() => {
        feedingRecordsQuery.refetch()
        summaryQuery.refetch()
        feedingTableQuery.refetch()
      }}
    >
      <FeedingSummaryCards totalKgFed={totalKgFed} avgEfcr={avgEfcr} avgProtein={avgProtein} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <FeedByCageSection loading={loading} rows={feedByCageRows} cageSeries={cageSeries} />
        <EfcrByCageSection loading={loading} rows={efcrByCageRows} cageSeries={cageSeries} />
      </div>
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
