"use client"

import { AlertTriangle, Bell, Gauge, Radio, Thermometer, XCircle } from "lucide-react"
import { Badge } from "@/components/app-ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import type { AlertItem, SystemRiskRow } from "../_lib/water-quality-selectors"
import { parameterLabels, formatTimestamp, type WqParameter } from "../_lib/water-quality-utils"
import { actionBadgeClass, ratingBadgeClass } from "../_lib/water-quality-badges"

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
    <div className="space-y-5">
      <div className="kpi-grid sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className="kpi-card cursor-pointer transition-all hover:border-primary/40"
          onClick={() => onChangeTab("environment")}
        >
          <CardContent className="kpi-card-content pt-4">
            <div className="flex items-center justify-between mb-2">
              <Gauge className="h-5 w-5 text-primary" />
              <span className="kpi-card-title">Avg WQI</span>
            </div>
            <p className="kpi-card-value" style={{ color: averageWqiLabel.color }}>
              {averageWqi != null ? Math.round(averageWqi) : "--"}
            </p>
            <p className="kpi-card-meta" style={{ color: averageWqiLabel.color }}>
              {averageWqiLabel.label}
            </p>
          </CardContent>
        </Card>
        <Card
          className="kpi-card cursor-pointer transition-all hover:border-destructive/40"
          onClick={() => onChangeTab("alerts")}
        >
          <CardContent className="kpi-card-content pt-4">
            <div className="flex items-center justify-between mb-2">
              <Bell className="h-5 w-5 text-destructive" />
              <span className="kpi-card-title">Active Alerts</span>
            </div>
            <p className="kpi-card-value">{alertItems.length}</p>
            <p className="kpi-card-meta text-destructive">{highAlertCount} high priority</p>
          </CardContent>
        </Card>
        <Card
          className="kpi-card cursor-pointer transition-all hover:border-success/40"
          onClick={() => onChangeTab("sensors")}
        >
          <CardContent className="kpi-card-content pt-4">
            <div className="flex items-center justify-between mb-2">
              <Radio className="h-5 w-5 text-success" />
              <span className="kpi-card-title">Active Systems</span>
            </div>
            <p className="kpi-card-value text-success">{sensorOnlineCount}</p>
            <p className="kpi-card-meta">of {systemCount} with recent readings</p>
          </CardContent>
        </Card>
        <Card
          className="kpi-card cursor-pointer transition-all hover:border-warning/40"
          onClick={() => onChangeTab("parameter")}
        >
          <CardContent className="kpi-card-content pt-4">
            <div className="flex items-center justify-between mb-2">
              <Thermometer className="h-5 w-5 text-warning" />
              <span className="kpi-card-title">Parameters</span>
            </div>
            <p className="kpi-card-value">{Object.keys(parameterLabels).length}</p>
            <p className="kpi-card-meta">monitored</p>
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
              className="cursor-pointer border border-border bg-card transition-all hover:border-primary/25"
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
          <button onClick={() => onChangeTab("alerts")} className="text-xs text-primary hover:text-primary/80">
            View all
          </button>
        </div>
        <div className="space-y-2">
          {alertItems.length ? (
            alertItems.slice(0, 5).map((alert) => (
              <Card
                key={alert.id}
                className={`border ${
                  alert.priority === "high" ? "border-destructive/20 bg-destructive/5" : "border-warning/20 bg-warning/5"
                } ${alert.systemId != null ? "cursor-pointer hover:opacity-90" : ""}`}
                onClick={() => {
                  if (alert.systemId != null) onOpenSystemHistory?.(alert.systemId)
                }}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  {alert.priority === "high" ? (
                    <XCircle className="h-4 w-4 flex-shrink-0 text-destructive" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 text-warning" />
                  )}
                  <p className="text-xs text-foreground flex-1">{alert.message}</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0 flex-shrink-0 ${
                      alert.priority === "high"
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : "border-warning/30 bg-warning/10 text-warning"
                    }`}
                  >
                    {alert.priority.toUpperCase()}
                  </Badge>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-muted/30 shadow-none">
              <CardContent className="p-3 text-sm text-muted-foreground">No alerts for the selected scope.</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}


