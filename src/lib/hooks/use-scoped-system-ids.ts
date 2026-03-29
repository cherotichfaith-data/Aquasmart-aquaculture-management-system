"use client"

import { useMemo } from "react"
import type { Enums } from "@/lib/types/database"
import { useSystemOptions } from "@/lib/hooks/use-options"
import { useBatchSystemIds } from "@/lib/hooks/use-reports"
import type { QueryResult } from "@/lib/supabase-client"
import type { Database } from "@/lib/types/database"

type Params = {
  farmId?: string | null
  selectedStage: Enums<"system_growth_stage"> | "all"
  selectedBatch: string
  selectedSystem: string
  enabled?: boolean
  initialSystemsData?: QueryResult<Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]>
  initialBatchSystemsData?: QueryResult<{ system_id: number }>
}

export function useScopedSystemIds(params: Params) {
  const selectedSystemId = params.selectedSystem !== "all" ? Number(params.selectedSystem) : undefined
  const hasSystem = Number.isFinite(selectedSystemId)
  const batchId = params.selectedBatch !== "all" ? Number(params.selectedBatch) : undefined

  const systemsQuery = useSystemOptions({
    farmId: params.farmId,
    stage: params.selectedStage,
    activeOnly: false,
    enabled: params.enabled,
    initialData: params.initialSystemsData,
  })

  const batchSystemsQuery = useBatchSystemIds({
    batchId: Number.isFinite(batchId) ? batchId : undefined,
    farmId: params.farmId,
    enabled: params.enabled,
    initialData: params.initialBatchSystemsData,
  })

  const hasScopeFilters = hasSystem || params.selectedStage !== "all" || params.selectedBatch !== "all"

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
    hasScopeFilters,
    batchId,
    scopedSystemIdList,
    scopedSystemIds,
    systemsQuery,
    batchSystemsQuery,
  }
}
