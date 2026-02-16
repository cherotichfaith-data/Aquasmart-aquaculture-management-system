"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useFarmOptions } from "@/lib/hooks/use-options"

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
export function useActiveFarm() {
  const { user, session, isLoading } = useAuth()
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null)

  const farmsQuery = useFarmOptions({ enabled: Boolean(session) })

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
      urlFarmId = params.get("farmId")
    }

    let storedFarmId: string | null = null
    if (user?.id && typeof window !== "undefined") {
      storedFarmId = window.localStorage.getItem(getStorageKey(user.id))
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
      if (maybeCustom?.detail?.farmId) {
        setActiveFarmId(maybeCustom.detail.farmId)
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("farm-updated", handler)
      return () => window.removeEventListener("farm-updated", handler)
    }
  }, [])

  const farm = useMemo<ActiveFarm | null>(() => {
    const farms = (farmsQuery.data?.status === "success" ? farmsQuery.data.data : []) as FarmOption[]
    if (!activeFarmId) return null
    const match = farms.find((row) => row.id === activeFarmId)
    if (!match) return null
    return { id: match.id, name: match.label ?? null, location: match.location ?? null }
  }, [activeFarmId, farmsQuery.data])

  return {
    farm,
    farmId: activeFarmId ?? null,
    loading: isLoading || (Boolean(session) && farmsQuery.isLoading),
    error: farmsQuery.error as Error | null,
    refresh: farmsQuery.refetch,
  }
}
