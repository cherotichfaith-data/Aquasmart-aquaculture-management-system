import type { Json } from "@/lib/types/database"

export type WorkbookImport = { id: string; farm_id: string; source_name: string; sha256: string; as_of: string; settings: Json; formula_errors: Json; imported_at: string }
export type WorkbookMonth = { import_id: string; farm_id: string; source_slot: number; month: string; batch_name: string; cage_name: string; stocked_on: string; stock_input_no: number | null; mortality_no: number | null; abw_end_kg: number | null; feed_kg: number | null; source_cells: Json; model_values: Json }
export type PlanningSettings = { farm_id: string; planned_fish: number; planned_abw_g: number; scenario: string; updated_at: string }
export type WorkbookTables = {
  production_workbook_import: { Row: WorkbookImport; Insert: WorkbookImport; Update: Partial<WorkbookImport>; Relationships: [] }
  production_workbook_month: { Row: WorkbookMonth; Insert: WorkbookMonth; Update: Partial<WorkbookMonth>; Relationships: [] }
  production_planning_settings: { Row: PlanningSettings; Insert: Omit<PlanningSettings, "updated_at"> & { updated_at?: string }; Update: Partial<PlanningSettings>; Relationships: [] }
}
