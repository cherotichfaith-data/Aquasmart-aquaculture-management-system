"use client"

import { useEffect, useMemo, useState } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import CardContent from "@mui/material/CardContent"
import MenuItem from "@mui/material/MenuItem"
import Select from "@mui/material/Select"
import { Card } from "@/components/app-ui/card"
import { Chart } from "@/components/charts/chartjs"
import { DataErrorState, DataFetchingBadge, EmptyState } from "@/components/shared/data-states"
import { buildCartesianOptions, buildMetricAxisBounds, getChartPalette } from "@/components/charts/chartjs-theme"
import { formatNumberValue } from "@/lib/analytics-format"
import { formatStableDate } from "@/lib/deterministic-format"
import { getErrorMessage } from "@/lib/utils/query-result"
import { useWaterQualityMeasurements } from "@/lib/hooks/use-water-quality"

type MeasurementRow = {
  system_id?: number | null
  date?: string | null
  parameter_name?: string | null
  parameter_value?: number | null
}

const PARAMETER_LABELS: Record<string, string> = {
  dissolved_oxygen: "DO",
  temperature: "Temp",
  ph: "pH",
  ammonia: "Ammonia",
  turbidity: "Turbidity",
}

const PARAMETER_AXIS_LABELS: Record<string, string> = {
  dissolved_oxygen: "Dissolved oxygen (mg/L)",
  temperature: "Temperature (deg C)",
  ph: "pH",
  ammonia: "Ammonia (mg/L)",
  turbidity: "Turbidity",
}

const PARAMETER_COLORS: Record<string, string> = {
  dissolved_oxygen: "#4472C4",
  temperature: "#ED7D31",
  ph: "#70AD47",
  ammonia: "#A5A5A5",
  turbidity: "#FFC000",
}

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)

