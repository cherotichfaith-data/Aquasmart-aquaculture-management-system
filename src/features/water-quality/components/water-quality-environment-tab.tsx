"use client"

import { Gauge } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { WaterQualityCircularGauge } from "./water-quality-circular-gauge"
import type { WaterQualityStatusLabel } from "../lib/water-quality-selectors"

export function WaterQualityEnvironmentTab({
  wqiValue,
  wqiLabel,
}: {
  wqiValue: number | null
  wqiLabel: WaterQualityStatusLabel
}) {
  return (
    <Card className="border border-border bg-card">
      <CardHeader className="border-b border-border/70 pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Gauge className="h-4 w-4 text-primary" />
          WQI Gauge
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center py-6">
        {wqiValue == null ? (
          <div className="flex h-[180px] w-[180px] items-center justify-center rounded-full bg-muted/24 text-center text-sm text-muted-foreground">
            No WQI data
          </div>
        ) : (
          <WaterQualityCircularGauge value={wqiValue} max={100} color={wqiLabel.color} label="WQI" />
        )}
        <div className="mt-4 text-center">
          <p className="text-lg font-bold" style={{ color: wqiLabel.color }}>
            {wqiLabel.label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {wqiValue == null ? "No DB-owned WQI score in the selected scope." : `${Math.round(wqiValue)} / 100`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
