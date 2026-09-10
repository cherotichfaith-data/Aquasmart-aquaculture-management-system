export const approvalTypes = {
  feeding: "Feeding", mortality: "Mortality", sampling: "Sampling",
  transfer: "Transfer", harvest: "Harvest", stocking: "Stocking",
  water_quality: "Water quality", feed_inventory: "Feed inventory",
} as const

export type ApprovalType = keyof typeof approvalTypes
export type ApprovalEntry = {
  id: number
  farm_id: string
  entry_type: ApprovalType
  event_date: string
  system_id: number | null
  payload: Record<string, unknown>
  status: "pending" | "approved" | "rejected"
  submitted_by: string
  submitted_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_reason: string | null
  official_record_id: number | null
}

export function hasPendingApproval(result: unknown): boolean {
  if (!result || typeof result !== "object" || !("meta" in result)) return false
  const meta = result.meta
  return !!meta && typeof meta === "object" && "pendingApproval" in meta && meta.pendingApproval === true
}
