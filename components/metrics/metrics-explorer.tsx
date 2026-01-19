"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  fetchDailyFishInventory,
  fetchProductionSummary,
  fetchSystemsList,
  fetchWaterQualityRatings,
} from "@/lib/supabase-queries"

type MetricKey =
  | "efcr_periodic"
  | "efcr_aggregated"
  | "mortality"
  | "biomass_increase"
  | "abw"
  | "water_quality"
  | "feeding"
  | "density"
  | "fish_health"

type AggregationMode = "daily" | "period" | "aggregated"
type PeriodKey = "7d" | "30d" | "90d" | "180d" | "365d"
type MortalityMode = "rate" | "count"
type ChartPoint = { date: string; value: number }
type AggregateMode = "sum" | "avg"
type DataSource = "daily_fish_inventory_table" | "production_summary" | "daily_water_quality_rating"

type MetricConfig = {
  label: string
  unit: string
  defaultAggregation: AggregationMode
  supportedAggregations: AggregationMode[]
  comingSoon?: boolean
}

type SeriesConfig = {
  source: DataSource
  getDate: (row: Record<string, unknown>) => string | null | undefined
  getValue: (row: Record<string, unknown>) => number | null
  aggregate: AggregateMode
  unit: string
  isPercent?: boolean
  precision?: number
}

const DEFAULT_METRIC: MetricKey = "efcr_periodic"

const METRIC_REGISTRY: Record<MetricKey, MetricConfig> = {
  efcr_periodic: {
    label: "eFCR periodic",
    unit: "",
    defaultAggregation: "period",
    supportedAggregations: ["period"],
  },
  efcr_aggregated: {
    label: "eFCR aggregated",
    unit: "",
    defaultAggregation: "aggregated",
    supportedAggregations: ["aggregated"],
  },
  mortality: {
    label: "Daily mortality rate",
    unit: "%",
    defaultAggregation: "daily",
    supportedAggregations: ["daily", "period"],
  },
  biomass_increase: {
    label: "Biomass increase",
    unit: "kg",
    defaultAggregation: "period",
    supportedAggregations: ["period", "aggregated"],
  },
  abw: {
    label: "ABW",
    unit: "g",
    defaultAggregation: "daily",
    supportedAggregations: ["daily", "period"],
  },
  water_quality: {
    label: "Water quality",
    unit: "",
    defaultAggregation: "daily",
    supportedAggregations: ["daily", "period"],
  },
  feeding: {
    label: "Feeding rate",
    unit: "%",
    defaultAggregation: "daily",
    supportedAggregations: ["daily", "period", "aggregated"],
  },
  density: {
    label: "Density",
    unit: "kg/m",
    defaultAggregation: "daily",
    supportedAggregations: ["daily", "period"],
  },
  fish_health: {
    label: "Fish health",
    unit: "",
    defaultAggregation: "daily",
    supportedAggregations: ["daily"],
    comingSoon: true,
  },
}

const AGGREGATION_OPTIONS: Array<{ value: AggregationMode; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "period", label: "Period" },
  { value: "aggregated", label: "Aggregated" },
]

const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string; days: number }> = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "180d", label: "Last 6 months", days: 180 },
  { value: "365d", label: "Last 12 months", days: 365 },
]

const isMetricKey = (value: string | null): value is MetricKey =>
  Boolean(value && value in METRIC_REGISTRY)

const isAggregationMode = (value: string | null): value is AggregationMode =>
  value === "daily" || value === "period" || value === "aggregated"

const isPeriodKey = (value: string | null): value is PeriodKey =>
  value === "7d" || value === "30d" || value === "90d" || value === "180d" || value === "365d"

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeDateKey = (value: string) => value.split("T")[0]

const getPeriodDays = (value: PeriodKey) => PERIOD_OPTIONS.find((option) => option.value === value)?.days ?? 30

const getFetchLimit = (period: PeriodKey, aggregation: AggregationMode) => {
  const days = getPeriodDays(period)
  if (aggregation === "aggregated") return Math.min(Math.max(days, 60), 500)
  const multiplier = aggregation === "daily" ? 12 : 4
  return Math.min(Math.max(days * multiplier, 60), 2000)
}

const formatDateLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)
}

