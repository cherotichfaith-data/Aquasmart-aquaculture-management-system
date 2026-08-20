import { NextResponse } from "next/server"
import { z } from "zod"
import { requireApiUser } from "@/lib/server/auth"
import {
  createPlannedActivity,
  listPlannedActivitiesForFarm,
} from "@/features/dashboard/planned-activities.server"

const createSchema = z.object({
  farmId: z.string().uuid("Invalid farm ID."),
  title: z.string().trim().min(1, "Task is required.").max(120, "Task must be 120 characters or fewer."),
  notes: z.string().max(1000, "Notes must be 1000 characters or fewer.").default(""),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date."),
  planningWindow: z.enum(["tomorrow", "this_week"]),
})

export async function GET(request: Request) {
  const auth = await requireApiUser("plannedActivities:list")
  if ("response" in auth) return auth.response

  const { searchParams } = new URL(request.url)
  const farmId = searchParams.get("farmId")
  if (!farmId) {
    return NextResponse.json({ error: "farmId is required." }, { status: 400 })
  }

  try {
    const activities = await listPlannedActivitiesForFarm(farmId, auth.supabase)
    return NextResponse.json({ data: activities })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load planned activities."
    const status = /do not have access|unauthorized/i.test(message) ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser("plannedActivities:create")
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof createSchema>
  try {
    payload = createSchema.parse(await request.json())
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid request body." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const activity = await createPlannedActivity(payload, auth.user.id, auth.supabase)
    return NextResponse.json({ data: activity }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create planned activity."
    const status = /permission|unauthorized/i.test(message) ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
