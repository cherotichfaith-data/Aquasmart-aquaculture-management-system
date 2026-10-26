import { NextResponse } from "next/server"
import { z } from "zod"
import { createFarmWorkspaceAction } from "@/features/farm/mutations.server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

const createWorkspaceSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  farmName: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(255),
  organizationId: z.string().uuid().nullable().optional(),
})

export async function POST(request: Request) {
  let payload: z.infer<typeof createWorkspaceSchema>

  try {
    payload = createWorkspaceSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid workspace payload." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const result = await createFarmWorkspaceAction({
      name: payload.farmName,
      location: payload.location,
      organizationId: payload.organizationId ?? null,
      organizationName: payload.organizationName,
    })

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    logSbError("api:workspaces:create", error)

    const message = error instanceof Error ? error.message : "Unable to create workspace."
    const status = /unauthorized/i.test(message) ? 401 : isSbPermissionDenied(error) ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