const monthLabel = (key: string) => {
  const date = new Date(`${key}-01T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return key
  return formatStableDate(date, { month: "short", day: undefined, year: "2-digit" })
}

export default function WaterQualityMonthlyAverages({
  farmId,
  dateFrom,
  dateTo,
  scopedSystemIds,
}: {
  farmId?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  scopedSystemIds?: number[] | null
}) {
  const palette = getChartPalette()
  const [selectedParameter, setSelectedParameter] = useState("dissolved_oxygen")
  const enabled = Boolean(farmId && dateFrom && dateTo && Array.isArray(scopedSystemIds) && scopedSystemIds.length > 0)
  const query = useWaterQualityMeasurements({
    farmId,
    dateFrom: dateFrom ?? undefined,
    dateTo: dateTo ?? undefined,
    limit: 10000,
    enabled,
  })

  const monthlyRows = useMemo(() => {
    const rows = query.data?.status === "success" ? (query.data.data as MeasurementRow[]) : []
    const scope = new Set(scopedSystemIds ?? [])
    const buckets = new Map<string, { total: number; count: number }>()

    rows.forEach((row) => {
      if (!row.date || !row.parameter_name || !isFiniteNumber(row.parameter_value)) return
      if (typeof row.system_id !== "number" || !scope.has(row.system_id)) return
      if (row.parameter_name !== selectedParameter) return
      const month = row.date.slice(0, 7)
      const current = buckets.get(month) ?? { total: 0, count: 0 }
      current.total += row.parameter_value
      current.count += 1
      buckets.set(month, current)
    })

    return Array.from(buckets.entries())
      .map(([month, value]) => ({
        month,
        average: value.total / value.count,
        count: value.count,
      }))
      .sort((left, right) => left.month.localeCompare(right.month))
  }, [query.data, scopedSystemIds, selectedParameter])

  const availableParameters = useMemo(() => {
    const set = new Set<string>()
    const rows = query.data?.status === "success" ? (query.data.data as MeasurementRow[]) : []
    const scope = new Set(scopedSystemIds ?? [])
    rows.forEach((row) => {
      if (!row.parameter_name) return
      if (typeof row.system_id !== "number" || !scope.has(row.system_id)) return
      set.add(row.parameter_name)
    })
    return ["dissolved_oxygen", "temperature", "ph", "ammonia", "turbidity"].filter((parameter) => set.has(parameter))
  }, [query.data, scopedSystemIds])

  useEffect(() => {
    if (availableParameters.length === 0 || availableParameters.includes(selectedParameter)) return
    setSelectedParameter(availableParameters[0])
  }, [availableParameters, selectedParameter])

  const bounds = useMemo(
    () =>
      buildMetricAxisBounds(
        monthlyRows.map((row) => row.average).filter(isFiniteNumber),
        { minFloor: 0 },
      ),
    [monthlyRows],
  )
  const data = useMemo<ChartData<"line">>(
    () => ({
      labels: monthlyRows.map((row) => monthLabel(row.month)),
      datasets: [
        {
          label: PARAMETER_LABELS[selectedParameter] ?? selectedParameter.replaceAll("_", " "),
          data: monthlyRows.map((row) => row.average),
          borderColor: PARAMETER_COLORS[selectedParameter] ?? "#4472C4",
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 4,
          spanGaps: true,
          tension: 0.2,
        },
      ],
    }),
    [monthlyRows, selectedParameter],
  )
  const options = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions<"line">({
        palette,
        min: bounds.min,
        max: bounds.max,
        lockYBounds: true,
        yTitle: PARAMETER_AXIS_LABELS[selectedParameter] ?? "Monthly average",
        yTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 1 }),
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const row = monthlyRows[context.dataIndex]
              return `${String(context.dataset.label ?? "")}: ${formatNumberValue(Number(context.parsed.y), { decimals: 2 })} (${row?.count ?? 0} readings)`
            },
          },
        },
      }),
    [bounds.max, bounds.min, monthlyRows, palette, selectedParameter],
  )

  if (query.isError || query.data?.status === "error") {
    return (
      <DataErrorState
        title="Unable to load water-quality averages"
        description={getErrorMessage(query.error) ?? "Please retry or check your connection."}
        onRetry={() => query.refetch()}
      />
    )
  }

  return (
    <Card>
      <CardContent sx={{ "&&": { pt: 2 }, px: 3, pb: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[1rem] font-semibold text-foreground">Water Quality Monthly Average</span>
            <p className="mt-1 text-xs text-muted-foreground">
              One parameter at a time, so the axis matches the farmer's recorded units.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DataFetchingBadge isFetching={query.isFetching} isLoading={query.isLoading} />
            <Select
              value={selectedParameter}
              onChange={(event) => setSelectedParameter(event.target.value)}
              size="small"
              sx={{
                height: 34,
                minWidth: 136,
                fontSize: "0.8125rem",
                fontWeight: 500,
                bgcolor: "background.default",
                "& .MuiSelect-select": { py: "5px", pl: "10px", pr: "28px !important" },
              }}
            >
              {(availableParameters.length > 0 ? availableParameters : Object.keys(PARAMETER_LABELS)).map((parameter) => (
                <MenuItem key={parameter} value={parameter} sx={{ fontSize: "0.8125rem" }}>
                  {PARAMETER_LABELS[parameter] ?? parameter.replaceAll("_", " ")}
                </MenuItem>
              ))}
            </Select>
          </div>
        </div>
        {!enabled ? (
          <EmptyState title="No active production scope" description="Select a farm with active production systems." />
        ) : query.isLoading ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Loading water quality...</div>
        ) : monthlyRows.length ? (
          <div className="border border-border bg-background px-2 py-3">
            <div className="h-[300px]">
              <Chart type="line" data={data} options={options} />
            </div>
          </div>
        ) : (
          <EmptyState
            title={`No ${PARAMETER_LABELS[selectedParameter] ?? "water-quality"} measurements`}
            description="No recorded readings for this parameter match the selected period."
          />
        )}
      </CardContent>
    </Card>
  )
}
