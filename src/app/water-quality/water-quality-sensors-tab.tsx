"use client"

import { AlertTriangle, Clock, Radio, Wifi, WifiOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatSensorLag, type SensorStatus, type WaterQualitySystemListItem } from "./_lib/water-quality-selectors"

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Wifi className="h-6 w-6 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold text-emerald-500">{sensorCounts.online}</p>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-300/80">Online</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <div>
              <p className="text-2xl font-bold text-amber-500">{sensorCounts.warning}</p>
              <p className="text-xs text-amber-600/80 dark:text-amber-300/80">Delayed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <WifiOff className="h-6 w-6 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-500">{sensorCounts.offline}</p>
              <p className="text-xs text-red-600/80 dark:text-red-300/80">Offline</p>
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
                  ? "bg-red-500/5 border-red-500/20"
                  : isWarning
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-card border-border"
              } cursor-pointer hover:opacity-90`}
              onClick={() => onOpenSystemHistory?.(system.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        isOffline ? "bg-red-500 animate-pulse" : isWarning ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                      }`}
                    />
                    <span className="text-sm font-semibold text-foreground">{system.label}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0 ${
                      isOffline
                        ? "bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/30"
                        : isWarning
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
                    }`}
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
                      <span className={isOffline ? "text-red-500" : isWarning ? "text-amber-500" : "text-foreground"}>
                        {formatSensorLag(status?.lastSeen ?? null)}
                      </span>
                    </div>
                  </div>
                </div>
                {isOffline ? (
                  <div className="mt-3 rounded bg-red-500/10 p-2 shadow-[0_14px_30px_-24px_rgba(239,68,68,0.3)]">
                    <p className="text-[10px] text-red-600 dark:text-red-300">No data received for more than 24 hours.</p>
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
