"use client"

import { useMemo } from "react"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useProductionSummary } from "@/lib/hooks/use-production"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { sortByDateAsc } from "@/lib/utils"
import type { Enums } from "@/lib/types/database"
import { downloadCsv, printBrandedPdf } from "@/lib/utils/report-export"

const formatDateLabel = (value: string | number) => {
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(parsed)
}

export default function GrowthReport({
  dateRange,
  systemId,
  stage,
  farmName,
}: {
  dateRange?: { from: string; to: string }
  systemId?: number
  stage?: "all" | Enums<"system_growth_stage">
  farmName?: string | null
}) {
  const { farmId } = useActiveFarm()
  const productionSummaryQuery = useProductionSummary({
    systemId,
    stage: stage && stage !== "all" ? stage : undefined,
    limit: 100,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    farmId: farmId ?? null,
  })
  const rows = productionSummaryQuery.data?.status === "success" ? productionSummaryQuery.data.data : []
  const loading = productionSummaryQuery.isLoading

  const chartRows = useMemo(() => {
    const byDate = new Map<
      string,
      {
        totalBiomass: number
        totalFeed: number
        totalBiomassIncrease: number
        weightedAbw: number
        abwWeight: number
        fallbackAbw: number
        fallbackAbwCount: number
      }
    >()
    rows.forEach((row) => {
      if (!row.date) return
      const current = byDate.get(row.date) ?? {
        totalBiomass: 0,
        totalFeed: 0,
        totalBiomassIncrease: 0,
        weightedAbw: 0,
        abwWeight: 0,
        fallbackAbw: 0,
        fallbackAbwCount: 0,
      }
      current.totalBiomass += row.total_biomass ?? 0
      current.totalFeed += row.total_feed_amount_period ?? 0
      current.totalBiomassIncrease += row.biomass_increase_period ?? 0
      if (typeof row.average_body_weight === "number") {
        const weight = row.number_of_fish_inventory ?? 0
        if (weight > 0) {
          current.weightedAbw += row.average_body_weight * weight
          current.abwWeight += weight
        } else {
          current.fallbackAbw += row.average_body_weight
          current.fallbackAbwCount += 1
        }
      }
      byDate.set(row.date, current)
    })

    return sortByDateAsc(
      Array.from(byDate.entries()).map(([date, current]) => ({
        date,
        average_body_weight:
          current.abwWeight > 0
            ? current.weightedAbw / current.abwWeight
            : current.fallbackAbwCount > 0
              ? current.fallbackAbw / current.fallbackAbwCount
              : null,
        biomass_increase_period: current.totalBiomassIncrease,
        total_biomass: current.totalBiomass,
        total_feed_amount_period: current.totalFeed,
      })),
      (row) => row.date,
    )
  }, [rows])
  const latest = chartRows[chartRows.length - 1]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current ABW</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest?.average_body_weight ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Latest snapshot</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Biomass Increase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest?.biomass_increase_period ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Latest period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Biomass</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest?.total_biomass ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Latest snapshot</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Feed Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest?.total_feed_amount_period ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Latest period</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Average Body Weight (ABW)</CardTitle>
          <CardDescription>ABW progression over time</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="h-[300px] rounded-md border border-border/80 bg-muted/20 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartRows}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={formatDateLabel}
                    formatter={(value, name) => [`${Number(value).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} g`, String(name)]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="average_body_weight"
                    fill="var(--color-chart-1)"
                    stroke="var(--color-chart-1)"
                    fillOpacity={0.3}
                    strokeWidth={2.4}
                    name="ABW"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Biomass Trend</CardTitle>
          <CardDescription>Total biomass per date</CardDescription>
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
                    formatter={(value, name) => [`${Number(value).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`, String(name)]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="total_biomass" stroke="var(--color-chart-2)" strokeWidth={2.4} name="Biomass (kg)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Growth by System</CardTitle>
              <CardDescription>Latest snapshot per system</CardDescription>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-input text-sm hover:bg-muted/40"
                onClick={() =>
                  downloadCsv({
                    filename: `growth-report-${dateRange?.from ?? "start"}-to-${dateRange?.to ?? "end"}.csv`,
                    headers: ["date", "system_name", "average_body_weight", "total_biomass", "number_of_fish_inventory", "biomass_increase_period"],
                    rows: rows.map((row) => [
                      row.date,
                      row.system_name ?? row.system_id,
                      row.average_body_weight,
                      row.total_biomass,
                      row.number_of_fish_inventory,
                      row.biomass_increase_period,
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
                    title: "Growth Report",
                    subtitle: "ABW and biomass progression",
                    farmName,
                    dateRange,
                    summaryLines: [
                      `Current ABW: ${latest?.average_body_weight ?? "N/A"}`,
                      `Biomass increase: ${latest?.biomass_increase_period ?? "N/A"}`,
                      `Total biomass: ${latest?.total_biomass ?? "N/A"}`,
                    ],
                    tableHeaders: ["System", "ABW", "Biomass", "Fish Count", "Daily Gain"],
                    tableRows: rows.map((row) => [
                      row.system_name ?? row.system_id,
                      row.average_body_weight ?? "-",
                      row.total_biomass ?? "-",
                      row.number_of_fish_inventory ?? "-",
                      row.biomass_increase_period ?? "-",
                    ]),
                    commentary: "Generated from api_production_summary.",
                  })
                }
              >
                Export PDF
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border/80">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                <th className="px-4 py-2 text-left font-semibold text-foreground">System</th>
                <th className="px-4 py-2 text-center font-semibold text-foreground">ABW</th>
                <th className="px-4 py-2 text-center font-semibold text-foreground">Biomass</th>
                <th className="px-4 py-2 text-center font-semibold text-foreground">Fish Count</th>
                <th className="px-4 py-2 text-center font-semibold text-foreground">Daily Gain</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((row) => (
                  <tr key={`${row.system_id}-${row.date}`} className="border-b border-border/70 hover:bg-muted/35">
                    <td className="px-4 py-2 font-medium">{row.system_name ?? row.system_id}</td>
                    <td className="px-4 py-2 text-center">{row.average_body_weight ?? "-"}</td>
                    <td className="px-4 py-2 text-center">{row.total_biomass ?? "-"}</td>
                    <td className="px-4 py-2 text-center">{row.number_of_fish_inventory ?? "-"}</td>
                    <td className="px-4 py-2 text-center">{row.biomass_increase_period ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">
                    No growth records found
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
