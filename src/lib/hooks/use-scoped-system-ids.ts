"use client"

import { useMemo } from "react"
import type { Enums } from "@/lib/types/database"
import { useSystemOptions } from "@/lib/hooks/use-options"
import { useBatchSystemIds } from "@/lib/hooks/use-reports"

type Params = {
  farmId?: string | null
  selectedStage: Enums<"system_growth_stage"> | "all"
  selectedBatch: string
  selectedSystem: string
  enabled?: boolean
}

export function useScopedSystemIds(params: Params) {
  const selectedSystemId = params.selectedSystem !== "all" ? Number(params.selectedSystem) : undefined
  const hasSystem = Number.isFinite(selectedSystemId)
  const batchId = params.selectedBatch !== "all" ? Number(params.selectedBatch) : undefined

  const systemsQuery = useSystemOptions({
    farmId: params.farmId,
    stage: params.selectedStage,
    activeOnly: true,
    enabled: params.enabled,
  })

  const batchSystemsQuery = useBatchSystemIds({
    batchId: Number.isFinite(batchId) ? batchId : undefined,
    farmId: params.farmId,
    enabled: params.enabled,
  })

  const scopedSystemIdList = useMemo(() => {
    const stageIds =
      systemsQuery.data?.status === "success"
        ? systemsQuery.data.data.map((row) => row.id).filter((id): id is number => typeof id === "number")
        : []

    const batchIds =
      batchSystemsQuery.data?.status === "success"
        ? batchSystemsQuery.data.data.map((row) => row.system_id)
        : []

    if (hasSystem) {
      return stageIds.includes(selectedSystemId as number) ? [selectedSystemId as number] : stageIds
    }
    if (params.selectedBatch === "all") return stageIds
    const stageSet = new Set(stageIds)
    return batchIds.filter((id) => stageSet.has(id))
  }, [batchSystemsQuery.data, hasSystem, params.selectedBatch, selectedSystemId, systemsQuery.data])

  const scopedSystemIds = useMemo(() => new Set(scopedSystemIdList), [scopedSystemIdList])
  const resolvedSelectedSystemId = useMemo(() => {
    if (!hasSystem) return undefined
    return scopedSystemIdList.length === 1 && scopedSystemIdList[0] === selectedSystemId
      ? selectedSystemId
      : undefined
  }, [hasSystem, scopedSystemIdList, selectedSystemId])
  const hasScopeFilters = Boolean(resolvedSelectedSystemId) || params.selectedStage !== "all" || params.selectedBatch !== "all"

  return {
    selectedSystemId: resolvedSelectedSystemId,
    hasSystem: Boolean(resolvedSelectedSystemId),
    hasScopeFilters,
    batchId,
    scopedSystemIdList,
    scopedSystemIds,
    systemsQuery,
    batchSystemsQuery,
  }
}
