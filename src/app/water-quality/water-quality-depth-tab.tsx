"use client"

import { AlertTriangle, CheckCircle, Layers } from "lucide-react"
import { CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatTimestamp } from "./_lib/water-quality-utils"
import type { DepthProfileRow } from "./_lib/water-quality-selectors"

const DepthProfileTooltip = ({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: { depth: number; value: number; series: string } }>
}) => {
  if (!active || !payload?.length || !payload[0]?.payload) return null
  const point = payload[0].payload
  return (
    <div className="rounded-md border border-border bg-card p-3 shadow-md">
      <p className="text-xs text-muted-foreground">Depth: {point.depth.toFixed(1)} m</p>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {point.series}: {point.value.toFixed(2)}
      </p>
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
  surfaceDo: number | null
  bottomDo: number | null
  doGradient: number | null
  tempGradient: number | null
}) {
  const doScatterData = depthProfileDoData.map((row) => ({ depth: row.depth, value: row.dissolvedOxygen, series: "DO (mg/L)" }))
  const tempScatterData = depthProfileTempData.map((row) => ({ depth: row.depth, value: row.temperature, series: "Temperature (deg C)" }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/15">
            <Layers className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Stratification Analysis</h2>
            <p className="text-sm text-muted-foreground">Depth profile scatter of dissolved oxygen and temperature by depth.</p>
          </div>
        </div>
        <Select value={selectedDepthProfileDate ?? ""} onValueChange={onSelectDepthProfileDate}>
          <SelectTrigger className="w-full sm:w-[220px]">
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

      {isAllSystemsSelected ? (
        <Card className="border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground">Select a system to view stratification analysis.</CardContent>
        </Card>
      ) : depthProfileData.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground">No stratification profile measurements found for the selected system and date.</CardContent>
        </Card>
      ) : (
        <>
          <Card className={isStratified ? "border-red-500/30 bg-red-500/10" : "border-emerald-500/30 bg-emerald-500/10"}>
            <CardContent className="flex items-start gap-3 p-4">
              {isStratified ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-300" />
              ) : (
                <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              )}
              <div>
                <p className={`text-sm font-semibold ${isStratified ? "text-red-600 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                  {isStratified ? "Stratified" : "Not stratified"}
                </p>
                <p className={`mt-1 text-xs ${isStratified ? "text-red-600/80 dark:text-red-300/80" : "text-emerald-700/80 dark:text-emerald-300/80"}`}>
                  Stratified when bottom DO is below 4.0 mg/L and surface DO is above 6.0 mg/L. Consider adding a 5 m measurement where cage depth allows.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Surface DO</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{surfaceDo != null ? surfaceDo.toFixed(2) : "--"}</div><p className="text-xs text-muted-foreground mt-1">mg/L</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Bottom DO</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{bottomDo != null ? bottomDo.toFixed(2) : "--"}</div><p className="text-xs text-muted-foreground mt-1">mg/L</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">DO Gradient</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{doGradient != null ? doGradient.toFixed(2) : "--"}</div><p className="text-xs text-muted-foreground mt-1">Surface - bottom</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Temp Gradient</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{tempGradient != null ? tempGradient.toFixed(2) : "--"}</div><p className="text-xs text-muted-foreground mt-1">deg C, surface - bottom</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Flag</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{isStratified ? "YES" : "NO"}</div><p className="text-xs text-muted-foreground mt-1">Rule-based status</p></CardContent></Card>
          </div>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm font-medium">
                Depth Profile Scatter
                <Badge variant="outline" className={isStratified ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}>
                  {isStratified ? "STRATIFIED" : "NOT STRATIFIED"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[360px] rounded-md border border-border/80 bg-muted/20 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 12, right: 24, left: 12, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="value"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      label={{ value: "Parameter value", position: "insideBottom", offset: -2, fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="depth"
                      reversed
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      label={{ value: "Depth (m)", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <Tooltip content={<DepthProfileTooltip />} />
                    <Legend />
                    <Scatter name="DO (mg/L)" data={doScatterData} fill="#3B82F6" />
                    <Scatter name="Temperature (deg C)" data={tempScatterData} fill="#F59E0B" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Depth Measurement Data</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/70">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Depth (m)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">DO (mg/L)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Temp (deg C)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">pH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depthProfileData.map((row, index) => (
                      <tr key={`${row.depth}-${index}`} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <td className="px-4 py-2.5 text-sm text-foreground">{row.depth.toFixed(1)}</td>
                        <td className="px-4 py-2.5 text-right text-sm font-mono text-foreground">{row.dissolvedOxygen != null ? row.dissolvedOxygen.toFixed(2) : "--"}</td>
                        <td className="px-4 py-2.5 text-right text-sm font-mono text-foreground">{row.temperature != null ? row.temperature.toFixed(2) : "--"}</td>
                        <td className="px-4 py-2.5 text-right text-sm font-mono text-foreground">{row.pH != null ? row.pH.toFixed(2) : "--"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
