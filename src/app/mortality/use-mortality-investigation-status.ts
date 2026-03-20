"use client"

import { useEffect, useMemo, useState } from "react"
import type { InvestigationStatus } from "./mortality-selectors"

const DEFAULT_STATUS: InvestigationStatus = "open"

function getStorageKey(farmId: string | null | undefined) {
  return `aquasmart:mortality:investigation:${farmId ?? "no-farm"}`
}

export function useMortalityInvestigationStatus(farmId: string | null | undefined) {
  const [statusBySystemId, setStatusBySystemId] = useState<Record<string, InvestigationStatus>>({})

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(getStorageKey(farmId))
      if (!raw) {
        setStatusBySystemId({})
        return
      }
      const parsed = JSON.parse(raw) as Record<string, InvestigationStatus>
      setStatusBySystemId(parsed ?? {})
    } catch {
      setStatusBySystemId({})
    }
  }, [farmId])

  const setStatus = (systemId: number, status: InvestigationStatus) => {
    setStatusBySystemId((current) => {
      const next = { ...current, [String(systemId)]: status }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(getStorageKey(farmId), JSON.stringify(next))
      }
      return next
    })
  }

  const counts = useMemo(() => {
    const next = {
      open: 0,
      monitoring: 0,
      resolved: 0,
      escalated: 0,
    }
    Object.values(statusBySystemId).forEach((status) => {
      next[status] += 1
    })
    return next
  }, [statusBySystemId])

  return {
    statusBySystemId,
    counts,
    getStatus(systemId: number) {
      return statusBySystemId[String(systemId)] ?? DEFAULT_STATUS
    },
    setStatus,
  }
}
