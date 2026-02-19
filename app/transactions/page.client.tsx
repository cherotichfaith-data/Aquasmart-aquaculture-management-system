"use client"

import { useMemo, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FarmSelector from "@/components/shared/farm-selector"
import { useRecentActivities, useSystemsTable } from "@/lib/hooks/use-dashboard"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useSharedFilters } from "@/hooks/use-shared-filters"
import { useSystemOptions } from "@/lib/hooks/use-options"
import TimePeriodSelector from "@/components/shared/time-period-selector"
import { getDateRangeFromPeriod } from "@/lib/utils"
import {
  EVENT_LABEL,
  normalizeTableName,
  operatorColumnNames,
  parseNumber,
  parseOperatorId,
  systemColumnNames,
  type ActivityType,
  type ConsolidatedActivity,
  type OperatorSummary,
} from "./transactions-utils"
import {
  ConsolidatedActivityFeedTable,
  OperatorActivityTable,
  SystemPerformanceByActivityTable,
  TransactionsSummaryCards,
} from "./transactions-sections"

export default function TransactionsPage() {
  const { farmId } = useActiveFarm()
  const {
    selectedBatch,
    setSelectedBatch,
    selectedSystem,
    setSelectedSystem,
    selectedStage,
    setSelectedStage,
    timePeriod,
    setTimePeriod,
  } = useSharedFilters("month")
  const [selectedEventType, setSelectedEventType] = useState<ActivityType>("all")
  const [selectedOperator, setSelectedOperator] = useState<string>("all")
  const asOfActivityQuery = useRecentActivities({ limit: 1 })
  const asOfDate = useMemo(() => {
    const rows = asOfActivityQuery.data?.status === "success" ? asOfActivityQuery.data.data : []
    return rows[0]?.change_time?.slice(0, 10) ?? null
  }, [asOfActivityQuery.data])
  const { startDate: dateFrom, endDate: dateTo } = useMemo(
    () => getDateRangeFromPeriod(timePeriod, asOfDate),
    [asOfDate, timePeriod],
  )

  const activitiesQuery = useRecentActivities({
    dateFrom: dateFrom ? `${dateFrom}T00:00:00` : undefined,
    dateTo: dateTo ? `${dateTo}T23:59:59` : undefined,
    limit: 2000,
  })

  const systemsQuery = useSystemOptions({ farmId, stage: selectedStage, activeOnly: true })
  const systemsTableQuery = useSystemsTable({
    farmId,
    stage: selectedStage,
    batch: selectedBatch,
    system: selectedSystem,
    timePeriod: "2 weeks",
    periodParam: dateFrom && dateTo ? `custom_${dateFrom}_${dateTo}` : undefined,
  })

  const systemOptions = systemsQuery.data?.status === "success" ? systemsQuery.data.data : []
  const systemLabelById = useMemo(() => {
    const map = new Map<number, string>()
    systemOptions.forEach((s) => {
      if (s.id != null) map.set(s.id, s.label ?? `System ${s.id}`)
    })
    return map
  }, [systemOptions])

  const systemStageById = useMemo(() => {
    const map = new Map<number, string | null | undefined>()
    systemOptions.forEach((s) => {
      if (s.id != null) map.set(s.id, s.growth_stage)
    })
    return map
  }, [systemOptions])

  const consolidatedActivities = useMemo<ConsolidatedActivity[]>(() => {
    const raw = activitiesQuery.data?.status === "success" ? activitiesQuery.data.data : []
    const grouped = new Map<
      string,
      {
        tableName: string
        recordId: string
        changeType: string
        changeTime: string
        columns: Map<string, string | null>
      }
    >()

    raw.forEach((row) => {
      const timeBucket = String(row.change_time ?? "").slice(0, 19)
      const key = `${row.table_name}|${row.record_id}|${row.change_type}|${timeBucket}`
      const existing = grouped.get(key)
      if (!existing) {
        grouped.set(key, {
          tableName: row.table_name,
          recordId: row.record_id,
          changeType: row.change_type,
          changeTime: row.change_time,
          columns: new Map<string, string | null>(),
        })
      }
      const entry = grouped.get(key)
      if (!entry) return
      if (row.column_name) {
        entry.columns.set(row.column_name, row.new_value)
      }
    })

    return Array.from(grouped.entries())
      .map(([id, row]) => {
        const normalizedType = normalizeTableName(row.tableName)
        const columnsChanged = Array.from(row.columns.keys())
        const systemIds = systemColumnNames
          .map((name) => parseNumber(row.columns.get(name) ?? null))
          .filter((v): v is number => typeof v === "number")

        const batchId = parseNumber(row.columns.get("batch_id") ?? null)
        const operatorColumn = Array.from(row.columns.entries()).find(([name]) => operatorColumnNames.has(name))
        const operatorId = parseOperatorId(operatorColumn?.[1] ?? null)
        const operatorLabel = operatorId ?? "Untracked"

        const feedAmount = parseNumber(row.columns.get("feed_amount") ?? null)
        const detail = columnsChanged.length
          ? `${row.changeType}: ${columnsChanged.slice(0, 3).join(", ")}${columnsChanged.length > 3 ? "..." : ""}`
          : row.changeType

        return {
          id,
          recordId: row.recordId,
          tableName: row.tableName,
          normalizedType,
          changeType: row.changeType,
          changeTime: row.changeTime,
          details: detail,
          systemIds,
          batchId,
          operatorId,
          operatorLabel,
          columnsChanged,
          amountKg: normalizedType === "feed_incoming" ? feedAmount : null,
        }
      })
      .sort((a, b) => String(b.changeTime).localeCompare(String(a.changeTime)))
  }, [activitiesQuery.data])

  const filteredActivities = useMemo(() => {
    return consolidatedActivities
      .filter((row) => (selectedEventType === "all" ? true : row.normalizedType === selectedEventType))
      .filter((row) => {
        if (selectedOperator === "all") return true
        if (selectedOperator === "untracked") return !row.operatorId
        return row.operatorId === selectedOperator
      })
      .filter((row) => {
        if (selectedSystem === "all") return true
        return row.systemIds.some((id) => String(id) === selectedSystem)
      })
      .filter((row) => {
        if (selectedBatch === "all") return true
        return String(row.batchId ?? "") === selectedBatch
      })
      .filter((row) => {
        if (selectedStage === "all") return true
        if (!row.systemIds.length) return false
        return row.systemIds.some((id) => systemStageById.get(id) === selectedStage)
      })
  }, [consolidatedActivities, selectedEventType, selectedOperator, selectedSystem, selectedBatch, selectedStage, systemStageById])

  const summary = useMemo(() => {
    const byType = new Map<ActivityType, number>()
    filteredActivities.forEach((row) => {
      byType.set(row.normalizedType, (byType.get(row.normalizedType) ?? 0) + 1)
    })

    const totalFeedPurchasedKg = filteredActivities
      .filter((row) => row.normalizedType === "feed_incoming")
      .reduce((sum, row) => sum + (row.amountKg ?? 0), 0)

    return {
      totalActivities: filteredActivities.length,
      feedPurchasedKg: totalFeedPurchasedKg,
      mortalityIncidents: byType.get("fish_mortality") ?? 0,
      samplingCount: byType.get("fish_sampling_weight") ?? 0,
      byType,
    }
  }, [filteredActivities])

  const operatorSummaries = useMemo<OperatorSummary[]>(() => {
    const grouped = new Map<string, OperatorSummary>()
    filteredActivities.forEach((row) => {
      const key = row.operatorId ?? "untracked"
      const current = grouped.get(key) ?? {
        operatorId: key,
        operatorLabel: row.operatorLabel,
        total: 0,
        feeds: 0,
        mortalities: 0,
        samplings: 0,
        systemsTouched: 0,
      }
      current.total += 1
      if (row.normalizedType === "feeding_record") current.feeds += 1
      if (row.normalizedType === "fish_mortality") current.mortalities += 1
      if (row.normalizedType === "fish_sampling_weight") current.samplings += 1
      current.systemsTouched += new Set(row.systemIds).size
      grouped.set(key, current)
    })

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total)
  }, [filteredActivities])

  const systemActivityRows = useMemo(() => {
    const systemKpis = systemsTableQuery.data?.rows ?? []
    const activityBySystem = new Map<number, { total: number; operators: Set<string> }>()

    filteredActivities.forEach((row) => {
      row.systemIds.forEach((systemId) => {
        const current = activityBySystem.get(systemId) ?? { total: 0, operators: new Set<string>() }
        current.total += 1
        if (row.operatorId) current.operators.add(row.operatorId)
        activityBySystem.set(systemId, current)
      })
    })

    return systemKpis.map((system) => {
      const activity = activityBySystem.get(system.system_id)
      const total = activity?.total ?? 0
      const operatorCount = activity?.operators.size ?? 0
      const turnoverFlag = operatorCount >= 4
      return {
        systemId: system.system_id,
        systemName: system.system_name ?? systemLabelById.get(system.system_id) ?? `System ${system.system_id}`,
        activities: total,
        operators: operatorCount,
        turnoverFlag,
        mortalityRate: system.mortality_rate,
        efcr: system.efcr,
      }
    })
  }, [filteredActivities, systemLabelById, systemsTableQuery.data])

  const operatorOptions = useMemo(() => {
    const unique = new Set<string>()
    consolidatedActivities.forEach((row) => {
      if (row.operatorId) unique.add(row.operatorId)
    })
    return Array.from(unique)
  }, [consolidatedActivities])

  const exportOperatorCsv = () => {
    const headers = ["operator_id", "operator_label", "total_activities", "feeding", "mortality", "sampling", "systems_touched"]
    const rows = operatorSummaries.map((row) => [
      row.operatorId,
      row.operatorLabel,
      String(row.total),
      String(row.feeds),
      String(row.mortalities),
      String(row.samplings),
      String(row.systemsTouched),
    ])
    const csv = [headers, ...rows]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `operator-activity-report-${dateFrom}-to-${dateTo}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const loading = activitiesQuery.isLoading || systemsQuery.isLoading

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold">Transactions and Activity Log</h1>
            <p className="text-muted-foreground mt-1">Chronological farm activity feed with operator and system analysis.</p>
          </div>

          <FarmSelector
            selectedBatch={selectedBatch}
            selectedSystem={selectedSystem}
            selectedStage={selectedStage}
            onBatchChange={setSelectedBatch}
            onSystemChange={setSelectedSystem}
            onStageChange={setSelectedStage}
          />

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value as ActivityType)}
            >
              {Object.entries(EVENT_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
            >
              <option value="all">All Operators</option>
              <option value="untracked">Untracked Operators</option>
              {operatorOptions.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>

            <div className="md:col-span-2 flex items-center">
              <TimePeriodSelector selectedPeriod={timePeriod} onPeriodChange={setTimePeriod} />
            </div>
            <button
              className="px-3 py-2 rounded-md border border-border text-sm hover:bg-muted/40"
              onClick={() => {
                setSelectedEventType("all")
                setSelectedOperator("all")
                setTimePeriod("month")
              }}
              type="button"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <TransactionsSummaryCards summary={summary} setSelectedEventType={setSelectedEventType} />

        <ConsolidatedActivityFeedTable
          loading={loading}
          filteredActivities={filteredActivities}
          systemLabelById={systemLabelById}
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <OperatorActivityTable operatorSummaries={operatorSummaries} onExport={exportOperatorCsv} />
          <SystemPerformanceByActivityTable systemActivityRows={systemActivityRows} />
        </div>
      </div>
    </DashboardLayout>
  )
}
