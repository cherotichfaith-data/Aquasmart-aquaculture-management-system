"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Droplets, HeartPulse } from "lucide-react"
import { fetchDashboardSnapshot, fetchWaterQualityRatings } from "@/lib/supabase-queries"
import type { Enums } from "@/lib/types/database"

type Tone = "good" | "warn" | "bad"

type HealthState = {
  title: string
  status: string
  tone: Tone
  progress: number
  detail?: string
}

const toneText = {
  good: "text-emerald-600",
  warn: "text-amber-600",
  bad: "text-rose-600",
}

const toneBar = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-rose-500",
}

function StatusCard({
  icon,
  title,
  status,
  tone,
  progress,
  detail,
}: {
  icon: React.ReactNode
  title: string
  status: string
  tone: Tone
  progress: number
  detail?: string
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className={`text-lg font-semibold mt-1 ${toneText[tone]}`}>{status}</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <div className="h-2 rounded-full bg-muted/70">
          <span className={`block h-2 rounded-full ${toneBar[tone]}`} style={{ width: `${progress * 100}%` }} />
        </div>
        {detail ? <p className="text-xs text-muted-foreground mt-2">{detail}</p> : null}
      </div>
    </div>
  )
}

export default function HealthSummary({
  system,
  timePeriod,
}: {
  system?: string
  timePeriod?: Enums<"time_period">
}) {
  const [waterQuality, setWaterQuality] = useState<HealthState | null>(null)
  const [fishHealth, setFishHealth] = useState<HealthState | null>(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      const systemId = system && system !== "all" ? Number(system) : undefined
      const [ratingResult, snapshot] = await Promise.all([
        fetchWaterQualityRatings({ system_id: Number.isFinite(systemId) ? systemId : undefined, limit: 1 }),
        fetchDashboardSnapshot({
          system_id: Number.isFinite(systemId) ? systemId : undefined,
          time_period: timePeriod,
        }),
      ])

      if (!isMounted) return

      const latestRating = ratingResult.status === "success" ? ratingResult.data[0] : null
      if (latestRating) {
        const rating = latestRating.rating
        const ratingMap: Record<string, { status: string; tone: Tone; progress: number }> = {
          optimal: { status: "Good", tone: "good", progress: 0.85 },
          moderate: { status: "Fair", tone: "warn", progress: 0.6 },
          critical: { status: "Poor", tone: "bad", progress: 0.35 },
          lethal: { status: "Critical", tone: "bad", progress: 0.2 },
        }
        const mapped = ratingMap[rating] || { status: "Good", tone: "good", progress: 0.85 }
        setWaterQuality({
          title: "Water quality",
          status: mapped.status,
          tone: mapped.tone,
          progress: mapped.progress,
          detail: latestRating.worst_parameter
            ? `Worst: ${latestRating.worst_parameter}`
            : "All parameters stable",
        })
      } else {
        setWaterQuality({
          title: "Water quality",
          status: "Good",
          tone: "good",
          progress: 0.8,
          detail: "All parameters stable",
        })
      }

      const survivalRate = snapshot && "farm_survival_rate" in snapshot ? snapshot.farm_survival_rate : null
      let fishState: HealthState = {
        title: "Fish health",
        status: "Good",
        tone: "good",
        progress: 0.8,
        detail: "Steady growth trend",
      }

      if (typeof survivalRate === "number") {
        if (survivalRate >= 95) {
          fishState = {
            title: "Fish health",
            status: "Good",
            tone: "good",
            progress: 0.88,
            detail: `Survival ${survivalRate.toFixed(1)}%`,
          }
        } else if (survivalRate >= 90) {
          fishState = {
            title: "Fish health",
            status: "Stable",
            tone: "warn",
            progress: 0.65,
            detail: `Survival ${survivalRate.toFixed(1)}%`,
          }
        } else {
          fishState = {
            title: "Fish health",
            status: "Attention",
            tone: "bad",
            progress: 0.4,
            detail: `Survival ${survivalRate.toFixed(1)}%`,
          }
        }
      }

      setFishHealth(fishState)
    }

    load()
    return () => {
      isMounted = false
    }
  }, [system, timePeriod])

  if (!waterQuality || !fishHealth) {
    return (
      <div className="grid gap-4">
        <div className="bg-muted/30 rounded-2xl h-32 animate-pulse" />
        <div className="bg-muted/30 rounded-2xl h-32 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <StatusCard
        icon={<Droplets size={18} />}
        title={waterQuality.title}
        status={waterQuality.status}
        tone={waterQuality.tone}
        progress={waterQuality.progress}
        detail={waterQuality.detail}
      />
      <StatusCard
        icon={<HeartPulse size={18} />}
        title={fishHealth.title}
        status={fishHealth.status}
        tone={fishHealth.tone}
        progress={fishHealth.progress}
        detail={fishHealth.detail}
      />
    </div>
  )
}
