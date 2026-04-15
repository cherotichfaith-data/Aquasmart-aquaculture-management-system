"use client"

import { AlertTriangle, Clock, Radio, Wifi, WifiOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatSensorLag, type SensorStatus, type WaterQualitySystemListItem } from "./_lib/water-quality-selectors"
import { getSemanticBadgeClass, getSemanticColor } from "@/lib/theme/semantic-colors"

export function WaterQualitySensorsTab({
  sensorCounts,
  systemOptions,
  sensorStatusBySystem,
  onOpenSystemHistory,
}: {
  sensorCounts: { online: number; warning: number; offline: number }
  systemOptions: WaterQualitySystemListItem[]
  sensorStatusBySystem: Map<number, SensorStatus>
  onOpenSystemHistory?: (systemId: number) => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 shadow-[0_14px_32px_-26px_rgba(99,102,241,0.45)]">
          <Radio className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Sensor Activity</h2>
          <p className="text-sm text-muted-foreground">System connectivity and data freshness tracking.</p>
        </div>
      </div>

      <div className="kpi-grid sm:grid-cols-3">
        <Card className="kpi-card border-success/20 bg-success/10">
          <CardContent className="kpi-card-content flex-row items-center gap-3 pt-4">
            <Wifi className="h-6 w-6 text-success" />
            <div>
              <p className="kpi-card-value text-success">{sensorCounts.online}</p>
              <p className="kpi-card-meta text-success-foreground/80">Online</p>
            </div>
          </CardContent>
        </Card>
        <Card className="kpi-card border-warning/20 bg-warning/10">
          <CardContent className="kpi-card-content flex-row items-center gap-3 pt-4">
            <AlertTriangle className="h-6 w-6 text-warning" />
            <div>
              <p className="kpi-card-value text-warning">{sensorCounts.warning}</p>
              <p className="kpi-card-meta text-warning-foreground/80">Delayed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="kpi-card border-destructive/20 bg-destructive/10">
          <CardContent className="kpi-card-content flex-row items-center gap-3 pt-4">
            <WifiOff className="h-6 w-6 text-destructive" />
            <div>
              <p className="kpi-card-value text-destructive">{sensorCounts.offline}</p>
              <p className="kpi-card-meta text-destructive/80">Offline</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {systemOptions.map((system) => {
          const status = sensorStatusBySystem.get(system.id)
          const isOffline = status?.status === "offline"
          const isWarning = status?.status === "warning"
          return (
            <Card
              key={system.id}
              className={`border transition-all ${
                isOffline
                  ? "bg-destructive/5 border-destructive/20"
                  : isWarning
                    ? "bg-warning/5 border-warning/20"
                    : "bg-card border-border"
              } cursor-pointer hover:opacity-90`}
              onClick={() => onOpenSystemHistory?.(system.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${isOffline || isWarning ? "animate-pulse" : ""}`}
                      style={{
                        backgroundColor: isOffline
                          ? getSemanticColor("bad")
                          : isWarning
                            ? getSemanticColor("warn")
                            : getSemanticColor("good"),
                      }}
                    />
                    <span className="text-sm font-semibold text-foreground">{system.label}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0 ${getSemanticBadgeClass(isOffline ? "bad" : isWarning ? "warn" : "good")}`}
                  >
                    {(status?.status ?? "offline").toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">System ID</span>
                    <span className="text-foreground font-mono">{system.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Last Reading</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span
                        className={isOffline ? "text-destructive" : isWarning ? "text-warning" : "text-foreground"}
                      >
                        {formatSensorLag(status?.lastSeen ?? null)}
                      </span>
                    </div>
                  </div>
                </div>
                {isOffline ? (
                  <div className="mt-3 rounded bg-destructive/10 p-2 shadow-[0_14px_30px_-24px_color-mix(in_srgb,var(--destructive)_30%,transparent)]">
                    <p className="text-[10px] text-destructive">No data received for more than 24 hours.</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
