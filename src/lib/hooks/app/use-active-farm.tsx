"use client"

import { useCallback, useEffect, useMemo, useState, type SetStateAction } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { useFarmOptions } from "@/lib/hooks/use-options"
import { queryKeys } from "@/lib/cache/query-keys"
import { createClient } from "@/lib/supabase/client"
import { ACTIVE_FARM_COOKIE, clearBrowserWorkspaceContext, setBrowserWorkspaceContext } from "@/lib/context"

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

type ActiveFarmDraft = {
  sourceToken: symbol
  value: string | null
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

const clearStoredActiveFarmId = (userId?: string | null) => {
  if (!userId || typeof window === "undefined") return
  window.localStorage.removeItem(getStorageKey(userId))
}

export function useActiveFarm(params?: { initialFarmId?: string | null; initialFarmName?: string | null }) {
  const { user, session, isLoading } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const farmsQuery = useFarmOptions({ enabled: Boolean(session) })
  const availableFarms = useMemo(
    () => ((farmsQuery.data?.status === "success" ? farmsQuery.data.data : []) as FarmOption[]),
    [farmsQuery.data],
  )
  const initialFarmId = normalizeFarmId(params?.initialFarmId)
  const derivedActiveFarmId = useMemo(() => {
    if (isLoading) {
      return initialFarmId
    }

    if (!session || availableFarms.length === 0) {
      return null
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
    const farmIds = availableFarms.map((row) => row.id)

    return (
      (urlFarmId && farmIds.includes(urlFarmId) ? urlFarmId : null) ??
      (storedFarmId && farmIds.includes(storedFarmId) ? storedFarmId : null) ??
      (cookieFarmId && farmIds.includes(cookieFarmId) ? cookieFarmId : null) ??
      farmIds[0] ??
      null
    )
  }, [availableFarms, initialFarmId, isLoading, session, user?.id])
  const sourceSignature = [
    user?.id ?? "",
    session ? "session" : "anon",
    isLoading ? "loading" : "ready",
    initialFarmId ?? "",
    availableFarms.map((farm) => farm.id).join(","),
    derivedActiveFarmId ?? "",
  ].join("|")
  const currentSourceToken = useMemo(() => Symbol(sourceSignature), [sourceSignature])
  const [draft, setDraft] = useState<ActiveFarmDraft>(() => ({
    sourceToken: currentSourceToken,
    value: derivedActiveFarmId,
  }))
  const activeFarmId = draft.sourceToken === currentSourceToken ? draft.value : derivedActiveFarmId
  const setActiveFarmId = useCallback((value: SetStateAction<string | null>) => {
    setDraft((current) => {
      const previousValue = current.sourceToken === currentSourceToken ? current.value : derivedActiveFarmId
      const nextValue = typeof value === "function" ? value(previousValue) : value
      return {
        sourceToken: currentSourceToken,
        value: nextValue,
      }
    })
  }, [currentSourceToken, derivedActiveFarmId])

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
    if (isLoading) {
      return
    }

    if (!session) {
      clearStoredActiveFarmId(user?.id)
      clearBrowserWorkspaceContext()
      return
    }

    if (!availableFarms.length || !activeFarmId) {
      clearStoredActiveFarmId(user?.id)
      clearBrowserWorkspaceContext()
      return
    }

    if (user?.id && typeof window !== "undefined") {
      window.localStorage.setItem(getStorageKey(user.id), activeFarmId)
      setBrowserWorkspaceContext({ farmId: activeFarmId })
    }
  }, [activeFarmId, availableFarms.length, isLoading, session, user?.id])

  useEffect(() => {
    const handleFarmUpdated = (event: Event) => {
      const maybeCustom = event as CustomEvent<{ farmId?: string }>
      const nextFarmId = normalizeFarmId(maybeCustom?.detail?.farmId) ?? null
      setActiveFarmId(nextFarmId)
      void farmsQuery.refetch()
      void farmDetailsQuery.refetch()
    }

    const handleMembershipUpdated = () => {
      void farmsQuery.refetch()
      void farmDetailsQuery.refetch()
    }

    if (typeof window !== "undefined") {
      window.addEventListener("farm-updated", handleFarmUpdated)
      window.addEventListener("farm-memberships-updated", handleMembershipUpdated)
      return () => {
        window.removeEventListener("farm-updated", handleFarmUpdated)
        window.removeEventListener("farm-memberships-updated", handleMembershipUpdated)
      }
    }
  }, [farmDetailsQuery, farmsQuery, setActiveFarmId])

  const farm = useMemo<ActiveFarm | null>(() => {
    if (!activeFarmId) return null
    const match = availableFarms.find((row) => row.id === activeFarmId)
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
  }, [activeFarmId, availableFarms, farmDetailsQuery.data, params?.initialFarmName])

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
