"use client"

import type { ReactNode, Ref } from "react"
import { Minus, Plus } from "lucide-react"
import { Input } from "@/components/app-ui/input"
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
    <div className={cn("data-entry-context-panel p-4", className)}>
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
      ? "border-destructive/30 bg-destructive/10"
      : tone === "warning"
        ? "border-warning/30 bg-warning/10"
        : tone === "success"
          ? "border-success/30 bg-success/10"
          : "border-border/60 bg-background/70"

  return (
    <div className={cn("data-entry-note-card rounded-md border px-3 py-2", toneClass)}>
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

type StepperField = {
  value: unknown
  onChange: (value: number) => void
  onBlur: () => void
  name: string
  ref: Ref<HTMLInputElement>
}

/**
 * Whole-number count input with +/- stepper buttons for one-handed use in the
 * field (fish counts, bag counts). Buttons are 44px touch targets. Falls back
 * to plain typing/paste in the input for large counts.
 */
export function NumberStepperInput({
  field,
  min = 0,
  step = 1,
  className,
  placeholder,
  disabled,
}: {
  field: StepperField
  min?: number
  step?: number
  className?: string
  placeholder?: string
  disabled?: boolean
}) {
  const numericValue = typeof field.value === "number" ? field.value : Number(field.value)
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0

  const adjust = (delta: number) => {
    const next = Math.max(min, safeValue + delta)
    field.onChange(next)
  }

  return (
    <div className={cn("flex items-stretch gap-1.5", className)}>
      <button
        type="button"
        aria-label="Decrease"
        disabled={disabled || safeValue <= min}
        onClick={() => adjust(-step)}
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-input bg-background text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <Input
        type="number"
        step={step}
        inputMode="numeric"
        placeholder={placeholder}
        disabled={disabled}
        name={field.name}
        ref={field.ref}
        value={(field.value as number | string | undefined) ?? ""}
        onChange={(event) => {
          const raw = event.target.value
          field.onChange(raw === "" ? 0 : Number(raw))
        }}
        onBlur={field.onBlur}
        className="min-h-11 text-center"
      />
      <button
        type="button"
        aria-label="Increase"
        disabled={disabled}
        onClick={() => adjust(step)}
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-input bg-background text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
