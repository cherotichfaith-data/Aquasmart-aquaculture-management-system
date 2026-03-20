"use client"

import type { MortalityCause } from "@/lib/types/mortality"
import type { InvestigationStatus, MortalityRiskRow } from "../mortality-selectors"

export const CAUSE_LABELS: Record<MortalityCause, string> = {
  unknown: "Unknown",
  hypoxia: "Low DO / Hypoxia",
  disease: "Disease",
  injury: "Injury",
  handling: "Handling stress",
  predator: "Predator",
  starvation: "Starvation",
  temperature: "Temperature",
  other: "Other",
}

export const INVESTIGATION_OPTIONS: Array<{ value: InvestigationStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "monitoring", label: "Monitoring" },
  { value: "resolved", label: "Resolved" },
  { value: "escalated", label: "Escalated" },
]

export function formatDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed)
}

export function formatDateTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed)
}

export function formatNumber(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "N/A"
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

export function severityVariant(severity: string) {
  if (severity === "critical") return "destructive" as const
  if (severity === "warning") return "secondary" as const
  return "outline" as const
}

export function riskBadgeClass(row: MortalityRiskRow) {
  if (row.atRiskScore >= 8) return "bg-destructive/10 text-destructive border-destructive/30"
  if (row.atRiskScore >= 4) return "bg-amber-500/10 text-amber-700 border-amber-500/30"
  return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
}

export function investigationBadgeClass(status: InvestigationStatus) {
  if (status === "escalated") return "bg-destructive/10 text-destructive border-destructive/30"
  if (status === "monitoring") return "bg-amber-500/10 text-amber-700 border-amber-500/30"
  if (status === "resolved") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
  return "bg-muted text-muted-foreground border-border"
}

export function trendLabel(row: MortalityRiskRow) {
  if (row.trendDirection === "worsening") return "Worsening"
  if (row.trendDirection === "improving") return "Improving"
  if (row.trendDirection === "stable") return "Stable"
  return "No data"
}
