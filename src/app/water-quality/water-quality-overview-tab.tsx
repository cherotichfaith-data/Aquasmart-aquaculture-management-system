"use client"

import { AlertTriangle, Bell, Droplets, Gauge, Radio, Thermometer, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AlertItem, SystemRiskRow } from "./_lib/water-quality-selectors"
import { parameterLabels, formatTimestamp, type WqParameter } from "./_lib/water-quality-utils"
import { actionBadgeClass, ratingBadgeClass } from "./_lib/water-quality-badges"

export function WaterQualityOverviewTab({
  averageWqi,
  averageWqiLabel,
  alertItems,
  highAlertCount,
  sensorOnlineCount,
  systemCount,
  systemRiskRows,
  onChangeTab,
  onSelectSystem,
  onOpenSystemHistory,
}: {
  averageWqi: number | null
  averageWqiLabel: { label: string; color: string }
  alertItems: AlertItem[]
  highAlertCount: number
  sensorOnlineCount: number
  systemCount: number
  systemRiskRows: SystemRiskRow[]
  onChangeTab: (value: string) => void
  onSelectSystem: (value: string) => void
  onOpenSystemHistory?: (systemId: number) => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/20">
            <Droplets className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Water Quality Overview</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="bg-card border border-border cursor-pointer hover:border-cyan-500/40 transition-all"
          onClick={() => onChangeTab("environment")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Gauge className="h-5 w-5 text-cyan-400" />
              <span className="text-xs text-muted-foreground">Avg WQI</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: averageWqiLabel.color }}>
              {averageWqi != null ? Math.round(averageWqi) : "--"}
            </p>
            <p className="text-xs mt-1" style={{ color: averageWqiLabel.color }}>
              {averageWqiLabel.label}
            </p>
          </CardContent>
        </Card>
        <Card
          className="bg-card border border-border cursor-pointer hover:border-red-500/40 transition-all"
          onClick={() => onChangeTab("alerts")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Bell className="h-5 w-5 text-red-400" />
              <span className="text-xs text-muted-foreground">Active Alerts</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{alertItems.length}</p>
            <p className="text-xs text-red-400 mt-1">{highAlertCount} high priority</p>
          </CardContent>
        </Card>
        <Card
          className="bg-card border border-border cursor-pointer hover:border-emerald-500/40 transition-all"
          onClick={() => onChangeTab("sensors")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Radio className="h-5 w-5 text-emerald-400" />
              <span className="text-xs text-muted-foreground">Sensors</span>
            </div>
            <p className="text-3xl font-bold text-emerald-400">{sensorOnlineCount}</p>
            <p className="text-xs text-muted-foreground mt-1">of {systemCount} online</p>
          </CardContent>
        </Card>
        <Card
          className="bg-card border border-border cursor-pointer hover:border-slate-500/40 transition-all"
          onClick={() => onChangeTab("parameter")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Thermometer className="h-5 w-5 text-amber-400" />
              <span className="text-xs text-muted-foreground">Parameters</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{Object.keys(parameterLabels).length}</p>
            <p className="text-xs text-muted-foreground mt-1">monitored</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">System Status Overview</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemRiskRows.map((row) => (
            <Card
              key={row.systemId}
              className="bg-card border border-border hover:border-slate-500/40 transition-all cursor-pointer"
              onClick={() => {
                onSelectSystem(String(row.systemId))
                onOpenSystemHistory?.(row.systemId)
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{row.systemName}</CardTitle>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ratingBadgeClass(row.rating)}`}>
                    {row.rating ?? "Unknown"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last rating {row.ratingDate ? formatTimestamp(`${row.ratingDate}T00:00:00`) : "--"}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Worst parameter</span>
                  <span className="font-medium text-foreground">
                    {row.worstParameter ? parameterLabels[row.worstParameter as WqParameter] ?? row.worstParameter : "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Latest measurement</span>
                  <span className="text-foreground">
                    {row.latestMeasurement ? formatTimestamp(row.latestMeasurement) : "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Action</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${actionBadgeClass(row.action)}`}>
                    {row.action}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Recent Alerts</h3>
          <button onClick={() => onChangeTab("alerts")} className="text-xs text-cyan-500 hover:text-cyan-400">
            View all
          </button>
        </div>
        <div className="space-y-2">
          {alertItems.length ? (
            alertItems.slice(0, 5).map((alert) => (
              <Card
                key={alert.id}
                className={`border ${
                  alert.priority === "high" ? "bg-red-500/5 border-red-500/20" : "bg-amber-500/5 border-amber-500/20"
                } ${alert.systemId != null ? "cursor-pointer hover:opacity-90" : ""}`}
                onClick={() => {
                  if (alert.systemId != null) onOpenSystemHistory?.(alert.systemId)
                }}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  {alert.priority === "high" ? (
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  )}
                  <p className="text-xs text-foreground flex-1">{alert.message}</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0 flex-shrink-0 ${
                      alert.priority === "high"
                        ? "bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/30"
                        : "bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {alert.priority.toUpperCase()}
                  </Badge>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border border-border bg-muted/30">
              <CardContent className="p-3 text-sm text-muted-foreground">No alerts for the selected scope.</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
