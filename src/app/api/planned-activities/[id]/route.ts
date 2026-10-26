import { NextResponse } from "next/server"
import { z } from "zod"
import { requireApiUser } from "@/lib/server/auth"
import {
  deletePlannedActivity,
  updatePlannedActivityStatus,
} from "@/features/dashboard/planned-activities.server"

const updateSchema = z.object({
  farmId: z.string().uuid("Invalid farm ID."),
  status: z.enum(["planned", "done"]),
})

const deleteSchema = z.object({
  farmId: z.string().uuid("Invalid farm ID."),
})

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiUser("plannedActivities:update")
  if ("response" in auth) return auth.response

  const { id } = await context.params

  let payload: z.infer<typeof updateSchema>
  try {
    payload = updateSchema.parse(await request.json())
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid request body." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const activity = await updatePlannedActivityStatus({
      activityId: id,
      farmId: payload.farmId,
      status: payload.status,
      supabase: auth.supabase,
    })
    return NextResponse.json({ data: activity })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update planned activity."
    const status = /permission|unauthorized|access/i.test(message) ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireApiUser("plannedActivities:delete")
  if ("response" in auth) return auth.response

  const { id } = await context.params
  const { searchParams } = new URL(request.url)

  let payload: z.infer<typeof deleteSchema>
  try {
    payload = deleteSchema.parse({ farmId: searchParams.get("farmId") })
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid request." : "Invalid request."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    await deletePlannedActivity({
      activityId: id,
      farmId: payload.farmId,
      supabase: auth.supabase,
    })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete planned activity."
    const status = /permission|unauthorized|access/i.test(message) ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
