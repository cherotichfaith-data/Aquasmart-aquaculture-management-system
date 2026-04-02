"use client"

import { FlaskConical, Gauge, Leaf } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WaterQualityCircularGauge } from "./water-quality-circular-gauge"
import type {
  AlgalActivity,
  NutrientLoad,
  SystemWqiRow,
  WaterQualityStatusLabel,
} from "./_lib/water-quality-selectors"
import { WQI_GOOD_MIN, WQI_MODERATE_MIN } from "@/lib/water-quality-index"

export function WaterQualityEnvironmentTab({
  wqiValue,
  wqiLabel,
  isAllSystemsSelected,
  nutrientLoad,
  algalActivity,
  allSystemsWqi,
  selectedSystemValue,
  onSelectSystem,
  onOpenSystemHistory,
}: {
  wqiValue: number | null
  wqiLabel: WaterQualityStatusLabel
  isAllSystemsSelected: boolean
  nutrientLoad: NutrientLoad
  algalActivity: AlgalActivity
  allSystemsWqi: SystemWqiRow[]
  selectedSystemValue: string
  onSelectSystem: (value: string) => void
  onOpenSystemHistory?: (systemId: number) => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 shadow-[0_14px_32px_-26px_rgba(16,185,129,0.45)]">
            <Gauge className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Environmental Indicators</h2>
            <p className="text-sm text-muted-foreground">Composite water quality scores and environmental indices.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Gauge className="h-4 w-4 text-cyan-400" />
              Water Quality Index
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-4">
            <div className="relative">
              {wqiValue == null ? (
                <div className="flex h-[160px] w-[160px] items-center justify-center rounded-full bg-muted/24 text-center text-sm text-muted-foreground">
                  No WQI data
                </div>
              ) : (
                <WaterQualityCircularGauge value={wqiValue} max={100} color={wqiLabel.color} label="WQI" />
              )}
            </div>
            <div className="mt-4 text-center">
              <span className="text-lg font-bold" style={{ color: wqiLabel.color }}>
                {wqiLabel.label}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {wqiValue == null
                  ? "Insufficient data for WQI scoring."
                  : isAllSystemsSelected
                    ? "Average of per-system WQI scores using each system's latest DO and temperature readings."
                    : wqiValue >= WQI_GOOD_MIN
                      ? "Optimal conditions for aquaculture."
                      : wqiValue >= WQI_MODERATE_MIN
                        ? "Some parameters need attention."
                        : "Immediate intervention recommended."}
              </p>
            </div>
            <div className="w-full mt-4 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{`Poor (<${WQI_MODERATE_MIN})`}</span>
                <span>{`Moderate (${WQI_MODERATE_MIN}-${WQI_GOOD_MIN - 1})`}</span>
                <span>{`Good (${WQI_GOOD_MIN}+)`}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <div className="h-full bg-red-500" style={{ width: "50%" }} />
                <div className="h-full bg-amber-500" style={{ width: "20%" }} />
                <div className="h-full bg-emerald-500" style={{ width: "30%" }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-orange-400" />
              Nutrient Load Indicator
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-4">
            <div className="relative">
              <WaterQualityCircularGauge value={nutrientLoad.value} max={4} color={nutrientLoad.color} label="mg/L" />
            </div>
            <div className="mt-4 text-center">
              <span className="text-lg font-bold" style={{ color: nutrientLoad.color }}>
                {nutrientLoad.level}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Nitrate + Nitrite + Ammonia = {nutrientLoad.level === "No data" ? "--" : nutrientLoad.value.toFixed(2)} mg/L
              </p>
            </div>
            <div className="soft-panel-subtle mt-4 w-full p-3 text-xs text-muted-foreground">
              {nutrientLoad.level === "High"
                ? "High nutrient load. Consider reducing nutrient input."
                : nutrientLoad.level === "Moderate"
                  ? "Moderate nutrient levels. Monitor for rising trends."
                  : nutrientLoad.level === "Low"
                    ? "Nutrient levels within acceptable range."
                    : "No nutrient data available."}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Leaf className="h-4 w-4 text-green-400" />
              Algal Activity Indicator
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-4">
            <div className="relative">
              <WaterQualityCircularGauge value={algalActivity.value} max={50} color={algalActivity.color} label="index" />
            </div>
            <div className="mt-4 text-center">
              <span className="text-lg font-bold" style={{ color: algalActivity.color }}>
                {algalActivity.level}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Secchi depth: {algalActivity.source != null ? `${algalActivity.source.toFixed(1)} m` : "--"}
              </p>
            </div>
            <div className="w-full mt-4 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span>Low activity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span>Moderate activity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span>Bloom risk</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium">All Systems Water Quality Index</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {allSystemsWqi.map((system) => (
              <div
                key={system.id}
                className={`p-4 rounded-lg border text-center transition-all cursor-pointer hover:scale-[1.02] ${
                  String(system.id) === selectedSystemValue ? "border-cyan-500/50 bg-cyan-500/10" : "border-border bg-muted/30"
                }`}
                onClick={() => {
                  onSelectSystem(String(system.id))
                  onOpenSystemHistory?.(system.id)
                }}
              >
                <p className="text-xs text-muted-foreground mb-1">{system.label}</p>
                <p className="text-2xl font-bold" style={{ color: system.wqiLabel.color }}>
                  {system.wqi != null ? Math.round(system.wqi) : "--"}
                </p>
                <p className="text-xs mt-1" style={{ color: system.wqiLabel.color }}>
                  {system.wqiLabel.label}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${system.wqi != null ? Math.min(system.wqi, 100) : 0}%`,
                      backgroundColor: system.wqiLabel.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
