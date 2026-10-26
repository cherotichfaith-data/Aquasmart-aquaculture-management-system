import type { Database } from "@/lib/types/database"

export type SystemOption = {
  cage_status?: Database["public"]["Enums"]["cage_status_enum"] | null
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
  "cage_status" | "commissioned_at" | "farm_id" | "growth_stage" | "id" | "is_active" | "name" | "type"
> & {
  production_start?: string | null
  unit: string | null
}

function hasDuplicatedUnitPrefix(unit: string, name: string) {
  return name.toLowerCase().startsWith(unit.toLowerCase())
}

function buildCompactSystemLabel(unit: string, name: string) {
  return `${unit}${name}`
}

export function buildPersistedSystemName(unit: string | null | undefined, name: string | null | undefined): string {
  const trimmedUnit = unit?.trim()
  const trimmedName = name?.trim()

  if (trimmedUnit && trimmedName) {
    if (hasDuplicatedUnitPrefix(trimmedUnit, trimmedName)) return trimmedName
    // Persist exactly what the form previews: unit and number joined with no
    // separator (e.g. "G1" + "A" -> "G1A"), matching buildCompactSystemLabel.
    return buildCompactSystemLabel(trimmedUnit, trimmedName)
  }
  return trimmedName || trimmedUnit || ""
}

export function formatSystemOptionLabel(system: Pick<SystemOptionSource, "id" | "name" | "unit">): string {
  const unit = system.unit?.trim()
  const name = system.name?.trim()

  if (unit && name) {
    if (hasDuplicatedUnitPrefix(unit, name)) return name
    return buildCompactSystemLabel(unit, name)
  }
  if (name) return name
  if (unit) return unit
  return "Missing cage name"
}

export function formatCageLabel(
  system: { id: number; label?: string | null; name?: string | null; unit?: string | null } | null | undefined,
): string {
  const name = system?.name?.trim()
  const unit = system?.unit?.trim()
  if (unit && name) {
    if (hasDuplicatedUnitPrefix(unit, name)) return name
    return buildCompactSystemLabel(unit, name)
  }
  if (name) return name
  if (unit) return unit

  const label = system?.label?.trim()
  if (label) return label

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
  return formatCageLabel(system)
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
    const candidates = [formatCageLabel(system as { id: number; label?: string | null; name?: string | null; unit?: string | null }), system.label, system.name, system.unit]
      .map((candidate) => normalizeSystemFilterText(candidate))
      .filter(Boolean)
    return candidates.includes(normalizedValue)
  })

  return typeof match?.id === "number" ? match.id : undefined
}

