"use client"

import Link from "next/link"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

interface KPICardProps {
  title: string
  average: number | null | undefined
  trend?: number | null
  data?: Array<{ id: number; data: number }>
  decimals?: number
  formatUnit?: string
  invertTrend?: boolean
  neutral?: boolean
  href?: string
  onClick?: () => void
}

const trendPaths = {
  up: "M1 22 L8 16 L14 18 L20 12 L26 14 L32 8 L38 10 L44 5",
  down: "M1 6 L8 12 L14 10 L20 16 L26 14 L32 21 L38 18 L44 22",
  flat: "M1 16 L8 16 L14 15 L20 16 L26 15 L32 16 L38 16 L44 16",
}

function Sparkline({
  data,
  trend,
  invertTrend,
  neutral,
}: {
  data?: Array<{ id: number; data: number }>
  trend?: number | null
  invertTrend?: boolean
  neutral?: boolean
}) {
  // Determine trend from data or explicit trend value
  let trendDirection: "up" | "down" | "flat" = "flat"
  let status: "positive" | "negative" | "neutral" = "neutral"

  if (trend !== undefined && trend !== null) {
    trendDirection = trend > 0 ? "up" : trend < 0 ? "down" : "flat"

    if (neutral) {
      status = "neutral"
    } else if (invertTrend) {
      status = trend > 0 ? "negative" : trend < 0 ? "positive" : "neutral"
    } else {
      status = trend > 0 ? "positive" : trend < 0 ? "negative" : "neutral"
    }
  }

  const stroke =
    status === "negative" ? "stroke-destructive" : status === "positive" ? "stroke-chart-2" : "stroke-border"
  const fill =
    status === "negative" ? "fill-destructive/15" : status === "positive" ? "fill-chart-2/15" : "fill-muted/50"
  const path = trendPaths[trendDirection]

  return (
    <svg width="78" height="36" viewBox="0 0 46 28" className="shrink-0">
      <path d={`${path} L44 27 L1 27 Z`} className={fill} />
      <path d={path} className={`${stroke} fill-none`} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function KPICardContent({
  title,
  average,
  trend,
  data,
  decimals = 1,
  formatUnit,
  invertTrend,
  neutral,
}: KPICardProps) {
  const formattedValue =
    average === null || average === undefined ? "--" : `${average.toFixed(decimals)}${formatUnit ? formatUnit : ""}`

  const trendText =
    trend !== undefined && trend !== null
      ? `${trend > 0 ? "+" : ""}${trend.toFixed(1)}%`
      : null

  let trendDirection: "up" | "down" | "flat" = "flat"
  let status: "positive" | "negative" | "neutral" = "neutral"

  if (trend !== undefined && trend !== null) {
    trendDirection = trend > 0 ? "up" : trend < 0 ? "down" : "flat"

    if (neutral) {
      status = "neutral"
    } else if (invertTrend) {
      status = trend > 0 ? "negative" : trend < 0 ? "positive" : "neutral"
    } else {
      status = trend > 0 ? "positive" : trend < 0 ? "negative" : "neutral"
    }
  }

  const toneStyles = {
    positive: "text-chart-2",
    negative: "text-destructive",
    neutral: "text-muted-foreground",
  }

  const TrendIcon =
    trendDirection === "down" ? ArrowDownRight : trendDirection === "up" ? ArrowUpRight : Minus

  return (
    <div className="w-full cursor-pointer rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-[20px] font-semibold text-foreground mt-2 leading-tight">{formattedValue}</p>
          {trendText && (
            <p className={`text-[11px] mt-2 inline-flex items-center gap-1 ${toneStyles[status]}`}>
              <TrendIcon className="h-3 w-3" />
              <span>{trendText} from previous period</span>
            </p>
          )}
        </div>
        <div className="rounded-md bg-muted/40 p-1.5">
          <Sparkline data={data} trend={trend} invertTrend={invertTrend} neutral={neutral} />
        </div>
      </div>
    </div>
  )
}

export default function KPICard({
  title,
  average,
  trend,
  data,
  decimals,
  formatUnit,
  invertTrend,
  neutral,
  href,
  onClick,
}: KPICardProps) {
  const cardContent = (
    <KPICardContent
      title={title}
      average={average}
      trend={trend}
      data={data}
      decimals={decimals}
      formatUnit={formatUnit}
      invertTrend={invertTrend}
      neutral={neutral}
    />
  )

  if (href) {
    return (
      <Link href={href} className="block w-full">
        {cardContent}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className="w-full text-left">
      {cardContent}
    </button>
  )
}
