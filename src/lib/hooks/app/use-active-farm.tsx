"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { useFarmOptions } from "@/lib/hooks/use-options"
import { queryKeys } from "@/lib/cache/query-keys"
import { createClient } from "@/lib/supabase/client"
import { ACTIVE_FARM_COOKIE, setBrowserWorkspaceContext } from "@/lib/context"

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

const readBrowserCookie = (name: string) => {
  if (typeof document === "undefined") return null
  const prefix = `${name}=`
  const match = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix))
  if (!match) return null
  return match.slice(prefix.length) || null
}

export function useActiveFarm(params?: { initialFarmId?: string | null; initialFarmName?: string | null }) {
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
        .select("id, name, location")
        .eq("id", activeFarmId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    if (params?.initialFarmId === undefined) return
    setActiveFarmId(normalizeFarmId(params.initialFarmId))
  }, [params?.initialFarmId, user?.id])

  useEffect(() => {
    if (isLoading) {
      return
    }

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

    const cookieFarmId = normalizeFarmId(readBrowserCookie(ACTIVE_FARM_COOKIE))

    const farmIds = farms.map((row) => row.id)
    const resolvedFarmId =
      (urlFarmId && farmIds.includes(urlFarmId) ? urlFarmId : null) ??
      (storedFarmId && farmIds.includes(storedFarmId) ? storedFarmId : null) ??
      (cookieFarmId && farmIds.includes(cookieFarmId) ? cookieFarmId : null) ??
      farmIds[0] ??
      null

    if (resolvedFarmId && user?.id && typeof window !== "undefined") {
      window.localStorage.setItem(getStorageKey(user.id), resolvedFarmId)
      setBrowserWorkspaceContext({ farmId: resolvedFarmId })
    }

    setActiveFarmId(resolvedFarmId)
  }, [farmsQuery.data, isLoading, session, user?.id])

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
    const initialFarmName = params?.initialFarmName?.trim() || null
    if (!match && !details && !initialFarmName) return null
    return {
      id: details?.id ?? match?.id ?? activeFarmId,
      name: details?.name ?? match?.label ?? initialFarmName,
      location: details?.location ?? match?.location ?? null,
      owner: null,
      email: null,
      phone: null,
    }
  }, [activeFarmId, farmDetailsQuery.data, farmsQuery.data, params?.initialFarmName])

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
