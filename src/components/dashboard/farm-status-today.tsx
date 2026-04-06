"use client"

import { Activity, AlertTriangle, Droplets, Fish, Package, Scale } from "lucide-react"
import { useFarmKpisToday } from "@/lib/hooks/use-dashboard"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import type { DashboardPageInitialData } from "@/features/dashboard/types"
import { formatNumberValue } from "@/lib/analytics-format"
import Link from "next/link"

function StatusPill({ children, tone }: { children: React.ReactNode; tone: "ok" | "warn" | "critical" | "neutral" }) {
  const toneClass =
    tone === "ok"
      ? "bg-chart-2/15 text-chart-2"
      : tone === "warn"
        ? "bg-chart-4/15 text-chart-4"
        : tone === "critical"
          ? "bg-destructive/15 text-destructive"
          : "bg-muted text-muted-foreground"
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClass}`}>
      {children}
    </span>
  )
}

type StatCardProps = {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  tone?: "ok" | "warn" | "critical" | "neutral"
  href?: string
}

function StatCard({ icon: Icon, label, value, sub, tone = "neutral", href }: StatCardProps) {
  const iconColor =
    tone === "ok"
      ? "text-chart-2"
      : tone === "warn"
        ? "text-chart-4"
        : tone === "critical"
          ? "text-destructive"
          : "text-muted-foreground"

  const inner = (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 ${iconColor}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold leading-tight text-foreground">{value}</p>
        {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )

  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

export default function FarmStatusToday({
  farmId: initialFarmId,
  initialData,
}: {
  farmId?: string | null
  initialData?: DashboardPageInitialData["farmKpisToday"]
}) {
  const { farmId: activeFarmId } = useActiveFarm()
  const farmId = activeFarmId ?? initialFarmId

  const query = useFarmKpisToday({ farmId, initialData })
  const row = query.data?.status === "success" ? query.data.data[0] : null

  if (!row && !query.isLoading) return null

  const formatKg = (v: number | null | undefined) =>
    v == null ? "--" : `${formatNumberValue(v, { decimals: 1 })} kg`

  const feedTone: "ok" | "warn" | "critical" =
    (row?.systems_missing_feed ?? 0) === 0 ? "ok" : (row?.systems_missing_feed ?? 0) <= 1 ? "warn" : "critical"

  const doTone: "ok" | "warn" | "critical" =
    (row?.do_compliance_pct ?? 100) >= 90 ? "ok" : (row?.do_compliance_pct ?? 100) >= 70 ? "warn" : "critical"

  const stockTone: "ok" | "warn" | "critical" =
    (row?.min_stock_days ?? 999) >= 14 ? "ok" : (row?.min_stock_days ?? 999) >= 7 ? "warn" : "critical"

  const alertTone: "ok" | "warn" | "critical" =
    (row?.unacked_critical ?? 0) === 0 ? "ok" : "critical"

  const mortalityTone: "neutral" | "warn" | "critical" =
    (row?.mortality_today ?? 0) === 0 ? "neutral" : (row?.mortality_today ?? 0) <= 5 ? "warn" : "critical"

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Today &mdash; {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
        </p>
        {(row?.unacked_critical ?? 0) > 0 && (
          <StatusPill tone="critical">
            {row!.unacked_critical} unacknowledged alert{row!.unacked_critical !== 1 ? "s" : ""}
          </StatusPill>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={Scale}
          label="Farm Biomass"
          value={formatKg(row?.farm_biomass_kg)}
          tone="neutral"
          href="/production"
        />
        <StatCard
          icon={Fish}
          label="Feed Today"
          value={formatKg(row?.feed_today_kg)}
          sub={
            row
              ? `${row.systems_fed ?? 0} fed · ${row.systems_missing_feed ?? 0} missing`
              : undefined
          }
          tone={feedTone}
          href="/feed"
        />
        <StatCard
          icon={Activity}
          label="Mortality Today"
          value={row?.mortality_today == null ? "--" : String(row.mortality_today)}
          sub="fish"
          tone={mortalityTone}
          href="/mortality"
        />
        <StatCard
          icon={Droplets}
          label="DO Compliance"
          value={
            row?.do_compliance_pct == null
              ? "--"
              : `${formatNumberValue(row.do_compliance_pct, { decimals: 0 })}%`
          }
          sub="systems above threshold"
          tone={doTone}
          href="/water-quality"
        />
        <StatCard
          icon={Package}
          label="Feed Stock"
          value={row?.min_stock_days == null ? "--" : `${row.min_stock_days}d`}
          sub="minimum coverage"
          tone={stockTone}
          href="/feed"
        />
        <StatCard
          icon={AlertTriangle}
          label="Active Alerts"
          value={row?.unacked_critical == null ? "--" : String(row.unacked_critical)}
          sub="unacknowledged critical"
          tone={alertTone}
        />
      </div>
    </div>
  )
}
