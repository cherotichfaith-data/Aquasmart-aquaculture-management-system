import { NextResponse } from "next/server"
import { z } from "zod"
import { requireApiUser, requireRateLimitedApiUser } from "@/lib/server/auth"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { revalidateWriteTags } from "@/lib/server/write-through"
import { feedingWriteTags, inventoryWriteTags, waterQualityWriteTags, feedInventoryWriteTags } from "@/lib/cache/tags"
import { approvalTypes, type ApprovalEntry } from "@/lib/approvals"

const querySchema = z.object({
  farmId: z.string().uuid(), status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  page: z.coerce.number().int().min(0).max(100000).default(0),
  type: z.string().optional().refine((value) => !value || value in approvalTypes, "Invalid entry type"),
})
export async function GET(request: Request) {
  const auth = await requireApiUser("approvals:list")
  if ("response" in auth) return auth.response
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success) return NextResponse.json({ error: "Invalid approval filters." }, { status: 400 })
  const { farmId, status, page, type } = parsed.data
  let query = auth.supabase.from("production_pending_entry").select("*", { count: "exact" })
    .eq("farm_id", farmId).eq("status", status).order("event_date", { ascending: false }).order("id", { ascending: false })
    .range(page * 50, page * 50 + 49)
  if (type) query = query.eq("entry_type", type)
  const countFor = (value: "pending" | "approved" | "rejected") =>
    auth.supabase.from("production_pending_entry").select("id", { count: "exact", head: true }).eq("farm_id", farmId).eq("status", value)
  const [{ data, count, error }, pending, approved, rejected] = await Promise.all([
    query, countFor("pending"), countFor("approved"), countFor("rejected"),
  ])
  if (error) return NextResponse.json({ error: error.code === "42P01" || error.code === "PGRST205"
    ? "The approvals database migration has not been installed on this environment." : "Unable to load approvals." }, { status: 503 })
  return NextResponse.json({
    entries: data, total: count ?? 0,
    counts: { pending: pending.count ?? 0, approved: approved.count ?? 0, rejected: rejected.count ?? 0 },
  }, { headers: { "Cache-Control": "private, no-store" } })
}

const reviewSchema = z.object({ farmId: z.string().uuid(), ids: z.array(z.number().int().positive()).min(1).max(100),
  decision: z.enum(["approved", "rejected"]), reason: z.string().trim().max(1000).optional() })
export async function POST(request: Request) {
  const auth = await requireRateLimitedApiUser(request, "approvals:review", apiRateLimits.mutation)
  if ("response" in auth) return auth.response
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid approval decision." }, { status: 400 })
  const { farmId, ids, decision, reason } = parsed.data
  const { data, error } = await auth.supabase.rpc("review_production_entries", {
    p_farm_id: farmId, p_ids: ids, p_decision: decision, p_reason: reason ?? null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "42501" ? 403 : 409 })
  const entries = data as unknown as ApprovalEntry[]
  const tags = new Set([...waterQualityWriteTags({ farmId }), ...feedInventoryWriteTags({ farmId })])
  for (const entry of entries) {
    for (const systemId of [entry.system_id, Number(entry.payload.target_system_id) || null]) {
      if (systemId == null) continue
      for (const tag of [...inventoryWriteTags({ farmId, systemId, includeProduction: true }), ...feedingWriteTags({ farmId, systemId })]) tags.add(tag)
    }
  }
  revalidateWriteTags([...tags])
  return NextResponse.json({ entries })
}
