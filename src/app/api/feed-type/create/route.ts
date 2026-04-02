import { NextResponse } from "next/server"
import { z } from "zod"
import { cacheTags } from "@/lib/cache/tags"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser, revalidateWriteTags } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

const feedTypeSchema = z.object({
  feed_line: z.string().trim().max(255).nullable().optional(),
  feed_category: z.enum(["pre-starter", "starter", "pre-grower", "grower", "finisher", "broodstock"]),
  feed_pellet_size: z.enum(["mash_powder", "<0.49mm", "0.5-0.99mm", "1.0-1.5mm", "1.5-1.99mm", "2mm", "2.5mm", "3mm"]),
  crude_protein_percentage: z.number().finite().positive(),
  crude_fat_percentage: z.number().finite().min(0).nullable().optional(),
  feed_supplier: z.number().int().positive(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "feed-type:create", apiRateLimits.mutation)
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof feedTypeSchema>
  try {
    payload = feedTypeSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid feed type payload." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("feed_type")
    .insert({
      feed_line: payload.feed_line?.trim() ? payload.feed_line.trim() : null,
      feed_category: payload.feed_category,
      feed_pellet_size: payload.feed_pellet_size,
      crude_protein_percentage: payload.crude_protein_percentage,
      crude_fat_percentage: payload.crude_fat_percentage ?? null,
      feed_supplier: payload.feed_supplier,
    })
    .select()
    .single()

  if (error || !data) {
    logSbError("feed-type:create:insert", error)
    const status = isSbPermissionDenied(error) ? 403 : 500
    return NextResponse.json({ error: "Unable to create feed type." }, { status })
  }

  revalidateWriteTags([cacheTags.feedTypes()])

  return NextResponse.json({ data }, { status: 201 })
}
