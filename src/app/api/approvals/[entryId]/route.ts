import { NextResponse } from "next/server"
import { z } from "zod"
import { requireRateLimitedApiUser } from "@/lib/server/auth"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { submitApproval } from "@/lib/server/approvals"
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

// A correction is a new pending submission; the rejected source is immutable.
export async function POST(request: Request, context: { params: Promise<{ entryId: string }> }) {
  const auth = await requireRateLimitedApiUser(request, "approvals:correct", apiRateLimits.mutation)
  if ("response" in auth) return auth.response
  const id = Number((await context.params).entryId)
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid submission." }, { status: 400 })
  const parsed = editSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid correction." }, { status: 400 })
  const { data: source, error } = await auth.supabase.from("production_pending_entry").select("*").eq("id", id).single()
  if (error || !source) return NextResponse.json({ error: "Submission unavailable." }, { status: 404 })
  if (source.status !== "rejected") return NextResponse.json({ error: "Only rejected entries can be resubmitted." }, { status: 409 })
  const { data: membership, error: roleError } = await auth.supabase.from("farm_user").select("role").eq("farm_id", source.farm_id).eq("user_id", auth.user.id).single()
  if (roleError || !membership || (source.submitted_by !== auth.user.id && !["admin", "farm_manager"].includes(membership.role))) {
    return NextResponse.json({ error: "You cannot correct this submission." }, { status: 403 })
  }
  const original = source.payload as Record<string, unknown>
  const edited = parsed.data.payload
  // A stable local id makes repeated requests idempotent and retains source lineage.
  // Cage (system) is correctable: honour the edited value, falling back to the original.
  const payload = {
    ...edited,
    farm_id: source.farm_id,
    system_id: edited.system_id ?? original.system_id,
    origin_system_id: edited.origin_system_id ?? original.origin_system_id,
    local_id: `correction:${id}`,
  }
  try {
    const entries = await submitApproval(auth.supabase, source.entry_type as ApprovalEntry["entry_type"], source.farm_id, payload)
    return NextResponse.json({ entry: entries[0] }, { status: 202 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to submit correction." }, { status: 400 })
  }
}
