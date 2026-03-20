"use client"

import { useMemo, useState } from "react"
import { useMortalityEvents } from "@/lib/hooks/use-mortality"
import { useDailyFishInventory } from "@/lib/hooks/use-inventory"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { sortByDateAsc } from "@/lib/utils"
import { AnalyticsSection } from "@/components/shared/analytics-section"
import { getCombinedQueryMessages } from "@/lib/utils/query-result"
import { MORTALITY_CAUSES, type MortalityCause } from "@/lib/types/mortality"
import {
  MortalityCauseSections,
  MortalityRecordsSection,
  MortalitySummaryCards,
  MortalityTrendSection,
} from "./mortality-report-sections"

const CAUSE_LABELS: Record<MortalityCause, string> = {
  unknown: "Unknown",
  hypoxia: "Low DO / Hypoxia",
  disease: "Disease",
  injury: "Injury",
  handling: "Handling stress",
  predator: "Predator",
  starvation: "Starvation",
  temperature: "Temperature",
  other: "Other",
}

export default function MortalityReport({
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
  const [showMortalityRecords, setShowMortalityRecords] = useState(false)
  const boundsReady = Boolean(dateRange?.from && dateRange?.to)
  const mortalityQuery = useMortalityEvents({
    farmId,
    systemId,
    batchId,
    limit: chartLimit,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    enabled: boundsReady,
  })
  const inventoryQuery = useDailyFishInventory({
    farmId,
    systemId,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    limit: chartLimit,
    enabled: boundsReady,
  })
  const tableLimitValue = Number.isFinite(Number(tableLimit)) ? Number(tableLimit) : 100
  const mortalityTableQuery = useMortalityEvents({
    farmId,
    systemId,
    batchId,
    limit: tableLimitValue,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    enabled: boundsReady && showMortalityRecords,
  })
  const rows = mortalityQuery.data?.status === "success" ? mortalityQuery.data.data : []
  const tableRows = mortalityTableQuery.data?.status === "success" ? mortalityTableQuery.data.data : []
  const inventoryRows = inventoryQuery.data?.status === "success" ? inventoryQuery.data.data : []
  const loading = mortalityQuery.isLoading
  const tableLoading = mortalityTableQuery.isLoading
  const errorMessages = getCombinedQueryMessages(
    { error: mortalityQuery.error, result: mortalityQuery.data },
    { error: inventoryQuery.error, result: inventoryQuery.data },
    { error: mortalityTableQuery.error, result: mortalityTableQuery.data },
  )
  const latestUpdatedAt = Math.max(
    mortalityQuery.dataUpdatedAt ?? 0,
    inventoryQuery.dataUpdatedAt ?? 0,
    mortalityTableQuery.dataUpdatedAt ?? 0,
  )
  const chartRows = useMemo(() => {
    const byDate = new Map<string, number>()
    rows.forEach((row) => {
      if (!row.date) return
      byDate.set(row.date, (byDate.get(row.date) ?? 0) + (row.number_of_fish_mortality ?? 0))
    })
    return sortByDateAsc(
      Array.from(byDate.entries()).map(([date, dead_count]) => ({ date, dead_count })),
      (row) => row.date,
    )
  }, [rows])

  const latest = rows[0]
  const totalMortality = useMemo(
    () => rows.reduce((sum, row) => sum + (row.number_of_fish_mortality ?? 0), 0),
    [rows],
  )
  const totalInventory = useMemo(
    () => inventoryRows.reduce((sum, row) => sum + (row.number_of_fish ?? 0), 0),
    [inventoryRows],
  )
  const mortalityPercent = totalInventory > 0 ? (totalMortality / totalInventory) * 100 : null

  const causeBreakdown = useMemo(
    () =>
      MORTALITY_CAUSES.map((cause) => ({
        cause,
        label: CAUSE_LABELS[cause],
        count: rows
          .filter((row) => row.cause === cause)
          .reduce((sum, row) => sum + (row.number_of_fish_mortality ?? 0), 0),
      })).filter((row) => row.count > 0),
    [rows],
  )

  return (
    <AnalyticsSection
      errorTitle="Unable to load mortality report"
      errorMessage={errorMessages[0]}
      onRetry={() => {
        mortalityQuery.refetch()
        inventoryQuery.refetch()
        mortalityTableQuery.refetch()
      }}
      updatedAt={latestUpdatedAt}
      isFetching={mortalityQuery.isFetching || inventoryQuery.isFetching || mortalityTableQuery.isFetching}
      isLoading={loading}
    >
      <MortalitySummaryCards
        latestDate={latest?.date}
        totalMortality={totalMortality}
        mortalityPercent={mortalityPercent}
        massEventCount={rows.filter((row) => row.is_mass_mortality).length}
      />
      <MortalityTrendSection loading={loading} chartRows={chartRows} />
      <MortalityCauseSections causeBreakdown={causeBreakdown} />
      <MortalityRecordsSection
        tableLimit={tableLimit}
        onTableLimitChange={setTableLimit}
        showMortalityRecords={showMortalityRecords}
        onToggleRecords={() => setShowMortalityRecords((prev) => !prev)}
        dateRange={dateRange}
        farmName={farmName}
        totalMortality={totalMortality}
        mortalityPercent={mortalityPercent}
        causeBreakdown={causeBreakdown}
        tableRows={tableRows}
        rows={rows}
        tableLimitValue={tableLimitValue}
        tableLoading={tableLoading}
        causeLabels={CAUSE_LABELS}
      />
    </AnalyticsSection>
  )
}
