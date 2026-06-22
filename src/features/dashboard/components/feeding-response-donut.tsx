"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { Doughnut } from "@/components/charts/chartjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { DataFetchingBadge } from "@/components/shared/data-states"
import { useFeedingRecords } from "@/features/reports/hooks"
import { formatNumberValue } from "@/lib/analytics-format"
import { FEEDING_RESPONSE_LEVEL_COLORS, parseFeedingResponseLevel } from "@/lib/feeding-response"
import { getChartPalette } from "@/components/charts/chartjs-theme"

const RESPONSE_LABELS = ["No Response", "Low Appetite", "Ideal Appetite", "Good Appetite", "Aggressive Appetite"] as const

function normalizeFeedingResponse(value: string | number | null | undefined): (typeof RESPONSE_LABELS)[number] | null {
  const level = parseFeedingResponseLevel(value)
  if (level == null) return null
  if (level === 1) return "No Response"
  if (level === 2) return "Low Appetite"
  if (level === 3) return "Ideal Appetite"
  if (level === 4) return "Good Appetite"
  return "Aggressive Appetite"
}

export default function FeedingResponseDonut({
  farmId,
  batch = "all",
  dateFrom,
  dateTo,
  scopedSystemIds,
}: {
  farmId?: string | null
  batch?: string
  dateFrom?: string
  dateTo?: string
  scopedSystemIds?: number[] | null
}) {
  const batchId = batch !== "all" && Number.isFinite(Number(batch)) ? Number(batch) : undefined
  const enabled = Boolean(farmId && dateFrom && dateTo) && (!Array.isArray(scopedSystemIds) || scopedSystemIds.length > 0)
  const feedingRecordsQuery = useFeedingRecords({
    farmId,
    systemIds: Array.isArray(scopedSystemIds) ? scopedSystemIds : undefined,
    batchId,
    dateFrom,
    dateTo,
    limit: 5000,
    enabled,
  })
  const records = feedingRecordsQuery.data?.status === "success" ? feedingRecordsQuery.data.data : []
  const palette = getChartPalette()

  const rows = useMemo(() => {
    const counts = new Map<(typeof RESPONSE_LABELS)[number], number>()
    records.forEach((row) => {
      const normalized = normalizeFeedingResponse(row.feeding_response)
      if (!normalized) return
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
    })
    return RESPONSE_LABELS.map((name) => ({ name, value: counts.get(name) ?? 0 }))
  }, [records])

  const hasData = rows.some((row) => row.value > 0)

  const data = useMemo<ChartData<"doughnut">>(
    () => ({
      labels: rows.map((row) => row.name),
      datasets: [
        {
          data: rows.map((row) => row.value),
          backgroundColor: rows.map((row) => FEEDING_RESPONSE_LEVEL_COLORS[row.name]),
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    }),
    [rows],
  )

  const options = useMemo<ChartOptions<"doughnut">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "58%",
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: palette.muted,
            usePointStyle: true,
            pointStyle: "circle",
            boxWidth: 10,
            boxHeight: 10,
            padding: 14,
            font: { size: 11, weight: 500 },
          },
        },
        tooltip: {
          backgroundColor: palette.tooltipBackground,
          borderColor: palette.tooltipBorder,
          borderWidth: 1,
          titleColor: palette.tooltipForeground,
          bodyColor: palette.tooltipForeground,
          padding: 12,
          cornerRadius: 14,
          usePointStyle: true,
          callbacks: {
            title: () => "",
            label: (context: any) =>
              `${context.label}: ${formatNumberValue(Number(context.parsed), { decimals: 0 })} sessions`,
          },
        },
      },
    }),
    [palette],
  )

  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Feeding response distribution</CardTitle>
          <DataFetchingBadge isFetching={feedingRecordsQuery.isFetching} isLoading={feedingRecordsQuery.isLoading} />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {feedingRecordsQuery.isLoading ? (
          <div className="flex h-[340px] items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : !hasData ? (
          <div className="flex h-[340px] items-center justify-center text-sm text-muted-foreground">
            No feeding responses recorded in the selected scope.
          </div>
        ) : (
          <div className="chart-canvas-shell h-[340px]">
            <Doughnut data={data} options={options} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
