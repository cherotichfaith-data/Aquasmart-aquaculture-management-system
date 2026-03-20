"use client"

import { AlertTriangle, CheckCircle, Layers } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatTimestamp } from "./_lib/water-quality-utils"
import type { DepthProfileRow } from "./_lib/water-quality-selectors"

const getDoColor = (value: number) => {
  if (value < 3) return "#EF4444"
  if (value < 5) return "#F59E0B"
  return "#10B981"
}

const DepthProfileTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: number | string
}) => {
  if (!active || !payload || payload.length === 0) return null
  const depthLabel = typeof label === "number" ? label.toFixed(1) : String(label ?? "")
  return (
    <div className="rounded-md border border-border bg-card p-3 shadow-md">
      <p className="mb-2 text-xs text-muted-foreground">Depth: {depthLabel} m</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color ?? "currentColor" }} />
          <span className="text-muted-foreground">{entry.name ?? "Value"}:</span>
          <span className="font-semibold text-foreground">
            {typeof entry.value === "number" ? entry.value.toFixed(2) : "--"}
          </span>
        </div>
      ))}
    </div>
  )
}

export function WaterQualityDepthTab({
  selectedDepthProfileDate,
  onSelectDepthProfileDate,
  depthDates,
  isAllSystemsSelected,
  depthProfileData,
  depthProfileDoData,
  depthProfileTempData,
  isStratified,
  hasGradient,
  surfaceDo,
  bottomDo,
  doGradient,
  tempGradient,
}: {
  selectedDepthProfileDate: string | null
  onSelectDepthProfileDate: (value: string) => void
  depthDates: string[]
  isAllSystemsSelected: boolean
  depthProfileData: DepthProfileRow[]
  depthProfileDoData: Array<DepthProfileRow & { dissolvedOxygen: number }>
  depthProfileTempData: Array<DepthProfileRow & { temperature: number }>
  isStratified: boolean
  hasGradient: boolean
  surfaceDo: number | null
  bottomDo: number | null
  doGradient: number | null
  tempGradient: number | null
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/20">
            <Layers className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Stratification Analysis</h2>
            <p className="text-sm text-muted-foreground">Vertical water quality stratification analysis.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedDepthProfileDate ?? ""} onValueChange={onSelectDepthProfileDate}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              {depthDates.map((date) => (
                <SelectItem key={date} value={date}>
                  {formatTimestamp(`${date}T00:00:00`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isAllSystemsSelected ? (
        <Card className="border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Select a system to view stratification analysis.
          </CardContent>
        </Card>
      ) : depthProfileData.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground">
            No stratification profile measurements found in the selected time period.
          </CardContent>
        </Card>
      ) : (
        <>
          {depthProfileDoData.length < 2 ? (
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-sm text-muted-foreground">
                Not enough dissolved oxygen depth readings to assess stratification.
              </CardContent>
            </Card>
          ) : isStratified || hasGradient ? (
            <Card className="border-red-500/30 bg-red-500/10">
              <CardContent className="flex items-start gap-3 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-300" />
                <div>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-300">Stratification Risk Detected</p>
                  <p className="mt-1 text-xs text-red-600/80 dark:text-red-300/80">
                    {isStratified && surfaceDo != null && bottomDo != null
                      ? `Bottom oxygen (${bottomDo.toFixed(1)} mg/L) is critically low while surface oxygen (${surfaceDo.toFixed(1)} mg/L) remains normal. `
                      : doGradient != null
                        ? `Significant DO gradient of ${doGradient.toFixed(1)} mg/L detected between surface and bottom. `
                        : ""}
                    Recommended: Increase aeration, improve water mixing, reduce feeding.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-emerald-500/30 bg-emerald-500/10">
              <CardContent className="flex items-start gap-3 p-4">
                <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">No Stratification Detected</p>
                  <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                    Water column appears well-mixed. DO gradient: {doGradient != null ? doGradient.toFixed(1) : "--"} mg/L.
                    Temperature gradient: {tempGradient != null ? tempGradient.toFixed(1) : "--"} deg C.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  Dissolved Oxygen by Depth
                  <Badge
                    variant="outline"
                    className={
                      depthProfileDoData.length === 0
                        ? "border-border text-muted-foreground"
                        : isStratified || hasGradient
                          ? "bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/30"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    }
                  >
                    {depthProfileDoData.length === 0 ? "NO DATA" : isStratified || hasGradient ? "STRATIFIED" : "MIXED"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {depthProfileDoData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    No dissolved oxygen depth measurements.
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={depthProfileDoData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          label={{ value: "DO (mg/L)", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <YAxis
                          dataKey="depth"
                          type="number"
                          reversed
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          label={{ value: "Depth (m)", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <Tooltip content={<DepthProfileTooltip />} />
                        <ReferenceLine x={3} stroke="#EF4444" strokeDasharray="4 4" />
                        <ReferenceLine x={5} stroke="#F59E0B" strokeDasharray="4 4" />
                        <Bar dataKey="dissolvedOxygen" name="DO (mg/L)" radius={[0, 4, 4, 0]} barSize={20}>
                          {depthProfileDoData.map((entry, index) => (
                            <Cell key={`do-cell-${index}`} fill={getDoColor(entry.dissolvedOxygen)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  Temperature by Depth
                  <span className="text-xs text-muted-foreground">
                    Gradient: {tempGradient != null ? tempGradient.toFixed(1) : "--"} deg C
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {depthProfileTempData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    No temperature depth measurements.
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={depthProfileTempData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          domain={["dataMin - 1", "dataMax + 1"]}
                          label={{ value: "Temp (deg C)", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <YAxis
                          dataKey="depth"
                          type="number"
                          reversed
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          label={{ value: "Depth (m)", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <Tooltip content={<DepthProfileTooltip />} />
                        <Bar dataKey="temperature" name="Temp (deg C)" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Depth Measurement Data</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {depthProfileData.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No stratification profile data for the selected date.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/70">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Depth (m)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">DO (mg/L)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Temp (deg C)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">pH</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">DO Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {depthProfileData.map((row, index) => {
                        const doValue = row.dissolvedOxygen
                        const status =
                          doValue == null ? "N/A" : doValue < 3 ? "CRITICAL" : doValue < 5 ? "WARNING" : "NORMAL"
                        const statusClass =
                          doValue == null
                            ? "border-border text-muted-foreground"
                            : doValue < 3
                              ? "bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/30"
                              : doValue < 5
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"

                        return (
                          <tr key={`${row.depth}-${index}`} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                            <td className="px-4 py-2.5 text-sm text-foreground">{row.depth.toFixed(1)}</td>
                            <td
                              className="px-4 py-2.5 text-right text-sm font-mono font-semibold"
                              style={{ color: doValue != null ? getDoColor(doValue) : undefined }}
                            >
                              {doValue != null ? doValue.toFixed(2) : "--"}
                            </td>
                            <td className="px-4 py-2.5 text-right text-sm font-mono text-foreground">
                              {row.temperature != null ? row.temperature.toFixed(1) : "--"}
                            </td>
                            <td className="px-4 py-2.5 text-right text-sm font-mono text-foreground">
                              {row.pH != null ? row.pH.toFixed(2) : "--"}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <Badge variant="outline" className={`text-[10px] px-2 py-0 ${statusClass}`}>
                                {status}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
