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

type SummaryRow = Tables<"production_summary"> & {
    efcr_aggregated?: number
}

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

            // Try fetching real data
            const result = await fetchProductionSummary({
                growth_stage: stage ?? undefined,
                system_id: Number.isFinite(systemId) ? systemId : undefined,
                limit: 500,
            })

            if (!isMounted) return
            console.log("Production Summary Result:", result)
            if (result.status === "success" && result.data.length > 0) {
                setRows(result.data)
            } else {
                // FALLBACK: Zero Data for visualization (3 months back)
                console.log("Using Zero Data Fallback")
                const today = new Date()
                const mockRows: any[] = []
                // 3 months approx 90 days
                for (let i = 0; i < 90; i++) {
                    const d = new Date(today)
                    d.setDate(d.getDate() - i)
                    mockRows.push({
                        date: d.toISOString().split('T')[0],
                        efcr_aggregated: 0,
                        daily_mortality_count: 0,
                        growth_stage: "grow_out",
                        system_id: 1
                    })
                }
                setRows(mockRows)
            }
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

        console.log("Rows:", rows)

        const map = new Map<string, { total_efcr: number; count: number; total_mortality: number }>()

        rows.forEach((row) => {
            if (!row.date) return
            const parsed = new Date(row.date)
            // if (!Number.isNaN(parsed.getTime()) && parsed < cutoff) return
            // TEMPORARY: Allow all data to populate the chart regardless of filter
            // This handles the case where data is old (e.g. 2024) but user views it in 2026.
            if (Number.isNaN(parsed.getTime())) return

            const key = row.date
            const current = map.get(key) ?? { total_efcr: 0, count: 0, total_mortality: 0 }

            if (row.efcr_aggregated !== null && row.efcr_aggregated !== undefined) {
                current.total_efcr += row.efcr_aggregated
                current.count += 1
            }

            if (row.daily_mortality_count) {
                current.total_mortality += row.daily_mortality_count
            }

            map.set(key, current)
        })
        console.log("Map:", map)
        const data = Array.from(map.entries())
            .map(([date, values]) => ({
                date,
                efcr: values.count > 0 ? values.total_efcr / values.count : 0,
                mortality: values.total_mortality
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        console.log("Processed Chart Data:", data)
        return data
    }, [rows, timePeriod])
    console.log("Chart Data:", chartData)
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
                                <Tooltip
                                    formatter={(value: number | string, name) => {
                                        return [typeof value === 'number' ? value.toFixed(2) : value, "eFCR"]
                                    }}
                                    labelFormatter={formatAxisDate}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="efcr"
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
                                <Tooltip
                                    formatter={(value: number | string, name) => {
                                        return [value, "Mortality"]
                                    }}
                                    labelFormatter={formatAxisDate}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="mortality"
                                    fill="#ef4444"
                                    fillOpacity={0.2}
                                    stroke="#ef4444"
                                    name="Mortality"
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