const aggregateByDate = (points: ChartPoint[], aggregate: AggregateMode) => {
  const grouped = new Map<string, { sum: number; count: number }>()

  points.forEach((point) => {
    const entry = grouped.get(point.date) ?? { sum: 0, count: 0 }
    entry.sum += point.value
    entry.count += 1
    grouped.set(point.date, entry)
  })

  return Array.from(grouped.entries())
    .map(([date, entry]) => ({
      date,
      value: aggregate === "avg" ? entry.sum / entry.count : entry.sum,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

const filterByPeriod = (points: ChartPoint[], period: PeriodKey) => {
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - getPeriodDays(period))

  return points.filter((point) => {
    const date = new Date(`${point.date}T00:00:00`)
    return date >= cutoff
  })
}

const getSeriesConfig = (
  metric: MetricKey,
  aggregation: AggregationMode,
  options: { mortalityMode: MortalityMode },
): SeriesConfig | null => {
  switch (metric) {
    case "efcr_periodic":
      if (aggregation !== "period") return null
      return {
        source: "production_summary",
        getDate: (row) => row.date as string | null,
        getValue: (row) => toNumber(row.efcr_period),
        aggregate: "avg",
        unit: "",
        precision: 2,
      }
    case "efcr_aggregated":
      if (aggregation !== "aggregated") return null
      return {
        source: "production_summary",
        getDate: (row) => row.date as string | null,
        getValue: (row) => toNumber((row as Record<string, unknown>).efcr_aggregated),
        aggregate: "avg",
        unit: "",
        precision: 2,
      }
    case "mortality":
      if (aggregation === "daily") {
        if (options.mortalityMode === "count") {
          return {
            source: "daily_fish_inventory_table",
            getDate: (row) => row.inventory_date as string | null,
            getValue: (row) => toNumber(row.number_of_fish_mortality),
            aggregate: "sum",
            unit: "",
            precision: 0,
          }
        }
        return {
          source: "daily_fish_inventory_table",
          getDate: (row) => row.inventory_date as string | null,
          getValue: (row) => toNumber(row.mortality_rate),
          aggregate: "avg",
          unit: "%",
          isPercent: true,
          precision: 2,
        }
      }
      if (aggregation === "period") {
        if (options.mortalityMode === "count") {
          return {
            source: "production_summary",
            getDate: (row) => row.date as string | null,
            getValue: (row) => toNumber(row.daily_mortality_count),
            aggregate: "sum",
            unit: "",
            precision: 0,
          }
        }
        return {
          source: "production_summary",
          getDate: (row) => row.date as string | null,
          getValue: (row) => {
            const count = toNumber(row.daily_mortality_count)
            const inventory = toNumber(row.number_of_fish_inventory)
            if (count === null || inventory === null || inventory === 0) return null
            return count / inventory
          },
          aggregate: "avg",
          unit: "%",
          isPercent: true,
          precision: 2,
        }
      }
      return null
    case "biomass_increase":
      if (aggregation === "period") {
        return {
          source: "production_summary",
          getDate: (row) => row.date as string | null,
          getValue: (row) => {
            const direct = toNumber((row as Record<string, unknown>).biomass_increase_period)
            if (direct !== null) return direct
            return toNumber(row.daily_biomass_gain)
          },
          aggregate: "sum",
          unit: "kg",
          precision: 1,
        }
      }
      if (aggregation === "aggregated") {
        return {
          source: "production_summary",
          getDate: (row) => row.date as string | null,
          getValue: (row) => toNumber((row as Record<string, unknown>).biomass_increase_aggregated),
          aggregate: "sum",
          unit: "kg",
          precision: 1,
        }
      }
      return null
    case "abw":
      if (aggregation === "daily") {
        return {
          source: "daily_fish_inventory_table",
          getDate: (row) => row.inventory_date as string | null,
          getValue: (row) => toNumber(row.abw_last_sampling),
          aggregate: "avg",
          unit: "g",
          precision: 0,
        }
      }
      if (aggregation === "period") {
        return {
          source: "production_summary",
          getDate: (row) => row.date as string | null,
          getValue: (row) => toNumber(row.average_body_weight),
          aggregate: "avg",
          unit: "g",
          precision: 0,
        }
      }
      return null
    case "water_quality":
      if (aggregation === "daily") {
        return {
          source: "daily_water_quality_rating",
          getDate: (row) => row.rating_date as string | null,
          getValue: (row) => {
            const numeric = toNumber(row.rating_numeric)
            if (numeric !== null) return numeric
            return toNumber(row.rating)
          },
          aggregate: "avg",
          unit: "",
          precision: 1,
        }
      }
      if (aggregation === "period") {
        return {
          source: "production_summary",
          getDate: (row) => row.date as string | null,
          getValue: (row) => toNumber(row.water_quality_rating),
          aggregate: "avg",
          unit: "",
          precision: 1,
        }
      }
      return null
    case "feeding":
      if (aggregation === "daily") {
        return {
          source: "daily_fish_inventory_table",
          getDate: (row) => row.inventory_date as string | null,
          getValue: (row) => toNumber(row.feeding_rate),
          aggregate: "avg",
          unit: "%",
          isPercent: true,
          precision: 2,
        }
      }
      if (aggregation === "period") {
        return {
          source: "production_summary",
          getDate: (row) => row.date as string | null,
          getValue: (row) => toNumber(row.total_feed_amount_period),
          aggregate: "sum",
          unit: "kg",
          precision: 1,
        }
      }
      if (aggregation === "aggregated") {
        return {
          source: "production_summary",
          getDate: (row) => row.date as string | null,
          getValue: (row) => {
            const aggregated = toNumber((row as Record<string, unknown>).total_feed_amount_aggregated)
            if (aggregated !== null) return aggregated
            const fallback = toNumber((row as Record<string, unknown>).feeding_amount_aggregated)
            return fallback ?? toNumber(row.total_feed_amount_period)
          },
          aggregate: "sum",
          unit: "kg",
          precision: 1,
        }
      }
      return null
    case "density":
      if (aggregation === "daily") {
        return {
          source: "daily_fish_inventory_table",
          getDate: (row) => row.inventory_date as string | null,
          getValue: (row) => toNumber(row.biomass_density),
          aggregate: "avg",
          unit: "kg/m",
          precision: 1,
        }
      }
      if (aggregation === "period") {
        return {
          source: "production_summary",
          getDate: (row) => row.date as string | null,
          getValue: (row) => toNumber(row.biomass_density),
          aggregate: "avg",
          unit: "kg/m",
          precision: 1,
        }
      }
      return null
    case "fish_health":
      return null
    default:
      return null
  }
}

export default function MetricsExplorer({
  initialMetric,
  syncMetricToPath = false,
}: {
  initialMetric?: string
  syncMetricToPath?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const metricFromQuery = searchParams.get("filter")
  const metricFromRoute = isMetricKey(initialMetric ?? null) ? (initialMetric as MetricKey) : null
  const metricKey = isMetricKey(metricFromQuery) ? metricFromQuery : metricFromRoute ?? DEFAULT_METRIC
  const metricConfig = METRIC_REGISTRY[metricKey]

  const aggregationFromQuery = searchParams.get("aggregation")
  const aggregationCandidate = isAggregationMode(aggregationFromQuery)
    ? aggregationFromQuery
    : metricConfig.defaultAggregation
  const aggregation = metricConfig.supportedAggregations.includes(aggregationCandidate)
    ? aggregationCandidate
    : metricConfig.defaultAggregation

  const periodParam = searchParams.get("period")
  const periodValue: PeriodKey = isPeriodKey(periodParam) ? periodParam : "30d"
  const systemValue = searchParams.get("system") ?? "all"
  const mortalityMode: MortalityMode = searchParams.get("mortality") === "count" ? "count" : "rate"

  const [systems, setSystems] = useState<Array<{ id: number; name: string }>>([])
  const [series, setSeries] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const seriesConfig = useMemo(
    () => getSeriesConfig(metricKey, aggregation, { mortalityMode }),
    [metricKey, aggregation, mortalityMode],
  )

  const periodLabel = useMemo(
    () => PERIOD_OPTIONS.find((option) => option.value === periodValue)?.label ?? "Last 30 days",
    [periodValue],
  )

  const systemLabel = useMemo(() => {
    if (systemValue === "all") return "All systems"
    const selected = systems.find((system) => String(system.id) === systemValue)
    return selected?.name ?? `System ${systemValue}`
  }, [systems, systemValue])

  const updateQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      const nextMetric = updates.filter ?? metricKey

      params.set("filter", nextMetric)

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })

      const query = params.toString()
      const basePath = syncMetricToPath ? `/metrics/${nextMetric}` : pathname
      router.push(query ? `${basePath}?${query}` : basePath)
    },
    [searchParams, metricKey, pathname, router, syncMetricToPath],
  )

  useEffect(() => {
    const loadSystems = async () => {
      const result = await fetchSystemsList()
      if (result.status === "success") {
        setSystems(result.data)
      }
    }
    loadSystems()
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      if (metricConfig.comingSoon || !seriesConfig) {
        setSeries([])
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      const systemId =
        systemValue !== "all" && Number.isFinite(Number(systemValue)) ? Number(systemValue) : undefined
      const limit = getFetchLimit(periodValue, aggregation)

      let result
      if (seriesConfig.source === "daily_fish_inventory_table") {
        result = await fetchDailyFishInventory({ system_id: systemId, limit })
      } else if (seriesConfig.source === "production_summary") {
        result = await fetchProductionSummary({ system_id: systemId, limit })
      } else {
        result = await fetchWaterQualityRatings({ system_id: systemId, limit })
      }

      if (cancelled) return

      if (result.status !== "success") {
        setSeries([])
        setError(result.error ?? "Unable to load data")
        setLoading(false)
        return
      }

      const points = result.data
        .map((row) => {
          const rawDate = seriesConfig.getDate(row as Record<string, unknown>)
          const value = seriesConfig.getValue(row as Record<string, unknown>)
          if (!rawDate || value === null) return null
          return {
            date: normalizeDateKey(rawDate),
            value,
          }
        })
        .filter(Boolean) as ChartPoint[]

      const aggregated = aggregateByDate(points, seriesConfig.aggregate)
      const filtered = filterByPeriod(aggregated, periodValue)

      setSeries(filtered)
      setLoading(false)
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [aggregation, metricConfig.comingSoon, periodValue, seriesConfig, systemValue])

  const handleMetricChange = (value: string) => {
    if (!isMetricKey(value)) return
    const nextMetric = value
    const nextConfig = METRIC_REGISTRY[nextMetric]
    const nextAggregation = nextConfig.supportedAggregations.includes(aggregation)
      ? aggregation
      : nextConfig.defaultAggregation
    updateQuery({ filter: nextMetric, aggregation: nextAggregation })
  }

  const handleSystemChange = (value: string) => updateQuery({ system: value })

  const handlePeriodChange = (value: string) => {
    if (!isPeriodKey(value)) return
    updateQuery({ period: value })
  }

  const handleAggregationChange = (value: AggregationMode) => updateQuery({ aggregation: value })

  const handleMortalityModeChange = (value: MortalityMode) => updateQuery({ mortality: value })

  const formatValue = useCallback(
    (value: number, isTooltip = false) => {
      if (!seriesConfig) return String(value)
      if (seriesConfig.isPercent) {
        return `${(value * 100).toFixed(isTooltip ? 2 : 1)}%`
      }
      const precision = seriesConfig.precision ?? 2
      const formatted = precision === 0 ? String(Math.round(value)) : value.toFixed(precision)
      return seriesConfig.unit ? `${formatted}${seriesConfig.unit}` : formatted
    },
    [seriesConfig],
  )

  const description = useMemo(() => {
    const aggregationLabel = AGGREGATION_OPTIONS.find((option) => option.value === aggregation)?.label ?? "Daily"
    return `${aggregationLabel} series · ${periodLabel} · ${systemLabel}`
  }, [aggregation, periodLabel, systemLabel])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold">System-Level Overview</h1>
          <p className="text-muted-foreground mt-1">Explore farm metrics across systems and time periods.</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Select value={metricKey} onValueChange={handleMetricChange}>
            <SelectTrigger className="min-w-[200px]">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Object.entries(METRIC_REGISTRY).map(([key, metric]) => (
                  <SelectItem key={key} value={key}>
                    {metric.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={systemValue} onValueChange={handleSystemChange}>
            <SelectTrigger className="min-w-[200px]">
              <SelectValue placeholder="All systems" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All systems</SelectItem>
                {systems.map((system) => (
                  <SelectItem key={system.id} value={String(system.id)}>
                    {system.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={periodValue} onValueChange={handlePeriodChange}>
            <SelectTrigger className="min-w-[200px]">
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <div className="inline-flex items-center rounded-full border border-border bg-muted/40 p-1">
            {AGGREGATION_OPTIONS.map((option) => {
              const isActive = aggregation === option.value
              const isSupported = metricConfig.supportedAggregations.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={!isSupported}
                  onClick={() => (isSupported ? handleAggregationChange(option.value) : undefined)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                    isActive
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  } ${isSupported ? "" : "opacity-40 cursor-not-allowed"}`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          {metricKey === "mortality" && (
            <div className="inline-flex items-center rounded-full border border-border bg-muted/40 p-1">
              {([
                { value: "rate", label: "Rate" },
                { value: "count", label: "Count" },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleMortalityModeChange(option.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                    mortalityMode === option.value
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{metricConfig.label}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {metricConfig.comingSoon ? (
            <div className="h-[320px] flex items-center justify-center text-muted-foreground">
              Coming soon.
            </div>
          ) : loading ? (
            <div className="h-[320px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="h-[320px] flex items-center justify-center text-destructive">{error}</div>
          ) : series.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-muted-foreground">No data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDateLabel} />
                <YAxis tickFormatter={(value) => formatValue(Number(value), false)} width={64} />
                <Tooltip
                  cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const point = payload[0]
                    return (
                      <div className="rounded-md border border-border bg-card px-3 py-2 shadow-md">
                        <p className="text-xs text-muted-foreground">{formatDateLabel(String(label))}</p>
                        <p className="text-sm font-medium text-foreground">
                          {formatValue(Number(point.value), true)}
                        </p>
                      </div>
                    )
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-chart-1)"
                  fill="url(#metricFill)"
                  strokeWidth={2}
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
