import type { Database } from "@/lib/types/database"

export type SystemOption = {
  farm_id: string
  farm_name: string
  growth_stage: Database["public"]["Enums"]["system_growth_stage"]
  id: number
  is_active: boolean
  label: string
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
  return `System ${system.id}`
}

export function mapSystemRowToOption(system: SystemOptionSource): SystemOption {
  return {
    farm_id: system.farm_id ?? "",
    farm_name: "",
    growth_stage: system.growth_stage,
    id: system.id,
    is_active: system.is_active,
    label: formatSystemOptionLabel(system),
    type: system.type,
    unit: system.unit,
  }
}
