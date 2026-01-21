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
import { fetchProductionSummary } from "@/lib/supabase-queries"
import type { Tables } from "@/lib/types/database"
import type { TimePeriod } from "@/components/shared/time-period-selector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type SummaryRow = Tables<"production_summary">

type ChartPoint = {
    date: string
    total_biomass: number
    total_fish: number
}

type Totals = {
    totalBiomass: number
    totalFish: number
}

const daysByPeriod: Record<TimePeriod, number> = {
    day: 1,
    week: 7,
    "2 weeks": 14,
    month: 30,
    quarter: 90,
    "6 months": 180,
    year: 365,
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
            console.log("Fetching production summary with filters:", { stage, systemId, timePeriod })
            const result = await fetchProductionSummary({
                growth_stage: stage ?? undefined,
                system_id: Number.isFinite(systemId) ? systemId : undefined,
                limit: 500,
            })
            if (!isMounted) return
            console.log("Fetch result:", result)
            setRows(result.status === "success" ? result.data : [])
            setLoading(false)
        }
        loadSummary()
        return () => {
            isMounted = false
        }
    }, [stage, system, timePeriod])

    const chartData = useMemo(() => {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - daysByPeriod[timePeriod])

        const map = new Map<string, { total_fish: number }>()

        rows.forEach((row) => {
            if (!row.date) return
            const parsed = new Date(row.date)
            if (!Number.isNaN(parsed.getTime()) && parsed < cutoff) return

            const key = row.date
            const current = map.get(key) ?? { total_fish: 0 }

            current.total_fish += row.number_of_fish_inventory ?? 0

            map.set(key, current)
        })

        const data = Array.from(map.entries())
            .map(([date, values]) => ({
                date,
                total_fish: values.total_fish,
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        console.log("Processed Chart Data:", data)
        return data
    }, [rows, timePeriod])

    return (
        <Card className="w-full">
            <CardHeader className="border-b border-border">
                <CardTitle>Population Trend</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                {loading ? (
                    <div className="h-[320px] flex items-center justify-center text-muted-foreground">Loading chart...</div>
                ) : chartData.length ? (
                    <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickFormatter={(value: any) => formatAxisDate(value)} />
                            <YAxis />
                            <Tooltip
                                formatter={(value: number | string, name) => {
                                    return [value, "Population"]
                                }}
                                labelFormatter={formatAxisDate}
                            />
                            <Line
                                type="monotone"
                                dataKey="total_fish"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={false}
                                name="Population"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[320px] flex items-center justify-center text-muted-foreground">No data available.</div>
                )}
            </CardContent>
        </Card>
    )
}
