"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Droplets, HeartPulse } from "lucide-react"
import type { Enums } from "@/lib/types/database"
import { createClient } from "@/utils/supabase/client"
import { useActiveFarm } from "@/hooks/use-active-farm"

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
  timePeriod: _timePeriod,
}: {
  system?: string
  timePeriod?: Enums<"time_period">
}) {
  const { farmId } = useActiveFarm()
  const [waterQuality, setWaterQuality] = useState<HealthState | null>(null)
  const [fishHealth, setFishHealth] = useState<HealthState | null>(null)

  useEffect(() => {
    let isMounted = true
    const supabase = createClient()

    const ratingToneMap: Record<string, { status: string; tone: Tone; progress: number }> = {
      optimal: { status: "Good", tone: "good", progress: 0.85 },
      acceptable: { status: "Fair", tone: "warn", progress: 0.6 },
      critical: { status: "Poor", tone: "bad", progress: 0.35 },
      lethal: { status: "Critical", tone: "bad", progress: 0.2 },
    }

    const load = async () => {
      const systemId = system && system !== "all" ? Number(system) : undefined
      const resolvedSystemId = Number.isFinite(systemId) ? systemId : undefined

      const waterQualityState: HealthState = {
        title: "Water quality",
        status: "Monitoring",
        tone: "good",
        progress: 0.8,
        detail: resolvedSystemId ? "Latest system rating" : "Latest farm rating",
      }

      const fishState: HealthState = {
        title: "Fish health",
        status: "Monitoring",
        tone: "warn",
        progress: 0.6,
        detail: "Latest snapshot from dashboard view",
      }

      if (resolvedSystemId) {
        const { data: snapshot } = await supabase
          .from("dashboard")
          .select("water_quality_rating_average,mortality_rate")
          .eq("system_id", resolvedSystemId)
          .order("input_end_date", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (snapshot?.water_quality_rating_average) {
          const mapped = ratingToneMap[snapshot.water_quality_rating_average] ?? ratingToneMap.optimal
          waterQualityState.tone = mapped.tone
          waterQualityState.status = mapped.status
          waterQualityState.progress = mapped.progress
          waterQualityState.detail = `Rating: ${snapshot.water_quality_rating_average}`
        }

        if (snapshot?.mortality_rate != null) {
          fishState.detail = `Mortality rate: ${snapshot.mortality_rate}`
        }
      } else {
        const { data: snapshot } = await supabase
          .from("dashboard_consolidated")
          .select("water_quality_rating_average,mortality_rate")
          .order("input_end_date", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (snapshot?.water_quality_rating_average) {
          const mapped = ratingToneMap[snapshot.water_quality_rating_average] ?? ratingToneMap.optimal
          waterQualityState.tone = mapped.tone
          waterQualityState.status = mapped.status
          waterQualityState.progress = mapped.progress
          waterQualityState.detail = `Rating: ${snapshot.water_quality_rating_average}`
        }

        if (snapshot?.mortality_rate != null) {
          fishState.detail = `Mortality rate: ${snapshot.mortality_rate}`
        }
      }

      if (!isMounted) return
      setWaterQuality(waterQualityState)
      setFishHealth(fishState)
    }

    load()
    return () => {
      isMounted = false
    }
  }, [farmId, system, _timePeriod])

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
