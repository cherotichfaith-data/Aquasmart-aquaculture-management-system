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
    status === "negative" ? "stroke-rose-400" : status === "positive" ? "stroke-sky-500" : "stroke-slate-300"
  const fill = status === "negative" ? "fill-rose-100/80" : status === "positive" ? "fill-sky-100/80" : "fill-slate-100"
  const path = trendPaths[trendDirection]

  return (
    <svg width="60" height="36" viewBox="0 0 46 28" className="shrink-0">
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
  const formattedValue = average === null || average === undefined ? "--" : `${average.toFixed(decimals)}${formatUnit ? formatUnit : ""}`

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
    positive: "text-emerald-600",
    negative: "text-rose-600",
    neutral: "text-muted-foreground",
  }

  const TrendIcon =
    trendDirection === "down" ? ArrowDownRight : trendDirection === "up" ? ArrowUpRight : Minus

  return (
    <div className="cursor-pointer bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left w-full">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground mt-2">{formattedValue}</p>
          {trendText && (
            <p className={`text-xs mt-2 inline-flex items-center gap-1 ${toneStyles[status]}`}>
              <TrendIcon className="h-3 w-3" />
              <span>{trendText}</span>
            </p>
          )}
        </div>
        <Sparkline data={data} trend={trend} invertTrend={invertTrend} neutral={neutral} />
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
    return <Link href={href}>{cardContent}</Link>
  }

  return (
    <button onClick={onClick} className="w-full">
      {cardContent}
    </button>
  )
}
