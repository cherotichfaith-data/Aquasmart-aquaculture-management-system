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
  fetchTimePeriodBounds,
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

type PeriodKey =
  | "day"
  | "week"
  | "2 weeks"
  | "month"
  | "quarter"
  | "6 months"
  | "year"

type ChartPoint = { date: string; value: number }

type DataSource = "daily_fish_inventory_table" | "production_summary" | "daily_water_quality_rating"

type MetricConfig = {
  label: string
  unit: string
  comingSoon?: boolean
}

type SeriesConfig = {
  source: DataSource
  getDate: (row: Record<string, unknown>) => string | null | undefined
  getValue: (row: Record<string, unknown>) => number | null
  unit: string
  isPercent?: boolean
  precision?: number
}

const DEFAULT_METRIC: MetricKey = "efcr_periodic"

const METRIC_REGISTRY: Record<MetricKey, MetricConfig> = {
  efcr_periodic: { label: "eFCR periodic", unit: "" },
  efcr_aggregated: { label: "eFCR aggregated", unit: "" },
  mortality: { label: "Daily mortality rate", unit: "%" },
  biomass_increase: { label: "Biomass increase", unit: "kg" },
  abw: { label: "ABW", unit: "g" },
  water_quality: { label: "Water quality", unit: "" },
  feeding: { label: "Feeding rate", unit: "%" },
  density: { label: "Density", unit: "kg/m" },
  fish_health: { label: "Fish health", unit: "", comingSoon: true },
}

const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string }> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "2 weeks", label: "2 Weeks" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "6 months", label: "6 Months" },
  { value: "year", label: "Year" },
]

const isMetricKey = (value: string | null): value is MetricKey =>
  Boolean(value && value in METRIC_REGISTRY)

const isPeriodKey = (value: string | null): value is PeriodKey =>
  value === "day" ||
  value === "week" ||
  value === "2 weeks" ||
  value === "month" ||
  value === "quarter" ||
  value === "6 months" ||
  value === "year"

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeDateKey = (value: string) => value.split("T")[0]

const formatDateLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)
}

const getSeriesConfig = (metric: MetricKey): SeriesConfig | null => {
  switch (metric) {
    case "efcr_periodic":
      return {
        source: "production_summary",
        getDate: (row) => row.date as string | null,
        getValue: (row) => toNumber(row.efcr_period),
        unit: "",
        precision: 2,
      }
    case "efcr_aggregated":
      return {
        source: "production_summary",
        getDate: (row) => row.date as string | null,
        getValue: (row) => toNumber((row as Record<string, unknown>).efcr_aggregated),
        unit: "",
        precision: 2,
      }
    case "mortality":
      return {
        source: "daily_fish_inventory_table",
        getDate: (row) => row.inventory_date as string | null,
        getValue: (row) => toNumber(row.mortality_rate),
        unit: "%",
        isPercent: true,
        precision: 2,
      }
    case "biomass_increase":
      return {
        source: "production_summary",
        getDate: (row) => row.date as string | null,
        getValue: (row) => {
          const direct = toNumber((row as Record<string, unknown>).biomass_increase_period)
          if (direct !== null) return direct
          return toNumber(row.daily_biomass_gain)
        },
        unit: "kg",
        precision: 1,
      }
    case "abw":
      return {
        source: "production_summary",
        getDate: (row) => row.date as string | null,
        getValue: (row) => toNumber(row.average_body_weight),
        unit: "g",
        precision: 0,
      }
    case "water_quality":
      return {
        source: "daily_water_quality_rating",
        getDate: (row) => row.rating_date as string | null,
        getValue: (row) => {
          const numeric = toNumber(row.rating_numeric)
          if (numeric !== null) return numeric
          return toNumber(row.rating)
        },
        unit: "",
        precision: 1,
      }
    case "feeding":
      return {
        source: "daily_fish_inventory_table",
        getDate: (row) => row.inventory_date as string | null,
        getValue: (row) => toNumber(row.feeding_rate),
        unit: "%",
        isPercent: true,
        precision: 2,
      }
    case "density":
      return {
        source: "daily_fish_inventory_table",
        getDate: (row) => row.inventory_date as string | null,
        getValue: (row) => toNumber(row.biomass_density),
        unit: "kg/m",
        precision: 1,
      }
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

  const periodParam = searchParams.get("period")
  const periodValue: PeriodKey = isPeriodKey(periodParam) ? periodParam : "month"
  const systemValue = searchParams.get("system") ?? "all"

  const [systems, setSystems] = useState<Array<{ id: number; name: string }>>([])
  const [series, setSeries] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const seriesConfig = useMemo(() => getSeriesConfig(metricKey), [metricKey])

  const periodLabel = useMemo(
    () => PERIOD_OPTIONS.find((option) => option.value === periodValue)?.label ?? "Month",
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

      const bounds = await fetchTimePeriodBounds(periodValue)
      const dateFrom = bounds.start ?? undefined
      const dateTo = bounds.end ?? undefined

      let result
      if (seriesConfig.source === "daily_fish_inventory_table") {
        result = await fetchDailyFishInventory({ system_id: systemId, date_from: dateFrom, date_to: dateTo, limit: 2000 })
      } else if (seriesConfig.source === "production_summary") {
        result = await fetchProductionSummary({ system_id: systemId, date_from: dateFrom, date_to: dateTo, limit: 2000 })
      } else {
        result = await fetchWaterQualityRatings({ system_id: systemId, date_from: dateFrom, date_to: dateTo, limit: 2000 })
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

      setSeries(points)
      setLoading(false)
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [metricConfig.comingSoon, periodValue, seriesConfig, systemValue])

  const handleMetricChange = (value: string) => {
    if (!isMetricKey(value)) return
    const nextMetric = value
    updateQuery({ filter: nextMetric })
  }

  const handleSystemChange = (value: string) => updateQuery({ system: value })

  const handlePeriodChange = (value: string) => {
    if (!isPeriodKey(value)) return
    updateQuery({ period: value })
  }

  const formatValue = useCallback(
    (value: number, isTooltip = false) => {
      if (!seriesConfig) return String(value)
      if (seriesConfig.isPercent) {
        return `${value.toFixed(isTooltip ? 2 : 1)}%`
      }
      const precision = seriesConfig.precision ?? 2
      const formatted = precision === 0 ? String(Math.round(value)) : value.toFixed(precision)
      return seriesConfig.unit ? `${formatted}${seriesConfig.unit}` : formatted
    },
    [seriesConfig],
  )

  const description = useMemo(() => {
    return `${periodLabel} · ${systemLabel}`
  }, [periodLabel, systemLabel])

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
              <SelectValue placeholder="Month" />
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
            <span className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">Period view</span>
          </div>
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
