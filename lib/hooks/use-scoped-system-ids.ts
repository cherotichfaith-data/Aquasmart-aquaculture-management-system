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
}

export function useScopedSystemIds(params: Params) {
  const selectedSystemId = params.selectedSystem !== "all" ? Number(params.selectedSystem) : undefined
  const hasSystem = Number.isFinite(selectedSystemId)
  const batchId = params.selectedBatch !== "all" ? Number(params.selectedBatch) : undefined

  const systemsQuery = useSystemOptions({
    farmId: params.farmId,
    stage: params.selectedStage,
    activeOnly: true,
  })

  const batchSystemsQuery = useBatchSystemIds({
    batchId: Number.isFinite(batchId) ? batchId : undefined,
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

    if (hasSystem) return [selectedSystemId as number]
    if (params.selectedBatch === "all") return stageIds
    const stageSet = new Set(stageIds)
    return batchIds.filter((id) => stageSet.has(id))
  }, [batchSystemsQuery.data, hasSystem, params.selectedBatch, selectedSystemId, systemsQuery.data])

  const scopedSystemIds = useMemo(() => new Set(scopedSystemIdList), [scopedSystemIdList])

  return {
    selectedSystemId,
    hasSystem,
    batchId,
    scopedSystemIdList,
    scopedSystemIds,
    systemsQuery,
    batchSystemsQuery,
  }
}
