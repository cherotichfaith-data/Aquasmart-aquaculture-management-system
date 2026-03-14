"use client"

import { useMemo, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useMortalityEvents } from "@/lib/hooks/use-mortality"
import { useDailyFishInventory } from "@/lib/hooks/use-inventory"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { sortByDateAsc } from "@/lib/utils"
import { downloadCsv, printBrandedPdf } from "@/lib/utils/report-export"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt, EmptyState } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import { MORTALITY_CAUSES, type MortalityCause } from "@/lib/types/mortality"

const formatDateLabel = (value: string | number) => {
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(parsed)
}

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
  const errorMessages = [
    getErrorMessage(mortalityQuery.error),
    getQueryResultError(mortalityQuery.data),
    getErrorMessage(inventoryQuery.error),
    getQueryResultError(inventoryQuery.data),
    getErrorMessage(mortalityTableQuery.error),
    getQueryResultError(mortalityTableQuery.data),
  ].filter(Boolean) as string[]
  const latestUpdatedAt = Math.max(
    mortalityQuery.dataUpdatedAt ?? 0,
    inventoryQuery.dataUpdatedAt ?? 0,
    mortalityTableQuery.dataUpdatedAt ?? 0,
  )
  const chartRows = useMemo(() => {
    const byDate = new Map<string, number>()
    rows.forEach((row) => {
      if (!row.event_date) return
      byDate.set(row.event_date, (byDate.get(row.event_date) ?? 0) + (row.dead_count ?? 0))
    })
    return sortByDateAsc(
      Array.from(byDate.entries()).map(([date, dead_count]) => ({ date, dead_count })),
      (row) => row.date,
    )
  }, [rows])

  const latest = rows[0]
  const totalMortality = useMemo(
    () => rows.reduce((sum, row) => sum + (row.dead_count ?? 0), 0),
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
          .reduce((sum, row) => sum + (row.dead_count ?? 0), 0),
      })).filter((row) => row.count > 0),
    [rows],
  )

  if (errorMessages.length > 0) {
    return (
      <DataErrorState
        title="Unable to load mortality report"
        description={errorMessages[0]}
        onRetry={() => {
          mortalityQuery.refetch()
          inventoryQuery.refetch()
          mortalityTableQuery.refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-xs">
        <DataUpdatedAt updatedAt={latestUpdatedAt} />
        <DataFetchingBadge
          isFetching={mortalityQuery.isFetching || inventoryQuery.isFetching || mortalityTableQuery.isFetching}
          isLoading={loading}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Latest Record</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest?.event_date ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Most recent event</p>
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Mass Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rows.filter((row) => row.is_mass_mortality).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Dead count &ge; 100 fish</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mortality Trend</CardTitle>
          <CardDescription>Daily mortality counts from raw event records</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : chartRows.length === 0 ? (
            <EmptyState title="No mortality events" description="No raw mortality records fall within the selected range." />
          ) : (
            <div className="h-[300px] rounded-md border border-border/80 bg-muted/20 p-2">
              <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
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
                    <Line type="monotone" dataKey="dead_count" stroke="var(--color-destructive)" strokeWidth={2.4} name="Mortality Count" />
                  </LineChart>
                </ResponsiveContainer>
              </LazyRender>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Cause Breakdown</CardTitle>
            <CardDescription>Actual mortality causes captured on raw events</CardDescription>
          </CardHeader>
          <CardContent>
            {causeBreakdown.length === 0 ? (
              <EmptyState title="No cause data" description="New mortality events with cause tags will appear here." />
            ) : (
              <div className="h-[280px] rounded-md border border-border/80 bg-muted/20 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={causeBreakdown}>
                    <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => [Number(value).toLocaleString(), "Dead count"]} />
                    <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cause Summary</CardTitle>
            <CardDescription>Count of fish lost per reported cause</CardDescription>
          </CardHeader>
          <CardContent>
            {causeBreakdown.length === 0 ? (
              <EmptyState title="No cause summary" description="No cause-tagged mortality events found." />
            ) : (
              <div className="space-y-2">
                {causeBreakdown.map((row) => (
                  <div key={row.cause} className="flex justify-between rounded-md border border-border/80 px-3 py-2 text-sm">
                    <span>{row.label}</span>
                    <span className="font-medium">{row.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Mortality Records</CardTitle>
            <div className="flex gap-2">
              <select
                value={tableLimit}
                onChange={(event) => setTableLimit(event.target.value)}
                className="px-3 py-2 rounded-md border border-input text-sm"
                aria-label="Rows to display"
              >
                <option value="50">50 rows</option>
                <option value="100">100 rows</option>
                <option value="250">250 rows</option>
              </select>
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
                    headers: ["event_date", "system_id", "batch_id", "dead_count", "cause", "notes"],
                    rows: (showMortalityRecords ? tableRows : rows.slice(0, tableLimitValue)).map((row) => [
                      row.event_date,
                      row.system_id,
                      row.batch_id,
                      row.dead_count,
                      row.cause,
                      row.notes ?? "",
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
                    subtitle: "Mortality timeline and recorded cause breakdown",
                    farmName,
                    dateRange,
                    summaryLines: [
                      `Total mortality count: ${totalMortality}`,
                      `Mortality percentage: ${mortalityPercent != null ? `${mortalityPercent.toFixed(2)}%` : "N/A"}`,
                      ...causeBreakdown.map((row) => `${row.label}: ${row.count}`),
                    ],
                    tableHeaders: ["Date", "System", "Batch", "Fish Dead", "Cause"],
                    tableRows: (showMortalityRecords ? tableRows : rows.slice(0, tableLimitValue)).map((row) => [
                      row.event_date,
                      row.system_id,
                      row.batch_id ?? "-",
                      row.dead_count,
                      CAUSE_LABELS[row.cause] ?? row.cause,
                    ]),
                    commentary: "Cause breakdown is sourced directly from fish_mortality_events.",
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
                    <th className="px-4 py-2 text-left font-semibold text-foreground">Cause</th>
                    <th className="px-4 py-2 text-left font-semibold text-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {tableLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : tableRows.length > 0 ? (
                    tableRows.map((row) => (
                      <tr key={row.id} className="border-b border-border/70 hover:bg-muted/35">
                        <td className="px-4 py-2 font-medium">{row.event_date}</td>
                        <td className="px-4 py-2">{row.system_id}</td>
                        <td className="px-4 py-2">{row.batch_id ?? "-"}</td>
                        <td className="px-4 py-2">{row.dead_count}</td>
                        <td className="px-4 py-2">{CAUSE_LABELS[row.cause] ?? row.cause}</td>
                        <td className="px-4 py-2">{row.notes?.trim() || "-"}</td>
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
              Detailed records hidden. Click <span className="font-medium text-foreground">View details</span> to show up to {tableLimitValue} rows.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
