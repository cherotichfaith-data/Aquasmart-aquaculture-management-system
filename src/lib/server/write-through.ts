import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"
import { requireApiUser, requireRateLimitedApiUser } from "@/lib/server/auth"
import type { ApiRateLimitPolicy } from "@/lib/server/rate-limit"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"
import { createClient } from "@/lib/supabase/server"

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

/**
 * Thin compatibility wrappers around the consolidated auth helper
 * (src/lib/server/auth.ts). The `supabase` parameter is accepted but no
 * longer used -- requireApiUser resolves its own verified client -- so every
 * existing call site here keeps working unchanged. Prefer importing
 * requireApiUser / requireRateLimitedApiUser directly in new routes.
 *
 * This used to be two different auth strategies in this file alone
 * (requireRouteUser via a verified supabase.auth.getUser() call, and
 * requireSessionRouteUser via an unverified local JWT decode). Only the
 * verified strategy survived the consolidation -- see auth.ts for why.
 */
export async function requireRouteUser(_supabase: ServerSupabaseClient, tag: string) {
  return requireApiUser(tag)
}

export async function requireRateLimitedRouteUser(
  _supabase: ServerSupabaseClient,
  request: Request,
  tag: string,
  policy: ApiRateLimitPolicy,
) {
  return requireRateLimitedApiUser(request, tag, policy)
}

export async function getSystemFarmId(
  supabase: ServerSupabaseClient,
  systemId: number,
  tag: string,
): Promise<{ farmId: string } | { response: NextResponse }> {
  const { data, error } = await supabase.from("system").select("id, farm_id").eq("id", systemId).maybeSingle()

  if (error) {
    logSbError(`${tag}:systemLookup`, error)
    const status = isSbPermissionDenied(error) ? 403 : 500
    return { response: NextResponse.json({ error: "Unable to verify the selected system." }, { status }) }
  }

  if (!data?.farm_id) {
    return { response: NextResponse.json({ error: "Selected system is unavailable." }, { status: 404 }) }
  }

  return { farmId: data.farm_id }
}

export async function getSystemFarmIds(
  supabase: ServerSupabaseClient,
  systemIds: number[],
  tag: string,
): Promise<{ farmIdsBySystemId: Map<number, string> } | { response: NextResponse }> {
  const uniqueIds = Array.from(new Set(systemIds.filter((id) => Number.isFinite(id))))
  const { data, error } = await supabase.from("system").select("id, farm_id").in("id", uniqueIds)

  if (error) {
    logSbError(`${tag}:systemLookup`, error)
    const status = isSbPermissionDenied(error) ? 403 : 500
    return { response: NextResponse.json({ error: "Unable to verify the selected systems." }, { status }) }
  }

  const farmIdsBySystemId = new Map<number, string>()
  ;(data ?? []).forEach((row) => {
    if (typeof row.id === "number" && typeof row.farm_id === "string") {
      farmIdsBySystemId.set(row.id, row.farm_id)
    }
  })

  if (farmIdsBySystemId.size !== uniqueIds.length) {
    return { response: NextResponse.json({ error: "One or more systems are unavailable." }, { status: 404 }) }
  }

  return { farmIdsBySystemId }
}

export function revalidateWriteTags(tags: string[]) {
  tags.forEach((tag) => revalidateTag(tag, "max"))
}
