import { NextResponse } from "next/server"
import { z } from "zod"
import { requireRateLimitedApiUser } from "@/lib/server/auth"
import { apiRateLimits } from "@/lib/server/rate-limit"
import type { ApprovalEntry } from "@/lib/approvals"
import type { Json } from "@/lib/types/database"

const editSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
})

// Revise a still-pending submission in place. The database RPC re-runs the full
// submission validation and enforces who may edit which entry.
export async function PATCH(request: Request, context: { params: Promise<{ entryId: string }> }) {
  const auth = await requireRateLimitedApiUser(request, "approvals:edit", apiRateLimits.mutation)
  if ("response" in auth) return auth.response

  const id = Number((await context.params).entryId)
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid submission." }, { status: 400 })

  const parsed = editSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid edit." }, { status: 400 })

  const { data, error } = await auth.supabase.rpc("update_pending_entry", {
    p_id: id,
    p_payload: parsed.data.payload as Json,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === "42501" ? 403 : 400 })
  }
  return NextResponse.json({ entry: data as unknown as ApprovalEntry })
}
