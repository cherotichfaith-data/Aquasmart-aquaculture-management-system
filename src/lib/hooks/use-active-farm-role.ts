"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/cache/query-keys"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { normalizeRole } from "@/lib/app-entry"
import { isSbAuthMissing, logSbError } from "@/lib/supabase/log"
import type { Database } from "@/lib/types/database"

type FarmRole = Database["public"]["Tables"]["farm_user"]["Row"]["role"]

async function getActiveFarmRole(params: { farmId?: string | null; userId?: string | null }) {
  if (!params.farmId || !params.userId) return null

  const supabase = createClient()
  const { data, error } = await supabase
    .from("farm_user")
    .select("role")
    .eq("farm_id", params.farmId)
    .eq("user_id", params.userId)
    .maybeSingle()

  if (!error && data?.role) {
    return normalizeRole(data.role ?? null) as FarmRole | null
  }

  if (error && !isSbAuthMissing(error)) {
    logSbError("getActiveFarmRole", error)
  }

  if (error && !isSbAuthMissing(error)) {
    throw error
  }

  return null
}

export function useActiveFarmRole(farmId?: string | null) {
  const { session, user } = useAuth()

  return useQuery({
    queryKey: queryKeys.farmUserRole(farmId, user?.id),
    queryFn: () => getActiveFarmRole({ farmId, userId: user?.id ?? null }),
    enabled: Boolean(farmId) && Boolean(user?.id) && (Boolean(session) || Boolean(user)),
    staleTime: 5 * 60_000,
  })
}
