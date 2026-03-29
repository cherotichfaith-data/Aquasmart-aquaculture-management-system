"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { logSbError } from "@/lib/supabase/log"
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

  if (error) {
    logSbError("getActiveFarmRole", error)
    throw error
  }

  return (data?.role ?? null) as FarmRole | null
}

export function useActiveFarmRole(farmId?: string | null) {
  const { session, user } = useAuth()

  return useQuery({
    queryKey: ["farm-user-role", farmId ?? "none", user?.id ?? "anon"],
    queryFn: () => getActiveFarmRole({ farmId, userId: user?.id ?? null }),
    enabled: Boolean(session) && Boolean(farmId) && Boolean(user?.id),
    staleTime: 5 * 60_000,
  })
}
