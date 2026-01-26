"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { createClient } from "@/utils/supabase/client"
import type { Tables } from "@/lib/types/database"

type FarmRow = Tables<"farm">

export function useActiveFarm() {
  const { user } = useAuth()
  const supabase = createClient()
  const [farm, setFarm] = useState<FarmRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchFarm = useCallback(async () => {
    if (!user?.id) {
      setFarm(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data: membership, error: membershipError } = await supabase
        .from("farm_user")
        .select("farm_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()

      if (membershipError) {
        throw membershipError
      }

      if (!membership?.farm_id) {
        setFarm(null)
        setLoading(false)
        return
      }

      const { data: farmRow, error: farmError } = await supabase
        .from("farm")
        .select("*")
        .eq("id", membership.farm_id)
        .single()

      if (farmError) {
        throw farmError
      }

      setFarm(farmRow ?? null)
    } catch (err) {
      setError(err as Error)
      setFarm(null)
    } finally {
      setLoading(false)
    }
  }, [supabase, user?.id])

  useEffect(() => {
    void fetchFarm()
  }, [fetchFarm])

  useEffect(() => {
    const handler = () => {
      void fetchFarm()
    }

    if (typeof window !== "undefined") {
      window.addEventListener("farm-updated", handler)
      return () => window.removeEventListener("farm-updated", handler)
    }
  }, [fetchFarm])

  return { farm, farmId: farm?.id ?? null, loading, error, refresh: fetchFarm }
}
