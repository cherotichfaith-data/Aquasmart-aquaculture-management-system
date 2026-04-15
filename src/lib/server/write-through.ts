import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"
import { enforceUserRateLimit, type ApiRateLimitPolicy } from "@/lib/server/rate-limit"
import { isSbNetworkError, isSbPermissionDenied, logSbError } from "@/lib/supabase/log"
import { createClient } from "@/lib/supabase/server"

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

export async function requireRouteUser(
  supabase: ServerSupabaseClient,
  tag: string,
): Promise<{ user: User } | { response: NextResponse }> {
  let user: User | null = null
  let error: unknown = null

  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
    error = result.error
  } catch (caught) {
    error = caught
  }

  if (error || !user) {
    if (error) {
      if (isSbNetworkError(error)) {
        logSbError(`${tag}:getUser`, error)
        return { response: NextResponse.json({ error: "Authentication service unavailable." }, { status: 503 }) }
      }
      logSbError(`${tag}:getUser`, error)
    }
    return { response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) }
  }

  return { user }
}

export async function requireRateLimitedRouteUser(
  supabase: ServerSupabaseClient,
  request: Request,
  tag: string,
  policy: ApiRateLimitPolicy,
): Promise<{ user: User } | { response: NextResponse }> {
  const auth = await requireRouteUser(supabase, tag)
  if ("response" in auth) return auth

  const rateLimit = await enforceUserRateLimit({
    request,
    tag,
    userId: auth.user.id,
    policy,
  })
  if (rateLimit.response) return { response: rateLimit.response }

  return auth
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
