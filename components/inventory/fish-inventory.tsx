"use client"

import { useMemo, useState } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useDailyFishInventory } from "@/lib/hooks/use-inventory"
import { useBatchSystemIds } from "@/lib/hooks/use-reports"
import { useSystemOptions } from "@/lib/hooks/use-options"

export default function FishInventory({
  selectedBatch,
  selectedSystem,
  selectedStage,
}: {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | "nursing" | "grow_out"
}) {
  const toIsoDate = (date: Date) => {
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, "0")
    const day = `${date.getDate()}`.padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const daysAgoIso = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return toIsoDate(date)
  }

  const formatCompactNumber = (value: number) =>
    new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: value >= 100 ? 0 : 1,
    }).format(value)

  const formatDateLabel = (value: string) => {
    const date = new Date(`${value}T00:00:00`)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date)
  }

  const [trendMetric, setTrendMetric] = useState<"fish" | "mortality" | "biomass">("fish")
  const [trendWindowDays, setTrendWindowDays] = useState<30 | 90 | 180>(90)
  const [tableSearch, setTableSearch] = useState("")
  const [tableFilter, setTableFilter] = useState<"all" | "with_mortality" | "with_biomass">("all")
  const [tableSort, setTableSort] = useState<"newest" | "oldest">("newest")
  const [tablePage, setTablePage] = useState(1)
  const [tablePageSize, setTablePageSize] = useState<10 | 20 | 30>(20)
  const { farmId } = useActiveFarm()
  const systemId = selectedSystem !== "all" ? Number(selectedSystem) : undefined
  const dateFrom = useMemo(() => daysAgoIso(trendWindowDays), [trendWindowDays])
  const dateTo = useMemo(() => toIsoDate(new Date()), [])

  const inventoryQuery = useDailyFishInventory({
    farmId,
    systemId: Number.isFinite(systemId) ? systemId : undefined,
    dateFrom,
    dateTo,
    limit: 2500,
    orderAsc: true,
  })
  const systemsQuery = useSystemOptions({
    farmId,
    stage: selectedStage,
    activeOnly: true,
  })
  const batchId = selectedBatch !== "all" ? Number(selectedBatch) : undefined
  const batchSystemIdsQuery = useBatchSystemIds({
    batchId: Number.isFinite(batchId) ? batchId : undefined,
  })

  const rows = inventoryQuery.data?.status === "success" ? inventoryQuery.data.data : []
  const loading = inventoryQuery.isLoading || systemsQuery.isLoading || batchSystemIdsQuery.isLoading

  const scopedSystemIds = useMemo(() => {
    const fromStage =
      systemsQuery.data?.status === "success"
        ? systemsQuery.data.data.map((row) => row.id).filter((id): id is number => typeof id === "number")
        : []
    const fromBatch =
      batchSystemIdsQuery.data?.status === "success"
        ? batchSystemIdsQuery.data.data.map((row) => row.system_id)
        : []
    const stageSet = new Set(fromStage)
    if (selectedBatch === "all") return stageSet
    return new Set(fromBatch.filter((id) => stageSet.has(id)))
  }, [batchSystemIdsQuery.data, selectedBatch, systemsQuery.data])

  const filteredRows = useMemo(
    () => rows.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id)),
    [rows, scopedSystemIds],
  )

  const dailyTrend = useMemo(() => {
    const byDate = new Map<string, { fish: number; mortality: number; biomass: number }>()
    filteredRows.forEach((row) => {
      if (!row.inventory_date) return
      const current = byDate.get(row.inventory_date) ?? { fish: 0, mortality: 0, biomass: 0 }
      current.fish += row.number_of_fish ?? 0
      current.mortality += row.number_of_fish_mortality ?? 0
      current.biomass += row.biomass_last_sampling ?? 0
      byDate.set(row.inventory_date, current)
    })
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, fish: value.fish, mortality: value.mortality, biomass: value.biomass }))
  }, [filteredRows])

  const chartRows = useMemo(
    () =>
      dailyTrend.map((row) => {
        const date = new Date(`${row.date}T00:00:00`)
        const label = Number.isNaN(date.getTime())
          ? row.date
          : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date)
        return { ...row, label }
      }),
    [dailyTrend],
  )

  const filteredDailyTrend = useMemo(() => {
    const search = tableSearch.trim().toLowerCase()
    const rows = dailyTrend.filter((row) => {
      if (tableFilter === "with_mortality" && row.mortality <= 0) return false
      if (tableFilter === "with_biomass" && row.biomass <= 0) return false
      if (!search) return true
      return row.date.toLowerCase().includes(search)
    })

    return [...rows].sort((a, b) => (tableSort === "newest" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)))
  }, [dailyTrend, tableFilter, tableSearch, tableSort])

  const tableTotalPages = Math.max(1, Math.ceil(filteredDailyTrend.length / tablePageSize))
  const currentTablePage = Math.min(tablePage, tableTotalPages)
  const pagedDailyTrend = useMemo(() => {
    const start = (currentTablePage - 1) * tablePageSize
    const end = start + tablePageSize
    return filteredDailyTrend.slice(start, end)
  }, [currentTablePage, filteredDailyTrend, tablePageSize])

  const trendConfig = useMemo(() => {
    if (trendMetric === "mortality") {
      return {
        key: "mortality" as const,
        label: "Mortality",
        color: "hsl(var(--destructive))",
        decimals: 0,
      }
    }
    if (trendMetric === "biomass") {
      return {
        key: "biomass" as const,
        label: "Biomass (kg)",
        color: "hsl(var(--chart-2))",
        decimals: 1,
      }
    }
    return {
      key: "fish" as const,
      label: "Fish Count",
      color: "hsl(var(--chart-1))",
      decimals: 0,
    }
  }, [trendMetric])

  const trendStats = useMemo(() => {
    const values = chartRows.map((row) => Number(row[trendConfig.key] ?? 0))
    if (values.length === 0) return { latest: 0, peak: 0, avg: 0, min: 0 }
    const latest = values[values.length - 1] ?? 0
    const peak = Math.max(...values)
    const min = Math.min(...values)
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length
    return { latest, peak, avg, min }
  }, [chartRows, trendConfig.key])

  const latestBySystem = useMemo(() => {
    const map = new Map<number, (typeof filteredRows)[number]>()
    filteredRows.forEach((row) => {
      if (row.system_id == null || !row.inventory_date) return
      const existing = map.get(row.system_id)
      if (!existing || String(row.inventory_date) > String(existing.inventory_date ?? "")) {
        map.set(row.system_id, row)
      }
    })
    return Array.from(map.values())
  }, [filteredRows])

  const currentPopulation = latestBySystem.reduce((sum, row) => sum + (row.number_of_fish ?? 0), 0)
  const cumulativeMortality = latestBySystem.reduce(
    (sum, row) => sum + (row.number_of_fish_mortality_aggregated ?? row.number_of_fish_mortality ?? 0),
    0,
  )
  const avgMortalityRate =
    latestBySystem.length > 0
      ? latestBySystem.reduce((sum, row) => sum + (row.mortality_rate ?? 0), 0) / latestBySystem.length
      : 0
  const forecastHarvest30d = Math.max(0, Math.round(currentPopulation * (1 - avgMortalityRate * 30)))
  const latestBiomass = latestBySystem.reduce((sum, row) => sum + (row.biomass_last_sampling ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Current Stocking Count</p>
          <p className="text-3xl font-bold">{currentPopulation.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Mortality-Adjusted Total</p>
          <p className="text-3xl font-bold">{Math.max(0, currentPopulation - cumulativeMortality).toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Forecast Harvest Count (30d)</p>
          <p className="text-3xl font-bold">{forecastHarvest30d.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Biomass (Latest)</p>
          <p className="text-3xl font-bold">{latestBiomass.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
          <div>
            <h3 className="font-semibold">Fish Inventory History and Trends</h3>
            <p className="text-xs text-muted-foreground">
              Daily timeline with focused metric views. Data window: last {trendWindowDays} days.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full bg-muted p-1 w-fit">
              {[
                { key: "fish", label: "Population" },
                { key: "mortality", label: "Mortality" },
                { key: "biomass", label: "Biomass" },
              ].map((metric) => (
                <button
                  key={metric.key}
                  type="button"
                  onClick={() => setTrendMetric(metric.key as typeof trendMetric)}
                  className={`px-3 py-1.5 text-xs rounded-full transition ${
                    trendMetric === metric.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {metric.label}
                </button>
              ))}
            </div>
            <select
              value={trendWindowDays}
              onChange={(event) => {
                setTrendWindowDays(Number(event.target.value) as 30 | 90 | 180)
                setTablePage(1)
              }}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
            >
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 180 days</option>
            </select>
          </div>
        </div>
        {!loading && chartRows.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Latest</p>
              <p className="text-sm font-semibold">
                {trendStats.latest.toLocaleString(undefined, { maximumFractionDigits: trendConfig.decimals })}
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Peak</p>
              <p className="text-sm font-semibold">
                {trendStats.peak.toLocaleString(undefined, { maximumFractionDigits: trendConfig.decimals })}
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Average</p>
              <p className="text-sm font-semibold">
                {trendStats.avg.toLocaleString(undefined, { maximumFractionDigits: trendConfig.decimals })}
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Minimum</p>
              <p className="text-sm font-semibold">
                {trendStats.min.toLocaleString(undefined, { maximumFractionDigits: trendConfig.decimals })}
              </p>
            </div>
          </div>
        ) : null}
        {loading ? (
          <div className="h-[280px] sm:h-[320px] lg:h-[380px] flex items-center justify-center text-muted-foreground">
            Loading trend...
          </div>
        ) : chartRows.length > 0 ? (
          <div className="h-[260px] sm:h-[320px] lg:h-[380px] rounded-md border border-border/70 bg-gradient-to-b from-background to-muted/20 px-1">
            <ResponsiveContainer width="100%" height="100%">
              {trendMetric === "mortality" ? (
                <BarChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" opacity={0.35} />
                  <XAxis dataKey="label" minTickGap={24} interval="preserveStartEnd" />
                  <YAxis width={56} tickFormatter={(value) => formatCompactNumber(Number(value))} />
                  <Tooltip
                    formatter={(value) => [Number(value).toLocaleString(), trendConfig.label]}
                    labelFormatter={(_, payload) => formatDateLabel(String(payload?.[0]?.payload?.date ?? ""))}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="mortality"
                    fill={trendConfig.color}
                    radius={[6, 6, 0, 0]}
                    barSize={chartRows.length > 45 ? 8 : 14}
                  />
                </BarChart>
              ) : (
                <AreaChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="fishTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="biomassTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" opacity={0.35} />
                  <XAxis dataKey="label" minTickGap={24} interval="preserveStartEnd" />
                  <YAxis width={56} tickFormatter={(value) => formatCompactNumber(Number(value))} />
                  <Tooltip
                    formatter={(value) => [
                      Number(value).toLocaleString(undefined, {
                        maximumFractionDigits: trendConfig.decimals,
                      }),
                      trendConfig.label,
                    ]}
                    labelFormatter={(_, payload) => formatDateLabel(String(payload?.[0]?.payload?.date ?? ""))}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={trendMetric === "biomass" ? "biomass" : "fish"}
                    stroke={trendMetric === "biomass" ? "hsl(var(--chart-2))" : "hsl(var(--chart-1))"}
                    fill={trendMetric === "biomass" ? "url(#biomassTrendFill)" : "url(#fishTrendFill)"}
                    strokeWidth={2.8}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[280px] sm:h-[320px] lg:h-[380px] flex items-center justify-center text-muted-foreground">
            No trend data available
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border space-y-3">
          <h3 className="font-semibold">Daily Timeline (Consolidated)</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              value={tableSearch}
              onChange={(event) => {
                setTableSearch(event.target.value)
                setTablePage(1)
              }}
              placeholder="Filter by date (YYYY-MM-DD)"
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            />
            <select
              value={tableFilter}
              onChange={(event) => {
                setTableFilter(event.target.value as "all" | "with_mortality" | "with_biomass")
                setTablePage(1)
              }}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="all">All rows</option>
              <option value="with_mortality">Mortality &gt; 0</option>
              <option value="with_biomass">Biomass &gt; 0</option>
            </select>
            <select
              value={tableSort}
              onChange={(event) => {
                setTableSort(event.target.value as "newest" | "oldest")
                setTablePage(1)
              }}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <select
              value={tablePageSize}
              onChange={(event) => {
                setTablePageSize(Number(event.target.value) as 10 | 20 | 30)
                setTablePage(1)
              }}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value={10}>10 rows</option>
              <option value={20}>20 rows</option>
              <option value={30}>30 rows</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 sm:px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-3 sm:px-4 py-3 text-left font-semibold">Fish Count</th>
                <th className="px-3 sm:px-4 py-3 text-left font-semibold">Mortality</th>
                <th className="px-3 sm:px-4 py-3 text-left font-semibold">Biomass (kg)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : filteredDailyTrend.length > 0 ? (
                pagedDailyTrend.map((row) => (
                  <tr key={row.date} className="border-b border-border hover:bg-muted/30">
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium">{row.date}</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">{row.fish.toLocaleString()}</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">{row.mortality.toLocaleString()}</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                      {row.biomass.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    No inventory snapshots found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-border flex items-center justify-between text-xs sm:text-sm">
          <p className="text-muted-foreground">
            Showing {(currentTablePage - 1) * tablePageSize + (filteredDailyTrend.length > 0 ? 1 : 0)}-
            {Math.min(currentTablePage * tablePageSize, filteredDailyTrend.length)} of {filteredDailyTrend.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTablePage((page) => Math.max(1, page - 1))}
              disabled={currentTablePage <= 1}
              className="h-8 px-3 rounded-md border border-border disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-muted-foreground">
              {currentTablePage}/{tableTotalPages}
            </span>
            <button
              type="button"
              onClick={() => setTablePage((page) => Math.min(tableTotalPages, page + 1))}
              disabled={currentTablePage >= tableTotalPages}
              className="h-8 px-3 rounded-md border border-border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
