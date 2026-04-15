"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { useFarmOptions } from "@/lib/hooks/use-options"
import { queryKeys } from "@/lib/cache/query-keys"
import { createClient } from "@/lib/supabase/client"

type FarmOption = {
  id: string
  label: string | null
  location: string | null
}

type ActiveFarm = {
  id: string
  name: string | null
  location: string | null
  owner?: string | null
  email?: string | null
  phone?: string | null
}

const getStorageKey = (userId: string) => `aquasmart:${userId}:activeFarmId`

const normalizeFarmId = (value?: string | null) => {
  const trimmed = typeof value === "string" ? value.trim() : ""
  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    return null
  }
  return trimmed
}

export function useActiveFarm(params?: { initialFarmId?: string | null }) {
  const { user, session, isLoading } = useAuth()
  const [activeFarmId, setActiveFarmId] = useState<string | null>(normalizeFarmId(params?.initialFarmId))
  const supabase = useMemo(() => createClient(), [])

  const farmsQuery = useFarmOptions({ enabled: Boolean(session) })
  const farmDetailsQuery = useQuery({
    queryKey: queryKeys.appConfig([`farm-details:${activeFarmId ?? "none"}`], user?.id),
    enabled: Boolean(session) && Boolean(activeFarmId),
    staleTime: 60_000,
    queryFn: async () => {
      if (!activeFarmId) return null
      const { data, error } = await supabase
        .from("farm")
        .select("id, name, location, owner, email, phone")
        .eq("id", activeFarmId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    if (!session) {
      setActiveFarmId(null)
      return
    }

    const farms = (farmsQuery.data?.status === "success" ? farmsQuery.data.data : []) as FarmOption[]
    if (!farms.length) {
      setActiveFarmId(null)
      return
    }

    let urlFarmId: string | null = null
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      urlFarmId = normalizeFarmId(params.get("farmId"))
    }

    let storedFarmId: string | null = null
    if (user?.id && typeof window !== "undefined") {
      storedFarmId = normalizeFarmId(window.localStorage.getItem(getStorageKey(user.id)))
    }

    const farmIds = farms.map((row) => row.id)
    const resolvedFarmId =
      (urlFarmId && farmIds.includes(urlFarmId) ? urlFarmId : null) ??
      (storedFarmId && farmIds.includes(storedFarmId) ? storedFarmId : null) ??
      farmIds[0] ??
      null

    if (resolvedFarmId && user?.id && typeof window !== "undefined") {
      window.localStorage.setItem(getStorageKey(user.id), resolvedFarmId)
    }

    setActiveFarmId(resolvedFarmId)
  }, [farmsQuery.data, session, user?.id])

  useEffect(() => {
    const handler = (event: Event) => {
      const maybeCustom = event as CustomEvent<{ farmId?: string }>
      const nextFarmId = normalizeFarmId(maybeCustom?.detail?.farmId) ?? null
      setActiveFarmId(nextFarmId)
      void farmsQuery.refetch()
      void farmDetailsQuery.refetch()
    }

    if (typeof window !== "undefined") {
      window.addEventListener("farm-updated", handler)
      return () => window.removeEventListener("farm-updated", handler)
    }
  }, [farmDetailsQuery, farmsQuery])

  const farm = useMemo<ActiveFarm | null>(() => {
    const farms = (farmsQuery.data?.status === "success" ? farmsQuery.data.data : []) as FarmOption[]
    if (!activeFarmId) return null
    const match = farms.find((row) => row.id === activeFarmId)
    const details = farmDetailsQuery.data
    if (!match && !details) return null
    return {
      id: details?.id ?? match?.id ?? activeFarmId,
      name: details?.name ?? match?.label ?? null,
      location: details?.location ?? match?.location ?? null,
      owner: details?.owner ?? null,
      email: details?.email ?? null,
      phone: details?.phone ?? null,
    }
  }, [activeFarmId, farmDetailsQuery.data, farmsQuery.data])

  return {
    farm,
    farmId: activeFarmId ?? null,
    loading: isLoading || (Boolean(session) && (farmsQuery.isLoading || farmDetailsQuery.isLoading)),
    error: (farmsQuery.error as Error | null) ?? (farmDetailsQuery.error as Error | null),
    refresh: async () => {
      await Promise.all([farmsQuery.refetch(), farmDetailsQuery.refetch()])
    },
  }
}
