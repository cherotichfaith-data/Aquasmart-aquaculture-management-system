"use client"

import { useEffect, useMemo, useState } from "react"
import type React from "react"
import {
    Area,
    CartesianGrid,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import { Activity, Fish } from "lucide-react"
import { format } from "date-fns"
import { fetchProductionSummary, fetchTimeWindow } from "@/lib/supabase-queries"
import type { Tables } from "@/lib/types/database"
import type { TimePeriod } from "@/components/shared/time-period-selector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type SummaryRow = Tables<"production_summary"> & {
    efcr_aggregated?: number | null
}

const formatAxisDate = (value: string | number) => {
    const text = String(value)
    const parsed = new Date(text)
    if (Number.isNaN(parsed.getTime())) return text
    return format(parsed, "MMM d")
}

const formatValue = (value?: number, decimals = 0, unit?: string) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "--"
    const formatted = value.toLocaleString(undefined, { maximumFractionDigits: decimals })
    return unit ? `${formatted} ${unit}` : formatted
}

function StatCard({
    title,
    value,
    icon,
    accent,
}: {
    title: string
    value: string
    icon: React.ReactNode
    accent: string
}) {
    return (
        <div className={`border-l-4 ${accent} bg-card border border-border rounded-sm p-4 shadow-sm`}>
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{title}</p>
                    <p className="text-xl font-semibold text-foreground mt-1">{value}</p>
                </div>
                <div className="text-3xl text-muted-foreground/40">{icon}</div>
            </div>
        </div>
    )
}

export default function PopulationOverview({
    stage,
    system,
    timePeriod,
}: {
    stage: SummaryRow["growth_stage"]
    system?: string
    timePeriod: TimePeriod
}) {
    const [rows, setRows] = useState<SummaryRow[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true
        const loadSummary = async () => {
            setLoading(true)
      const systemId = system && system !== "all" ? Number(system) : undefined
      const bounds = await fetchTimeWindow({ timePeriod })
      const summaryResult = await fetchProductionSummary({
        growth_stage: stage ?? undefined,
        system_id: Number.isFinite(systemId) ? systemId : undefined,
        date_from: bounds.start ?? undefined,
        date_to: bounds.end ?? undefined,
        limit: 500,
      })

      if (!isMounted) return
      setRows(summaryResult.status === "success" ? summaryResult.data : [])
            setLoading(false)
        }
        loadSummary()
        return () => {
            isMounted = false
        }
    }, [stage, system, timePeriod])

    const chartData = useMemo(() => rows, [rows])
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            <Card className="w-full">
                <CardHeader className="border-b border-border">
                    <CardTitle>eFCR Trend</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    {loading ? (
                        <div className="h-[320px] flex items-center justify-center text-muted-foreground">Loading chart...</div>
                    ) : chartData.length ? (
                        <ResponsiveContainer width="100%" height={320}>
                            <ComposedChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickFormatter={(value: any) => formatAxisDate(value)} />
                                <YAxis stroke="#3b82f6" />
                                <Tooltip labelFormatter={formatAxisDate} />
                                <Line
                                    type="monotone"
                                    dataKey="efcr_period"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={false}
                                    name="eFCR"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[320px] flex items-center justify-center text-muted-foreground">No data available.</div>
                    )}
                </CardContent>
            </Card>

            <Card className="w-full">
                <CardHeader className="border-b border-border">
                    <CardTitle>Mortality Trend</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    {loading ? (
                        <div className="h-[320px] flex items-center justify-center text-muted-foreground">Loading chart...</div>
                    ) : chartData.length ? (
                        <ResponsiveContainer width="100%" height={320}>
                            <ComposedChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickFormatter={(value: any) => formatAxisDate(value)} />
                                <YAxis stroke="#ef4444" />
                                <Tooltip labelFormatter={formatAxisDate} />
                                <Area
                                    type="monotone"
                                    dataKey="daily_mortality_count"
                                    fill="#ef4444"
                                    fillOpacity={0.2}
                                    stroke="#ef4444"
                                    name="Mortality count"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[320px] flex items-center justify-center text-muted-foreground">No data available.</div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
