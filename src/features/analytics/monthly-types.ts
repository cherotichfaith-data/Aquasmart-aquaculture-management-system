export type MonthlyReview = {
  farm_id: string
  month: string
  system_id: number
  batch_id: number
  stocked_no: number | null
  mortality_no: number | null
  abw_end_g: number | null
  feed_kg: number | null
  notes: string
  revision: number
  updated_at: string
  updated_by: string
}

export type MonthlyInputRow = Omit<MonthlyReview, "farm_id" | "month" | "updated_by" | "revision" | "updated_at"> & {
  cage_name: string
  batch_name: string
  stocked_on: string | null
  opening_no: number
  transferred_in_no: number
  source_stocked_no: number
  source_mortality_no: number
  source_abw_end_g: number | null
  source_feed_kg: number
  abw_date: string | null
  revision: number | null
  updated_at: string | null
}

export type MonthlyTables = {
  production_monthly_review: {
    Row: MonthlyReview
    Insert: Omit<MonthlyReview, "revision" | "updated_at" | "updated_by"> & { revision?: number; updated_at?: string; updated_by?: string }
    Update: Partial<MonthlyReview>
    Relationships: []
  }
}
export type MonthlyFunctions = {
  api_monthly_production_inputs: {
    Args: { p_farm_id: string; p_month: string }
    Returns: MonthlyInputRow[]
  }
}
