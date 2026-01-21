"use client"

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

interface KPICardProps {
  title: string
  value: string | number
  change?: string
  status?: "positive" | "negative" | "neutral"
  trend?: "up" | "down" | "flat"
  onClick?: () => void
}

const trendPaths = {
  up: "M1 22 L8 16 L14 18 L20 12 L26 14 L32 8 L38 10 L44 5",
  down: "M1 6 L8 12 L14 10 L20 16 L26 14 L32 21 L38 18 L44 22",
  flat: "M1 16 L8 16 L14 15 L20 16 L26 15 L32 16 L38 16 L44 16",
}

const toneStyles = {
  positive: "text-emerald-600",
  negative: "text-rose-600",
  neutral: "text-muted-foreground",
}

function Sparkline({ trend, status }: { trend: "up" | "down" | "flat"; status: "positive" | "negative" | "neutral" }) {
  const stroke =
    status === "negative" ? "stroke-rose-400" : status === "positive" ? "stroke-sky-500" : "stroke-slate-300"
  const fill = status === "negative" ? "fill-rose-100/80" : status === "positive" ? "fill-sky-100/80" : "fill-slate-100"
  const path = trendPaths[trend]

  return (
    <svg width="60" height="36" viewBox="0 0 46 28" className="shrink-0">
      <path d={`${path} L44 27 L1 27 Z`} className={fill} />
      <path d={path} className={`${stroke} fill-none`} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function KPICard({
  title,
  value,
  change,
  status = "neutral",
  trend = "flat",
  onClick,
}: KPICardProps) {
  const ChangeIcon = change ? (trend === "down" ? ArrowDownRight : trend === "up" ? ArrowUpRight : Minus) : null

  return (
    <button
      onClick={onClick}
      className="cursor-pointer bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left w-full"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground mt-2">{value}</p>
          <p className={`text-xs mt-2 inline-flex items-center gap-1 ${toneStyles[status]}`}>
            {ChangeIcon ? <ChangeIcon className="h-3 w-3" /> : null}
            {change || "No previous data"}
          </p>
        </div>
        <Sparkline trend={trend} status={status} />
      </div>
    </button>
  )
}
