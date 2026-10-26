"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireActionUser } from "@/lib/server/auth"
import { workbookClient } from "@/features/analytics/workbook-client.server"

const schema = z.object({
  farm_id: z.string().uuid(),
  planned_fish: z.coerce.number().int().min(0).max(10000000),
  planned_abw_g: z.coerce.number().min(0.1).max(100),
  scenario: z.enum(["main", "slow", "potential"]),
})

export async function savePlanningSettings(form: FormData) {
  const { accessToken } = await requireActionUser("workbook:savePlanning")
  const parsed = schema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { error: "Enter a whole fish count, stocking weight from 0.1 to 100 g, and a growth scenario." }
  const { error } = await workbookClient(accessToken).from("production_planning_settings").upsert({ ...parsed.data, updated_at: new Date().toISOString() })
  if (error) return { error: "Could not save. A farm manager or administrator must save planning defaults." }
  revalidatePath("/analytics")
  revalidatePath("/analytics/workbook")
  revalidatePath("/analytics/inputs")
  return { error: null }
}
