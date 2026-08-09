"use client"

import type { ReactNode, Ref } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { Input } from "@/components/app-ui/input"
import type { SystemOption } from "@/lib/system-options"
import { cn } from "@/lib/utils"

/**
 * Sidebar/context panel for data-entry forms (DO classification preview, cycle
 * summary, etc). Built on the shared Card primitive so every form's side panel
 * matches -- previously some forms used this component (rounded-lg) while others
 * (e.g. the harvest cycle summary) used Card directly (rounded-xl), which read as
 * two different card styles sitting side by side.
 */
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
    <Card className={cn("border-t-2 border-t-primary/25 xl:sticky xl:top-6", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
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
      ? "border-destructive/30 bg-destructive/10"
      : tone === "warning"
        ? "border-warning/30 bg-warning/10"
        : tone === "success"
          ? "border-success/30 bg-success/10"
          : "border-border/60 bg-background/70"

  return (
    <div className={cn("rounded-lg border px-3 py-2", toneClass)}>
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

type FishCountField = {
  value: unknown
  onChange: (value: number) => void
  onBlur: () => void
  name: string
  ref: Ref<HTMLInputElement>
}

/**
 * Direct-entry whole-number count input for fish counts (mortality, sampling,
 * transfer, harvest, stocking). Plain typing only -- no +/- stepper buttons.
 */
export function FishCountInput({
  field,
  min = 0,
  step = 1,
  className,
  placeholder,
  disabled,
}: {
  field: FishCountField
  min?: number
  step?: number
  className?: string
  placeholder?: string
  disabled?: boolean
}) {
  const { name, onBlur, onChange, ref: inputRef, value } = field

  return (
    <Input
      type="number"
      min={min}
      step={step}
      inputMode="numeric"
      placeholder={placeholder}
      disabled={disabled}
      name={name}
      ref={inputRef}
      value={(value as number | string | undefined) ?? ""}
      onChange={(event) => {
        const raw = event.target.value
        onChange(raw === "" ? 0 : Number(raw))
      }}
      onBlur={onBlur}
      className={cn("min-h-11", className)}
    />
  )
}
