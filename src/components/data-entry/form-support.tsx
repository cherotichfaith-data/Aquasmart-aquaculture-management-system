"use client"

import type { ReactNode } from "react"
import type { SystemOption } from "@/lib/system-options"
import { cn } from "@/lib/utils"

export function InfoPanel({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-lg border border-border/80 bg-muted/20 p-4", className)}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  )
}

export function InfoStat({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: ReactNode
  tone?: "default" | "warning" | "critical" | "success"
}) {
  const toneClass =
    tone === "critical"
      ? "border-red-500/30 bg-red-500/10"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/10"
        : tone === "success"
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-border/60 bg-background/70"

  return (
    <div className={cn("rounded-md border px-3 py-2", toneClass)}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  )
}

export function getSystemUnits(systems: SystemOption[]) {
  return Array.from(
    new Set(
      systems
        .map((system) => system.unit?.trim())
        .filter((unit): unit is string => Boolean(unit)),
    ),
  ).sort((a, b) => a.localeCompare(b))
}

export function getSystemsForUnit(systems: SystemOption[], unit: string | null | undefined) {
  const normalized = unit?.trim()
  if (!normalized) return []
  return systems
    .filter((system) => system.unit?.trim() === normalized)
    .sort((a, b) => String(a.label ?? "").localeCompare(String(b.label ?? "")))
}

export function findUnitForSystem(systems: SystemOption[], systemId: number | null | undefined) {
  if (!systemId || !Number.isFinite(systemId)) return ""
  return systems.find((system) => system.id === systemId)?.unit?.trim() ?? ""
}

export function formatRelativeDays(days: number | null | undefined, empty = "No record") {
  if (days == null || !Number.isFinite(days)) return empty
  if (days <= 0) return "Today"
  if (days === 1) return "1 day ago"
  return `${days} days ago`
}
