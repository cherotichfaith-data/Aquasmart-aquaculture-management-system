"use client"

import { useMemo, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FarmSelector from "@/components/shared/farm-selector"
import TimePeriodSelector from "@/components/shared/time-period-selector"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts"
import { useSamplingData } from "@/lib/hooks/use-reports"
import { getDateRangeFromPeriod, sortByDateAsc } from "@/lib/utils"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useSharedFilters } from "@/hooks/use-shared-filters"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"

const formatDayLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed)
}

const formatFullDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(parsed)
}

export default function SamplingPage() {
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
  } = useSharedFilters("quarter")
  const [targetHarvestWeight, setTargetHarvestWeight] = useState<string>("350")
  const [manualDailyGain, setManualDailyGain] = useState<string>("")
  const [sampleWeightsText, setSampleWeightsText] = useState("")
  const [showSamplingRecords, setShowSamplingRecords] = useState(false)
  const [tableLimit, setTableLimit] = useState("50")

  const {
    selectedSystemId: systemId,
    hasSystem,
    batchId,
    scopedSystemIdList,
    scopedSystemIds,
    systemsQuery,
    batchSystemsQuery,
  } = useScopedSystemIds({
    farmId,
    selectedStage,
    selectedBatch,
    selectedSystem,
  })

  const samplingQueryEnabled = hasSystem || scopedSystemIdList.length > 0

  const asOfSamplingQuery = useSamplingData({
    systemId: hasSystem ? (systemId as number) : undefined,
    systemIds: !hasSystem ? scopedSystemIdList : undefined,
    batchId: Number.isFinite(batchId) ? batchId : undefined,
    limit: 1,
    enabled: samplingQueryEnabled,
  })
  const asOfDate = useMemo(() => {
    const rows = asOfSamplingQuery.data?.status === "success" ? asOfSamplingQuery.data.data : []
    return rows[0]?.date ?? null
  }, [asOfSamplingQuery.data])
  const { startDate: dateFrom, endDate: dateTo } = useMemo(
    () => getDateRangeFromPeriod(timePeriod, asOfDate),
    [asOfDate, timePeriod],
  )

  const samplingQuery = useSamplingData({
    systemId: hasSystem ? (systemId as number) : undefined,
    systemIds: !hasSystem ? scopedSystemIdList : undefined,
    batchId: Number.isFinite(batchId) ? batchId : undefined,
    dateFrom,
    dateTo,
    limit: 2000,
    enabled: samplingQueryEnabled,
  })
  const tableLimitValue = Number.isFinite(Number(tableLimit)) ? Number(tableLimit) : 50
  const tableQueryEnabled =
    showSamplingRecords &&
    samplingQueryEnabled &&
    (selectedSystem !== "all" || selectedBatch !== "all" || selectedStage !== "all")
  const samplingTableQuery = useSamplingData({
    systemId: hasSystem ? (systemId as number) : undefined,
    systemIds: !hasSystem ? scopedSystemIdList : undefined,
    batchId: Number.isFinite(batchId) ? batchId : undefined,
    dateFrom,
    dateTo,
    limit: tableLimitValue,
    enabled: tableQueryEnabled,
  })

  const rows = samplingQuery.data?.status === "success" ? samplingQuery.data.data : []
  const tableRows = samplingTableQuery.data?.status === "success" ? samplingTableQuery.data.data : []
  const loading = samplingQuery.isLoading || systemsQuery.isLoading || batchSystemsQuery.isLoading
  const errorMessages = [
    getErrorMessage(samplingQuery.error),
    getQueryResultError(samplingQuery.data),
    getErrorMessage(systemsQuery.error),
    getQueryResultError(systemsQuery.data),
    getErrorMessage(batchSystemsQuery.error),
    getQueryResultError(batchSystemsQuery.data),
  ].filter(Boolean) as string[]
  const latestUpdatedAt = Math.max(
    samplingQuery.dataUpdatedAt ?? 0,
    systemsQuery.dataUpdatedAt ?? 0,
    batchSystemsQuery.dataUpdatedAt ?? 0,
  )

  const filteredRows = useMemo(
    () => rows.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id)),
    [rows, scopedSystemIds],
  )
  const tableFilteredRows = useMemo(
    () => tableRows.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id)),
    [tableRows, scopedSystemIds],
  )

  const chartRows = useMemo(() => {
    const byDate = new Map<string, { sampled: number; totalWeight: number; weightedAbw: number; abwWeight: number; fallbackAbw: number; fallbackCount: number }>()
    filteredRows.forEach((item) => {
      if (!item.date) return
      const current = byDate.get(item.date) ?? { sampled: 0, totalWeight: 0, weightedAbw: 0, abwWeight: 0, fallbackAbw: 0, fallbackCount: 0 }
      const sampled = item.number_of_fish_sampling ?? 0
      current.sampled += sampled
      current.totalWeight += item.total_weight_sampling ?? 0
      if (typeof item.abw === "number") {
        if (sampled > 0) {
          current.weightedAbw += item.abw * sampled
          current.abwWeight += sampled
        } else {
          current.fallbackAbw += item.abw
          current.fallbackCount += 1
        }
      }
      byDate.set(item.date, current)
    })
    const baseRows = sortByDateAsc(
      Array.from(byDate.entries()).map(([date, current]) => ({
        date,
        abw:
          current.abwWeight > 0
            ? current.weightedAbw / current.abwWeight
            : current.fallbackCount > 0
              ? current.fallbackAbw / current.fallbackCount
              : null,
        fishSampled: current.sampled,
        totalWeight: current.totalWeight,
      })),
      (item) => item.date,
    )
    if (baseRows.length === 0) return []

    const first = baseRows[0]
    const computedGains: number[] = []
    for (let i = 1; i < baseRows.length; i += 1) {
      const prev = baseRows[i - 1]
      const curr = baseRows[i]
      if (prev.abw == null || curr.abw == null) continue
      const prevDate = new Date(`${prev.date}T00:00:00`)
      const currDate = new Date(`${curr.date}T00:00:00`)
      const days = Math.max(1, Math.round((currDate.getTime() - prevDate.getTime()) / 86_400_000))
      computedGains.push((curr.abw - prev.abw) / days)
    }
    const meanDailyGain = computedGains.length > 0 ? computedGains.reduce((a, b) => a + b, 0) / computedGains.length : 0
    const overrideGain = Number(manualDailyGain)
    const dailyGain = Number.isFinite(overrideGain) && overrideGain > 0 ? overrideGain : meanDailyGain

    return baseRows.map((row) => {
      const startDate = new Date(`${first.date}T00:00:00`)
      const date = new Date(`${row.date}T00:00:00`)
      const elapsedDays = Math.max(0, Math.round((date.getTime() - startDate.getTime()) / 86_400_000))
      const expectedAbw = (first.abw ?? 0) + dailyGain * elapsedDays
      return {
        ...row,
        expectedAbw,
        label: formatDayLabel(row.date),
      }
    })
  }, [filteredRows, manualDailyGain])

  const latestAbw = chartRows.length > 0 ? chartRows[chartRows.length - 1]?.abw ?? null : null
  const avgAbw = chartRows.length > 0 ? chartRows.reduce((sum, row) => sum + (row.abw ?? 0), 0) / chartRows.length : null
  const avgSampleSize =
    chartRows.length > 0 ? chartRows.reduce((sum, row) => sum + (row.fishSampled ?? 0), 0) / chartRows.length : null
  const abwStdDev = useMemo(() => {
    if (chartRows.length < 2) return null
    const values = chartRows.map((row) => row.abw ?? 0)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
    return Math.sqrt(variance)
  }, [chartRows])
  const abwCv = avgAbw && abwStdDev != null && avgAbw > 0 ? (abwStdDev / avgAbw) * 100 : null

  const target = Number(targetHarvestWeight)
  const projectedDaysToTarget = useMemo(() => {
    if (!Number.isFinite(target) || target <= 0 || chartRows.length === 0 || latestAbw == null) return null
    const last = chartRows[chartRows.length - 1]
    const prev = chartRows.length > 1 ? chartRows[chartRows.length - 2] : null
    let dailyGain = 0
    if (prev && last && prev.abw != null && last.abw != null) {
      const prevDate = new Date(`${prev.date}T00:00:00`)
      const lastDate = new Date(`${last.date}T00:00:00`)
      const days = Math.max(1, Math.round((lastDate.getTime() - prevDate.getTime()) / 86_400_000))
      dailyGain = (last.abw - prev.abw) / days
    }
    const override = Number(manualDailyGain)
    if (Number.isFinite(override) && override > 0) dailyGain = override
    if (dailyGain <= 0) return null
    return Math.max(0, Math.ceil((target - latestAbw) / dailyGain))
  }, [chartRows, latestAbw, manualDailyGain, target])

  const projectedHarvestDate = useMemo(() => {
    if (projectedDaysToTarget == null || chartRows.length === 0) return null
    const latestDate = new Date(`${chartRows[chartRows.length - 1].date}T00:00:00`)
    latestDate.setDate(latestDate.getDate() + projectedDaysToTarget)
    return latestDate
  }, [chartRows, projectedDaysToTarget])

  const sampleStats = useMemo(() => {
    const values = sampleWeightsText
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0)
    if (values.length === 0) {
      return { count: 0, mean: null as number | null, stdDev: null as number | null, cv: null as number | null, valid: false }
    }
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.length > 1 ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length : 0
    const stdDev = Math.sqrt(variance)
    const cv = mean > 0 ? (stdDev / mean) * 100 : null
    return { count: values.length, mean, stdDev, cv, valid: values.length >= 10 }
  }, [sampleWeightsText])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-lg border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">Sampling & Growth</h1>
              <p className="text-muted-foreground mt-1">ABW trends, growth projection, sample-quality checks, and planning readiness</p>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs">
              <DataUpdatedAt updatedAt={latestUpdatedAt} />
              <DataFetchingBadge isFetching={samplingQuery.isFetching} isLoading={loading} />
            </div>
          </div>
        </div>

        <section className="sticky top-[65px] z-10 rounded-lg border border-border bg-card/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/90">
          <div className="flex flex-wrap items-center gap-2">
            <FarmSelector
              selectedBatch={selectedBatch}
              selectedSystem={selectedSystem}
              selectedStage={selectedStage}
              onBatchChange={setSelectedBatch}
              onSystemChange={setSelectedSystem}
              onStageChange={setSelectedStage}
              variant="compact"
            />
            <TimePeriodSelector selectedPeriod={timePeriod} onPeriodChange={setTimePeriod} variant="compact" />
            <input
              type="number"
              value={targetHarvestWeight}
              onChange={(event) => setTargetHarvestWeight(event.target.value)}
              className="h-9 w-[185px] rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Target Harvest ABW (g)"
              aria-label="Target Harvest ABW"
            />
            <input
              type="number"
              value={manualDailyGain}
              onChange={(event) => setManualDailyGain(event.target.value)}
              className="h-9 w-[190px] rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Manual Daily Gain (g/day)"
              aria-label="Manual Daily Gain"
            />
          </div>
        </section>

        {errorMessages.length > 0 ? (
          <DataErrorState
            title="Unable to load sampling data"
            description={errorMessages[0]}
            onRetry={() => {
              samplingQuery.refetch()
              systemsQuery.refetch()
              batchSystemsQuery.refetch()
            }}
          />
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Total Samples</p>
            <p className="text-2xl font-bold mt-1">{filteredRows.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Latest ABW</p>
            <p className="text-2xl font-bold mt-1">{latestAbw != null ? `${latestAbw.toFixed(1)} g` : "N/A"}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">ABW Variability (CV)</p>
            <p className="text-2xl font-bold mt-1">{abwCv != null ? `${abwCv.toFixed(1)}%` : "N/A"}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Avg Sample Size</p>
            <p className="text-2xl font-bold mt-1">{avgSampleSize != null ? avgSampleSize.toFixed(0) : "N/A"}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Days To Target</p>
            <p className="text-2xl font-bold mt-1">{projectedDaysToTarget != null ? projectedDaysToTarget : "N/A"}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">ABW Trend & Growth Projection</h2>
          <p className="text-sm text-muted-foreground mb-4">
            ABW from `fish_sampling_weight` with projected expected curve and target harvest overlay.
            {projectedHarvestDate
              ? ` Projected target date: ${new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(projectedHarvestDate)}.`
              : ""}
          </p>
          {loading ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">Loading chart...</div>
          ) : chartRows.length > 0 ? (
            <div className="h-[320px] rounded-md border border-border/80 bg-muted/20 p-2">
              <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartRows}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(_, payload) => formatFullDate(String(payload?.[0]?.payload?.date ?? ""))}
                    formatter={(value, name) => [
                      `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} g`,
                      String(name),
                    ]}
                  />
                  <Legend />
                  {Number.isFinite(target) ? <ReferenceLine y={target} stroke="hsl(var(--chart-4))" strokeDasharray="4 4" label="Target ABW" /> : null}
                  <Line type="monotone" dataKey="abw" stroke="hsl(var(--chart-1))" strokeWidth={2.5} name="Observed ABW (g)" />
                  <Line type="monotone" dataKey="expectedAbw" stroke="hsl(var(--chart-2))" strokeDasharray="5 5" name="Expected ABW (g)" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </LazyRender>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">No sampling data available</div>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Sample Quality Calculator</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Enter individual fish weights (grams, comma-separated) to calculate ABW mean, standard deviation, and CV.
            Sample-size validation target is at least 10 fish.
          </p>
          <textarea
            value={sampleWeightsText}
            onChange={(event) => setSampleWeightsText(event.target.value)}
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Example: 120, 123, 119, 125, ..."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Sample Count</p>
              <p className="text-lg font-semibold">{sampleStats.count}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">ABW Mean</p>
              <p className="text-lg font-semibold">{sampleStats.mean != null ? sampleStats.mean.toFixed(2) : "-"}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Std Dev</p>
              <p className="text-lg font-semibold">{sampleStats.stdDev != null ? sampleStats.stdDev.toFixed(2) : "-"}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">CV %</p>
              <p className="text-lg font-semibold">{sampleStats.cv != null ? sampleStats.cv.toFixed(2) : "-"}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Validation</p>
              <p className={`text-lg font-semibold ${sampleStats.count === 0 ? "text-foreground" : sampleStats.valid ? "text-chart-2" : "text-chart-4"}`}>
                {sampleStats.count === 0 ? "-" : sampleStats.valid ? "Pass" : "Increase Sample"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Sampling Records</h2>
                <p className="text-xs text-muted-foreground">Drilldown table filtered by the selected stage/system/batch.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted-foreground">Rows</label>
                <select
                  value={tableLimit}
                  onChange={(event) => setTableLimit(event.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="250">250</option>
                </select>
                <button
                  type="button"
                  className="h-9 rounded-md border border-input px-3 text-sm hover:bg-muted/40"
                  onClick={() => setShowSamplingRecords((prev) => !prev)}
                >
                  {showSamplingRecords ? "Hide details" : "View details"}
                </button>
              </div>
            </div>
          </div>
          {showSamplingRecords ? (
            tableQueryEnabled ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/60 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">System</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Batch</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Fish Sampled</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Total Weight</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">ABW (g)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {samplingTableQuery.isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          Loading...
                        </td>
                      </tr>
                    ) : tableFilteredRows.length > 0 ? (
                      tableFilteredRows.map((record) => (
                        <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-sm">{record.date}</td>
                          <td className="px-4 py-3 text-sm">{record.system_id}</td>
                          <td className="px-4 py-3 text-sm">{record.batch_id ?? "-"}</td>
                          <td className={`px-4 py-3 text-sm ${record.number_of_fish_sampling >= 10 ? "text-chart-2" : "text-chart-4"}`}>
                            {record.number_of_fish_sampling}
                          </td>
                          <td className="px-4 py-3 text-sm">{record.total_weight_sampling}</td>
                          <td className="px-4 py-3 text-sm font-semibold">{record.abw}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          No sampling data found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                Select a stage, batch, or system to drill down into sampling records.
              </div>
            )
          ) : (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              Detailed records are hidden. Choose a stage/system/batch and click <span className="text-foreground font-medium">View details</span>.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

