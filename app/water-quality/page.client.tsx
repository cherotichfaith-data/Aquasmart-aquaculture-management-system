"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useMutation } from "@tanstack/react-query"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FarmSelector from "@/components/shared/farm-selector"
import { useActiveFarm } from "@/hooks/use-active-farm"
import {
  useAlertThresholds,
  useLatestWaterQualityRating,
  useUpsertFarmThreshold,
  useWaterQualityAsOf,
  useWaterQualityOverlay,
  useWaterQualityMeasurements,
  useDailyWaterQualityRating,
  useWaterQualityStatus,
} from "@/lib/hooks/use-water-quality"
import { useRecentActivities } from "@/lib/hooks/use-dashboard"
import { useNotifications } from "@/components/notifications/notifications-provider"
import { useToast } from "@/hooks/use-toast"
import { useSharedFilters } from "@/hooks/use-shared-filters"
import TimePeriodSelector from "@/components/shared/time-period-selector"
import { getDateRangeFromPeriod } from "@/lib/utils"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import {
  formatTimestamp,
  getResultRows,
  operatorColumns,
  parameterLabels,
  parseJsonish,
  slope,
  statusClass,
  type MeasurementEvent,
  type StatusTone,
  type WqParameter,
} from "./water-quality-utils"

export default function WaterQualityPage() {
  const { toast } = useToast()
  const { notifications } = useNotifications()
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
  const [selectedParameter, setSelectedParameter] = useState<WqParameter>("dissolved_oxygen")
  const [showFeedingOverlay, setShowFeedingOverlay] = useState(true)
  const [showMortalityOverlay, setShowMortalityOverlay] = useState(true)
  const [lowDoThreshold, setLowDoThreshold] = useState(4)
const [highAmmoniaThreshold, setHighAmmoniaThreshold] = useState(0.5)

  const {
    selectedSystemId,
    scopedSystemIdList,
    systemsQuery,
    batchSystemsQuery,
  } = useScopedSystemIds({
    farmId,
    selectedStage,
    selectedBatch,
    selectedSystem,
  })

  const asOfQuery = useWaterQualityAsOf()
  const asOfDate = useMemo(() => {
    const rows = getResultRows(asOfQuery.data)
    const latest = rows[0]
    if (!latest) return null
    const measurementDate = latest.latest_measurement_ts?.slice(0, 10) ?? null
    const ratingDate = latest.latest_rating_date?.slice(0, 10) ?? null
    if (measurementDate && ratingDate) {
      return measurementDate > ratingDate ? measurementDate : ratingDate
    }
    return measurementDate ?? ratingDate ?? null
  }, [asOfQuery.data])
  const { startDate: dateFrom, endDate: dateTo } = useMemo(
    () => getDateRangeFromPeriod(timePeriod, asOfDate),
    [asOfDate, timePeriod],
  )
  const statusQuery = useWaterQualityStatus(selectedSystemId)
  const latestRatingQuery = useLatestWaterQualityRating(selectedSystemId)
  const ratingsQuery = useDailyWaterQualityRating({
    systemId: selectedSystemId,
    dateFrom,
    dateTo,
    requireSystem: false,
  })
  const measurementsQuery = useWaterQualityMeasurements({
    systemId: selectedSystemId,
    dateFrom,
    dateTo,
    requireSystem: false,
  })
  const overlayQuery = useWaterQualityOverlay({
    systemId: selectedSystemId,
    dateFrom,
    dateTo,
    requireSystem: false,
  })
  const activitiesQuery = useRecentActivities({
    tableName: "water_quality_measurement",
    dateFrom: `${dateFrom}T00:00:00`,
    dateTo: `${dateTo}T23:59:59`,
    limit: 5000,
  })
  const thresholdsQuery = useAlertThresholds()
  const upsertFarmThresholdMutation = useUpsertFarmThreshold()
  const scopedSystemIds = scopedSystemIdList

  const thresholdRow = useMemo(() => {
    const rows = getResultRows(thresholdsQuery.data)
    return rows.find((row) => row.scope === "farm" && row.system_id == null) ?? rows[0] ?? null
  }, [thresholdsQuery.data])

  useEffect(() => {
    if (!thresholdRow) return
    setLowDoThreshold(thresholdRow.low_do_threshold ?? 4)
    setHighAmmoniaThreshold(thresholdRow.high_ammonia_threshold ?? 0.5)
  }, [thresholdRow])

  const saveThresholdMutation = useMutation({
    mutationFn: async () =>
      upsertFarmThresholdMutation.mutateAsync({
        low_do_threshold: lowDoThreshold,
        high_ammonia_threshold: highAmmoniaThreshold,
      }),
    onSuccess: () => {
      toast({ title: "Thresholds saved", description: "Water-quality thresholds updated." })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error?.message ?? "Failed to save thresholds.",
      })
    },
  })

  const systemLabelById = useMemo(() => {
    const map = new Map<number, string>()
    const systems = getResultRows(systemsQuery.data)
    systems.forEach((system) => {
      if (system.id != null) map.set(system.id, system.label ?? `System ${system.id}`)
    })
    return map
  }, [systemsQuery.data])

  const operatorByRecordId = useMemo(() => {
    const map = new Map<string, string>()
    const rows = getResultRows(activitiesQuery.data)
    rows.forEach((row) => {
      if (!row.record_id || !row.column_name || !operatorColumns.has(row.column_name)) return
      const parsed = parseJsonish(row.new_value)
      if (!parsed) return
      map.set(String(row.record_id), parsed)
    })
    return map
  }, [activitiesQuery.data])

  const ratingEvents = useMemo<MeasurementEvent[]>(() => {
    const rows = getResultRows(ratingsQuery.data).filter(
      (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
    )
    return rows
      .filter((row) => row.rating_date)
      .map((row) => ({
        key: `rating-${row.system_id}-${row.rating_date}`,
        systemId: row.system_id as number,
        systemLabel: systemLabelById.get(row.system_id as number) ?? `System ${row.system_id}`,
        date: row.rating_date ?? "",
        time: "00:00",
        timestamp: `${row.rating_date ?? ""}T00:00`,
        waterDepth: 0,
        dissolved_oxygen: row.worst_parameter === "dissolved_oxygen" ? row.worst_parameter_value ?? null : null,
        pH: row.worst_parameter === "pH" ? row.worst_parameter_value ?? null : null,
        temperature: row.worst_parameter === "temperature" ? row.worst_parameter_value ?? null : null,
        ammonia_ammonium: row.worst_parameter === "ammonia_ammonium" ? row.worst_parameter_value ?? null : null,
        operator: "Derived from daily rating",
        source: "rating" as const,
      }))
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
  }, [ratingsQuery.data, scopedSystemIds, systemLabelById])

  const measurementEvents = useMemo<MeasurementEvent[]>(() => {
    const rows = getResultRows(measurementsQuery.data).filter(
      (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
    )
    const grouped = new Map<string, MeasurementEvent>()

    rows.forEach((row) => {
      if (row.system_id == null) return
      const date = row.date ?? ""
      const time = row.time ?? "00:00"
      const key = `${row.system_id}-${date}-${time}`
      const existing = grouped.get(key)
      if (!existing) {
        grouped.set(key, {
          key,
          systemId: row.system_id,
          systemLabel: systemLabelById.get(row.system_id) ?? `System ${row.system_id}`,
          date,
          time,
          timestamp: `${date}T${time}`,
          waterDepth: row.water_depth ?? 0,
          dissolved_oxygen: null,
          pH: null,
          temperature: null,
          ammonia_ammonium: null,
          operator: operatorByRecordId.get(String(row.id)) ?? "Untracked",
          source: "measurement" as const,
        })
      }

      const target = grouped.get(key)
      if (!target) return
      if (row.parameter_name === "dissolved_oxygen") target.dissolved_oxygen = row.parameter_value
      if (row.parameter_name === "pH") target.pH = row.parameter_value
      if (row.parameter_name === "temperature") target.temperature = row.parameter_value
      if (row.parameter_name === "ammonia_ammonium") target.ammonia_ammonium = row.parameter_value
      target.waterDepth = row.water_depth ?? target.waterDepth
      target.operator = operatorByRecordId.get(String(row.id)) ?? target.operator
    })

    return Array.from(grouped.values()).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
  }, [measurementsQuery.data, operatorByRecordId, scopedSystemIds, systemLabelById])

  const latestEvent = measurementEvents[0] ?? null
  const latestRating = useMemo(() => {
    const rows = getResultRows(latestRatingQuery.data).filter(
      (row) => row.system_id == null || scopedSystemIds.includes(row.system_id),
    )
    return rows[0] ?? null
  }, [latestRatingQuery.data, scopedSystemIds])

  const exceededSystems = useMemo(() => {
    const rows = getResultRows(statusQuery.data).filter(
      (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
    )
    return rows
      .map((row) => {
        const event: MeasurementEvent = {
          key: `status-${row.system_id}-${row.rating_date ?? "latest"}`,
          systemId: row.system_id as number,
          systemLabel: row.system_name ?? systemLabelById.get(row.system_id as number) ?? `System ${row.system_id}`,
          date: row.rating_date ?? "",
          time: "00:00",
          timestamp: `${row.rating_date ?? ""}T00:00`,
          waterDepth: 0,
          dissolved_oxygen: null,
          pH: null,
          temperature: null,
          ammonia_ammonium: null,
          operator: "System status",
          source: "rating",
        }
        const exceeded: string[] = []
        if (row.do_exceeded) {
          exceeded.push(
            `DO < ${row.low_do_threshold ?? lowDoThreshold}`,
          )
        }
        if (row.ammonia_exceeded) {
          exceeded.push(
            `Ammonia > ${row.high_ammonia_threshold ?? highAmmoniaThreshold}`,
          )
        }
        if (!exceeded.length && (row.rating === "critical" || row.rating === "lethal")) {
          exceeded.push(
            `${String(row.rating ?? "status").toUpperCase()}: ${row.worst_parameter ?? "unknown"}${row.worst_parameter_value != null ? ` (${row.worst_parameter_value}${row.worst_parameter_unit ? ` ${row.worst_parameter_unit}` : ""})` : ""}`,
          )
        }
        return { event, exceeded }
      })
      .filter((row) => row.exceeded.length > 0)
      .sort((a, b) => String(b.event.timestamp).localeCompare(String(a.event.timestamp)))
  }, [highAmmoniaThreshold, lowDoThreshold, scopedSystemIds, statusQuery.data, systemLabelById])

  const doTone: StatusTone = useMemo(() => {
    const selectedStatus = getResultRows(statusQuery.data).find((row) => row.system_id === selectedSystemId)
    if (latestEvent?.dissolved_oxygen == null && selectedStatus?.do_exceeded != null) {
      return selectedStatus.do_exceeded ? "red" : "green"
    }
    const value = latestEvent?.dissolved_oxygen
    if (value == null) return "yellow"
    if (value < lowDoThreshold) return "red"
    if (value < lowDoThreshold * 1.1) return "yellow"
    return "green"
  }, [latestEvent?.dissolved_oxygen, lowDoThreshold, selectedSystemId, statusQuery.data])

  const ammoniaTone: StatusTone = useMemo(() => {
    const selectedStatus = getResultRows(statusQuery.data).find((row) => row.system_id === selectedSystemId)
    if (latestEvent?.ammonia_ammonium == null && selectedStatus?.ammonia_exceeded != null) {
      return selectedStatus.ammonia_exceeded ? "red" : "green"
    }
    const value = latestEvent?.ammonia_ammonium
    if (value == null) return "yellow"
    if (value > highAmmoniaThreshold) return "red"
    if (value > highAmmoniaThreshold * 0.9) return "yellow"
    return "green"
  }, [highAmmoniaThreshold, latestEvent?.ammonia_ammonium, selectedSystemId, statusQuery.data])

  const trendData = useMemo(() => {
    const parameterByDate = new Map<string, { sum: number; count: number }>()
    const measurementRows = getResultRows(measurementsQuery.data).filter(
      (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
    )

    if (measurementRows.length > 0) {
      measurementRows.forEach((row) => {
        if (row.parameter_name !== selectedParameter || !row.date) return
        const current = parameterByDate.get(row.date) ?? { sum: 0, count: 0 }
        current.sum += row.parameter_value ?? 0
        current.count += 1
        parameterByDate.set(row.date, current)
      })
    } else {
      const ratingRows = getResultRows(ratingsQuery.data).filter(
        (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
      )
      ratingRows.forEach((row) => {
        if (!row.rating_date || typeof row.rating_numeric !== "number") return
        const current = parameterByDate.get(row.rating_date) ?? { sum: 0, count: 0 }
        current.sum += row.rating_numeric
        current.count += 1
        parameterByDate.set(row.rating_date, current)
      })
    }

    const overlayByDate = new Map<string, { feeding: number; mortality: number }>()
    const overlayRows = getResultRows(overlayQuery.data)
    overlayRows.forEach((row) => {
      if (!row.inventory_date || !scopedSystemIds.includes(row.system_id)) return
      const current = overlayByDate.get(row.inventory_date) ?? { feeding: 0, mortality: 0 }
      current.feeding += row.feeding_amount ?? 0
      current.mortality += row.number_of_fish_mortality ?? 0
      overlayByDate.set(row.inventory_date, current)
    })

    return Array.from(parameterByDate.entries())
      .map(([date, agg]) => ({
        date,
        parameter: agg.count > 0 ? agg.sum / agg.count : null,
        feeding: overlayByDate.get(date)?.feeding ?? null,
        mortality: overlayByDate.get(date)?.mortality ?? null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [measurementsQuery.data, overlayQuery.data, ratingsQuery.data, scopedSystemIds, selectedParameter])

  const selectedParameterUnit = useMemo(() => {
    if (selectedParameter === "dissolved_oxygen" || selectedParameter === "ammonia_ammonium") return "mg/L"
    if (selectedParameter === "temperature") return "deg C"
    if (selectedParameter === "pH") return "pH"
    return ""
  }, [selectedParameter])

  const predictiveAlerts = useMemo(() => {
    const series = trendData
      .map((row) => row.parameter)
      .filter((value): value is number => typeof value === "number")
      .slice(-7)

    if (series.length < 4) return [] as string[]
    const trendSlope = slope(series)
    const projected3d = series[series.length - 1] + trendSlope * 3
    const alerts: string[] = []

    if (selectedParameter === "dissolved_oxygen" && projected3d < lowDoThreshold) {
      alerts.push(
        `DO may breach in 3 days: projected ${projected3d.toFixed(2)} mg/L vs threshold ${lowDoThreshold.toFixed(2)}. Increase aeration and reduce stress.`,
      )
    }
    if (selectedParameter === "ammonia_ammonium" && projected3d > highAmmoniaThreshold) {
      alerts.push(
        `Ammonia may breach in 3 days: projected ${projected3d.toFixed(2)} mg/L vs threshold ${highAmmoniaThreshold.toFixed(2)}. Lower feed and increase water exchange.`,
      )
    }
    if (selectedParameter === "temperature" && projected3d > 32) {
      alerts.push(`Temperature trend is rising (projected ${projected3d.toFixed(2)} deg C). Review shading and circulation.`)
    }

    return alerts
  }, [highAmmoniaThreshold, lowDoThreshold, selectedParameter, trendData])

  const waterAlertFeed = useMemo(() => {
    return notifications
      .filter((item) => item.kind === "water_quality")
      .filter((item) => {
        const created = new Date(item.createdAt)
        if (Number.isNaN(created.getTime())) return false
        const from = new Date(`${dateFrom}T00:00:00`)
        const to = new Date(`${dateTo}T23:59:59`)
        return created >= from && created <= to
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 15)
  }, [dateFrom, dateTo, notifications])

  const dataIssues = useMemo(() => {
    const issues: string[] = []
    const checks: Array<[string, { status: "success" | "error"; error?: string } | undefined]> = [
      ["As-of date", asOfQuery.data],
      ["Status", statusQuery.data],
      ["Latest rating", latestRatingQuery.data],
      ["Daily ratings", ratingsQuery.data],
      ["Measurements", measurementsQuery.data],
      ["Daily overlay", overlayQuery.data],
      ["Thresholds", thresholdsQuery.data as any],
      ["Batch systems", selectedBatch !== "all" ? (batchSystemsQuery.data as any) : undefined],
    ]

    checks.forEach(([label, result]) => {
      if (!result || result.status !== "error") return
      issues.push(`${label}: ${result.error ?? "request failed"}`)
    })

    if (!scopedSystemIds.length && farmId) {
      issues.push("No scoped systems found for selected farm/stage/batch/system filters.")
    }

    return issues
  }, [
    asOfQuery.data,
    batchSystemsQuery.data,
    farmId,
    latestRatingQuery.data,
    measurementsQuery.data,
    overlayQuery.data,
    ratingsQuery.data,
    scopedSystemIds.length,
    selectedBatch,
    statusQuery.data,
    thresholdsQuery.data,
  ])

  const exportCsv = () => {
    const header = ["parameter_name", "reading", "timestamp", "system", "operator"]
    const rows: string[] = []
    measurementEvents.forEach((event) => {
      const timestamp = `${event.date} ${event.time}`
      const entries: Array<[string, number | null]> = [
        ["dissolved_oxygen", event.dissolved_oxygen],
        ["pH", event.pH],
        ["temperature", event.temperature],
        ["ammonia_ammonium", event.ammonia_ammonium],
      ]
      entries.forEach(([name, value]) => {
        if (value == null) return
        rows.push(
          [name, String(value), timestamp, event.systemLabel, event.operator]
            .map((cell) => `"${cell.replaceAll('"', '""')}"`)
            .join(","),
        )
      })
    })

    const csv = [header.join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `water-quality-compliance-${dateFrom}-to-${dateTo}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportPdf = () => {
    const rows = measurementEvents
      .slice(0, 500)
      .map(
        (event) =>
          `<tr><td>${event.systemLabel}</td><td>${event.date} ${event.time}</td><td>${event.dissolved_oxygen ?? ""}</td><td>${event.pH ?? ""}</td><td>${event.temperature ?? ""}</td><td>${event.ammonia_ammonium ?? ""}</td><td>${event.operator}</td></tr>`,
      )
      .join("")

    const popup = window.open("", "_blank")
    if (!popup) return
    popup.document.write(`
      <html><head><title>Water Quality Compliance Report</title></head>
      <body>
        <h1>Water Quality Compliance Report</h1>
        <p>Period: ${dateFrom} to ${dateTo}</p>
        <table border="1" cellspacing="0" cellpadding="6">
          <thead><tr><th>System</th><th>Timestamp</th><th>DO</th><th>pH</th><th>Temp</th><th>Ammonia</th><th>Operator</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body></html>
    `)
    popup.document.close()
    popup.focus()
    popup.print()
  }

  const loading =
    measurementsQuery.isLoading ||
    ratingsQuery.isLoading ||
    overlayQuery.isLoading ||
    statusQuery.isLoading ||
    systemsQuery.isLoading

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold">Water Quality Monitoring</h1>
            <p className="text-muted-foreground mt-1">Measurements, thresholds, trends, compliance reporting, and predictive alerts.</p>
          </div>

          <FarmSelector
            selectedBatch={selectedBatch}
            selectedSystem={selectedSystem}
            selectedStage={selectedStage}
            onBatchChange={setSelectedBatch}
            onSystemChange={setSelectedSystem}
            onStageChange={setSelectedStage}
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="flex items-center">
              <TimePeriodSelector selectedPeriod={timePeriod} onPeriodChange={setTimePeriod} />
            </div>
            <select value={selectedParameter} onChange={(e) => setSelectedParameter(e.target.value as WqParameter)} className="px-3 py-2 rounded-md border border-input bg-background text-sm">
              {Object.entries(parameterLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <div className="flex gap-2 md:col-span-2">
              <button type="button" onClick={exportCsv} className="px-3 py-2 rounded-md border border-border text-sm hover:bg-muted/40">Export CSV</button>
              <button type="button" onClick={exportPdf} className="px-3 py-2 rounded-md border border-border text-sm hover:bg-muted/40">Export PDF</button>
            </div>
          </div>
        </div>

        {dataIssues.length ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            <p className="font-medium mb-1">Some water-quality data sources failed to load:</p>
            <ul className="list-disc pl-5 space-y-1">
              {dataIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-card border border-border rounded-lg p-5 space-y-4">
            <h2 className="font-semibold">Water-Quality Measurements Log</h2>
            <p className="text-sm text-muted-foreground">Systems with latest measurements exceeding configured parameter thresholds.</p>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-4 py-3 text-left font-semibold">System</th>
                    <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                    <th className="px-4 py-3 text-left font-semibold">DO</th>
                    <th className="px-4 py-3 text-left font-semibold">Ammonia</th>
                    <th className="px-4 py-3 text-left font-semibold">Threshold Breach</th>
                  </tr>
                </thead>
                <tbody>
                  {exceededSystems.length > 0 ? (
                    exceededSystems.map(({ event, exceeded }) => (
                      <tr key={`exceeded-${event.key}`} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3">{event.systemLabel}</td>
                        <td className="px-4 py-3">{formatTimestamp(event.timestamp)}</td>
                        <td className="px-4 py-3">{event.dissolved_oxygen ?? "-"}</td>
                        <td className="px-4 py-3">{event.ammonia_ammonium ?? "-"}</td>
                        <td className="px-4 py-3 text-destructive font-medium">{exceeded.join(", ")}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                        No systems currently exceed configured thresholds.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h2 className="font-semibold">Water-Quality Alerts & Thresholds</h2>
            <p className="text-sm text-muted-foreground">Configure thresholds and monitor current status (green/yellow/red).</p>
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground">Low DO threshold (mg/L)</label>
              <input type="number" step="0.1" value={lowDoThreshold} onChange={(e) => setLowDoThreshold(Number(e.target.value) || 0)} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
              <label className="text-sm text-muted-foreground">High ammonia threshold (mg/L)</label>
              <input type="number" step="0.01" value={highAmmoniaThreshold} onChange={(e) => setHighAmmoniaThreshold(Number(e.target.value) || 0)} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
              <button type="button" onClick={() => saveThresholdMutation.mutate()} disabled={saveThresholdMutation.isPending} className="px-3 py-2 rounded-md border border-border text-sm hover:bg-muted/40">
                {saveThresholdMutation.isPending ? "Saving..." : "Save Thresholds"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-md p-3 ${statusClass(doTone)}`}>
                <p className="text-xs">DO status</p>
                <p className="font-semibold">{latestEvent?.dissolved_oxygen != null ? `${latestEvent.dissolved_oxygen.toFixed(2)} mg/L` : "No data"}</p>
              </div>
              <div className={`rounded-md p-3 ${statusClass(ammoniaTone)}`}>
                <p className="text-xs">Ammonia status</p>
                <p className="font-semibold">{latestEvent?.ammonia_ammonium != null ? `${latestEvent.ammonia_ammonium.toFixed(2)} mg/L` : "No data"}</p>
              </div>
              <div className="rounded-md p-3 bg-muted/40 text-foreground col-span-2">
                <p className="text-xs text-muted-foreground">Latest derived water-quality rating</p>
                <p className="font-semibold">{latestRating?.rating ?? "No rating"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold">Water-Quality Trends & Historical Analysis</h2>
              <p className="text-sm text-muted-foreground">Parameter trends with feeding and mortality overlays.</p>
            </div>
            <div className="flex gap-3 text-sm">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showFeedingOverlay} onChange={(e) => setShowFeedingOverlay(e.target.checked)} />Overlay feeding</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showMortalityOverlay} onChange={(e) => setShowMortalityOverlay(e.target.checked)} />Overlay mortality</label>
            </div>
          </div>
          {loading ? (
            <div className="h-[320px] flex items-center justify-center text-muted-foreground">Loading trend data...</div>
          ) : trendData.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-muted-foreground">No trend data for selected range.</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="wq" />
                <YAxis yAxisId="overlay" orientation="right" />
                <Tooltip
                  formatter={(value, name) => {
                    const numeric = Number(value)
                    const field = String(name).toLowerCase()
                    if (field.includes("feeding")) {
                      return [`${numeric.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`, String(name)]
                    }
                    if (field.includes("mortality")) {
                      return [numeric.toLocaleString(undefined, { maximumFractionDigits: 0 }), String(name)]
                    }
                    if (selectedParameter === "pH") {
                      return [numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), String(name)]
                    }
                    return [
                      `${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${selectedParameterUnit ? ` ${selectedParameterUnit}` : ""}`,
                      String(name),
                    ]
                  }}
                />
                <Legend />
                <Line yAxisId="wq" type="monotone" dataKey="parameter" name={parameterLabels[selectedParameter]} stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                {showFeedingOverlay ? <Line yAxisId="overlay" type="monotone" dataKey="feeding" name="Feeding amount" stroke="var(--color-chart-3)" dot={false} /> : null}
                {showMortalityOverlay ? <Line yAxisId="overlay" type="monotone" dataKey="mortality" name="Mortality count" stroke="var(--color-chart-4)" dot={false} /> : null}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">Water-Quality Compliance Reporting</h3>
              <p className="text-sm text-muted-foreground mt-1">Includes parameter, reading, timestamp, system, operator.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                    <th className="px-4 py-3 text-left font-semibold">System</th>
                    <th className="px-4 py-3 text-left font-semibold">DO</th>
                    <th className="px-4 py-3 text-left font-semibold">pH</th>
                    <th className="px-4 py-3 text-left font-semibold">Temp</th>
                    <th className="px-4 py-3 text-left font-semibold">Ammonia</th>
                    <th className="px-4 py-3 text-left font-semibold">Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {measurementEvents.slice(0, 25).map((event) => (
                    <tr key={event.key} className="border-b border-border hover:bg-muted/30">
                      <td className="px-4 py-3">{formatTimestamp(event.timestamp)}</td>
                      <td className="px-4 py-3">{event.systemLabel}</td>
                      <td className="px-4 py-3">{event.dissolved_oxygen ?? "-"}</td>
                      <td className="px-4 py-3">{event.pH ?? "-"}</td>
                      <td className="px-4 py-3">{event.temperature ?? "-"}</td>
                      <td className="px-4 py-3">{event.ammonia_ammonium ?? "-"}</td>
                      <td className="px-4 py-3">{event.operator}</td>
                    </tr>
                  ))}
                  {!measurementEvents.length ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No measurements found.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h3 className="font-semibold">Predictive Water-Quality Alerts</h3>
            <p className="text-sm text-muted-foreground">Trend-based forecast and preventive recommendations.</p>
            {predictiveAlerts.length ? (
              <div className="space-y-2">
                {predictiveAlerts.map((alert) => (
                  <div key={alert} className="rounded-md border border-orange-300/50 bg-orange-500/10 text-orange-700 p-3 text-sm">{alert}</div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">No projected threshold breach in next 3 days for selected parameter.</div>
            )}

            <h4 className="font-medium pt-2">Recent Water-Quality Alert Feed</h4>
            <div className="max-h-52 overflow-auto space-y-2">
              {waterAlertFeed.length ? (
                waterAlertFeed.map((alert) => (
                  <article key={alert.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <span className="text-xs text-muted-foreground">{formatTimestamp(alert.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No water-quality alerts in selected date range.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
