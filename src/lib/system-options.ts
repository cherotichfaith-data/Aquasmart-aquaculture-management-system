import type { Database } from "@/lib/types/database"

export type SystemOption = {
  farm_id: string
  farm_name: string
  growth_stage: Database["public"]["Enums"]["system_growth_stage"]
  id: number
  is_active: boolean
  label: string
  name?: string | null
  type: string
  unit?: string | null
}

export type SystemOptionSource = Pick<
  Database["public"]["Tables"]["system"]["Row"],
  "farm_id" | "growth_stage" | "id" | "is_active" | "name" | "type"
> & {
  unit: string | null
}

export function formatSystemOptionLabel(system: Pick<SystemOptionSource, "id" | "name" | "unit">): string {
  const unit = system.unit?.trim()
  const name = system.name?.trim()

  if (unit && name) return `${unit} - ${name}`
  if (name) return name
  if (unit) return unit
  return "Missing cage name"
}

export function formatCageLabel(
  system: { id: number; label?: string | null; unit?: string | null } | null | undefined,
): string {
  const label = system?.label?.trim()
  if (label) return label

  const unit = system?.unit?.trim()
  if (unit) return unit

  return "Missing cage name"
}

export function createSystemLabelResolver(systems: Array<{ id: number; label?: string | null; unit?: string | null }>) {
  const systemsById = new Map(systems.map((system) => [system.id, system]))

  return (systemId: number | null | undefined) => {
    if (systemId == null || !Number.isFinite(systemId)) return "-"
    return formatCageLabel(systemsById.get(systemId))
  }
}

function normalizeSystemFilterText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase()
}

export function getSystemFilterUrlValue(
  system: { id: number; label?: string | null; name?: string | null; unit?: string | null } | null | undefined,
) {
  return system?.name?.trim() || system?.unit?.trim() || formatCageLabel(system)
}

export function resolveSystemIdFromFilterValue(
  value: string | number | null | undefined,
  systems: Array<{ id: number | null; label?: string | null; name?: string | null; unit?: string | null }>,
) {
  if (value == null || value === "" || value === "all") return undefined

  if (typeof value === "number" && Number.isFinite(value)) {
    return systems.some((system) => system.id === value) ? value : undefined
  }

  const rawValue = String(value).trim()
  const numericValue = Number(rawValue)
  if (Number.isFinite(numericValue) && systems.some((system) => system.id === numericValue)) {
    return numericValue
  }

  const normalizedValue = normalizeSystemFilterText(rawValue)
  const match = systems.find((system) => {
    const candidates = [system.label, system.name, system.unit]
      .map((candidate) => normalizeSystemFilterText(candidate))
      .filter(Boolean)
    return candidates.includes(normalizedValue)
  })

  return typeof match?.id === "number" ? match.id : undefined
}

export function mapSystemRowToOption(system: SystemOptionSource): SystemOption {
  return {
    farm_id: system.farm_id ?? "",
    farm_name: "",
    growth_stage: system.growth_stage,
    id: system.id,
    is_active: system.is_active,
    label: formatSystemOptionLabel(system),
    name: system.name,
    type: system.type,
    unit: system.unit,
  }
}
