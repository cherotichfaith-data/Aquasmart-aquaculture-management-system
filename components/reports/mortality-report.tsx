"use client"

import { useMemo, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useMortalityData } from "@/lib/hooks/use-reports"
import { useWaterQualityMeasurements, useAlertThresholds } from "@/lib/hooks/use-water-quality"
import { useDailyFishInventory } from "@/lib/hooks/use-inventory"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { sortByDateAsc } from "@/lib/utils"
import { downloadCsv, printBrandedPdf } from "@/lib/utils/report-export"

const formatDateLabel = (value: string | number) => {
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(parsed)
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
  const mortalityQuery = useMortalityData({
    systemId,
    batchId,
    limit: 5000,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
  })
  const measurementsQuery = useWaterQualityMeasurements({
    systemId,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    requireSystem: Boolean(systemId),
  })
  const thresholdsQuery = useAlertThresholds()
  const inventoryQuery = useDailyFishInventory({
    farmId,
    systemId,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    limit: 5000,
  })
  const rows = mortalityQuery.data?.status === "success" ? mortalityQuery.data.data : []
  const measurements = measurementsQuery.data?.status === "success" ? measurementsQuery.data.data : []
  const inventoryRows = inventoryQuery.data?.status === "success" ? inventoryQuery.data.data : []
  const thresholdRows = thresholdsQuery.data?.status === "success" ? thresholdsQuery.data.data : []
  const loading = mortalityQuery.isLoading
  const [showMortalityRecords, setShowMortalityRecords] = useState(false)
  const chartRows = useMemo(() => {
    const byDate = new Map<string, number>()
    rows.forEach((row) => {
      if (!row.date) return
      byDate.set(row.date, (byDate.get(row.date) ?? 0) + (row.number_of_fish_mortality ?? 0))
    })
    return sortByDateAsc(
      Array.from(byDate.entries()).map(([date, number_of_fish_mortality]) => ({ date, number_of_fish_mortality })),
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

  const thresholds = useMemo(() => {
    const farm = thresholdRows.find((row) => row.scope === "farm" && row.system_id == null)
    return {
      lowDo: farm?.low_do_threshold ?? 4,
      highAmmonia: farm?.high_ammonia_threshold ?? 0.5,
    }
  }, [thresholdRows])

  const causeBreakdown = useMemo(() => {
    const doByDate = new Map<string, number>()
    const ammoniaByDate = new Map<string, number>()
    measurements.forEach((row) => {
      if (!row.date) return
      if (row.parameter_name === "dissolved_oxygen" && typeof row.parameter_value === "number") {
        doByDate.set(row.date, row.parameter_value)
      }
      if (row.parameter_name === "ammonia_ammonium" && typeof row.parameter_value === "number") {
        ammoniaByDate.set(row.date, row.parameter_value)
      }
    })

    const acc = {
      "Low DO-associated": 0,
      "Ammonia-associated": 0,
      Unclassified: 0,
    }
    rows.forEach((row) => {
      const date = row.date
      if (!date) return
      const deaths = row.number_of_fish_mortality ?? 0
      if (deaths <= 0) return
      const d = doByDate.get(date)
      const a = ammoniaByDate.get(date)
      if (typeof d === "number" && d < thresholds.lowDo) acc["Low DO-associated"] += deaths
      else if (typeof a === "number" && a > thresholds.highAmmonia) acc["Ammonia-associated"] += deaths
      else acc.Unclassified += deaths
    })
    return Object.entries(acc).map(([cause, count]) => ({ cause, count }))
  }, [measurements, rows, thresholds.highAmmonia, thresholds.lowDo])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Latest Record</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest?.date ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Most recent entry</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Mortality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMortality}</div>
            <p className="text-xs text-muted-foreground mt-1">Selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Mortality %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mortalityPercent != null ? `${mortalityPercent.toFixed(2)}%` : "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Against inventory baseline</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mortality Trend</CardTitle>
          <CardDescription>Daily mortality counts</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="h-[300px] rounded-md border border-border/80 bg-muted/20 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={formatDateLabel}
                    formatter={(value, name) => [Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 }), String(name)]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="number_of_fish_mortality" stroke="var(--color-destructive)" strokeWidth={2.4} name="Mortality Count" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cause Breakdown and Correlation Notes</CardTitle>
          <CardDescription>Rule-based cause grouping using DO and ammonia thresholds.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-md border border-border/80 p-3">
              <h4 className="font-medium mb-2">Cause Breakdown</h4>
              <ul className="space-y-1 text-sm">
                {causeBreakdown.map((item) => (
                  <li key={item.cause} className="flex justify-between">
                    <span>{item.cause}</span>
                    <span className="font-medium">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-border/80 p-3 text-sm text-muted-foreground">
              <p>Correlation scope:</p>
              <p>1. Low DO-associated when daily DO &lt; {thresholds.lowDo} mg/L.</p>
              <p>2. Ammonia-associated when daily ammonia &gt; {thresholds.highAmmonia} mg/L.</p>
              <p>3. Remaining deaths are unclassified due to missing direct cause field in current table.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Mortality Records</CardTitle>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-input text-sm hover:bg-muted/40"
                onClick={() => setShowMortalityRecords((prev) => !prev)}
              >
                {showMortalityRecords ? "Hide details" : "View details"}
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-input text-sm hover:bg-muted/40"
                onClick={() =>
                  downloadCsv({
                    filename: `mortality-analysis-${dateRange?.from ?? "start"}-to-${dateRange?.to ?? "end"}.csv`,
                    headers: ["date", "system_id", "batch_id", "number_of_fish_mortality", "abw", "total_weight_mortality"],
                    rows: rows.map((row) => [
                      row.date,
                      row.system_id,
                      row.batch_id,
                      row.number_of_fish_mortality,
                      row.abw,
                      row.total_weight_mortality,
                    ]),
                  })
                }
              >
                Export CSV
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-input text-sm hover:bg-muted/40"
                onClick={() =>
                  printBrandedPdf({
                    title: "Mortality Analysis Report",
                    subtitle: "Mortality timeline, cause grouping, and correlation context",
                    farmName,
                    dateRange,
                    summaryLines: [
                      `Total mortality count: ${totalMortality}`,
                      `Mortality percentage: ${mortalityPercent != null ? `${mortalityPercent.toFixed(2)}%` : "N/A"}`,
                      ...causeBreakdown.map((row) => `${row.cause}: ${row.count}`),
                    ],
                    tableHeaders: ["Date", "System", "Batch", "Fish Dead", "ABW", "Total Weight"],
                    tableRows: rows.map((row) => [
                      row.date,
                      row.system_id,
                      row.batch_id ?? "-",
                      row.number_of_fish_mortality,
                      row.abw ?? "-",
                      row.total_weight_mortality ?? "-",
                    ]),
                    commentary: "Cause breakdown is inferred from water-quality thresholds due to missing explicit cause field in fish_mortality.",
                  })
                }
              >
                Export PDF
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showMortalityRecords ? (
            <div className="overflow-x-auto rounded-md border border-border/80">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-2 text-left font-semibold text-foreground">Date</th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">System</th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">Batch</th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">Fish Dead</th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">ABW</th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">Total Weight</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length > 0 ? (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/70 hover:bg-muted/35">
                      <td className="px-4 py-2 font-medium">{row.date}</td>
                      <td className="px-4 py-2">{row.system_id}</td>
                      <td className="px-4 py-2">{row.batch_id ?? "-"}</td>
                      <td className="px-4 py-2">{row.number_of_fish_mortality}</td>
                      <td className="px-4 py-2">{row.abw ?? "-"}</td>
                      <td className="px-4 py-2">{row.total_weight_mortality ?? "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">
                      No mortality records found
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Detailed records hidden. Click <span className="font-medium text-foreground">View details</span> to show {rows.length} rows.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
