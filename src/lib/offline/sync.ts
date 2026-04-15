import { offlineDB, type OfflineTableName } from "@/lib/offline/db"

type SyncResult = {
  pushed: number
  errors: number
  conflicts: number
}

type PushStatus = "pushed" | "conflict" | "error" | "missing"

type PushRecordResult = {
  status: PushStatus
  response?: unknown
}

type SyncConfig = {
  apiPath: string
  buildBody: (record: any) => unknown
}

const syncConfigs: Record<OfflineTableName, SyncConfig> = {
  feeding: {
    apiPath: "/api/feeding/record",
    buildBody: (record) => ({
      system_id: record.systemId,
      batch_id: record.batchId ?? null,
      date: record.date,
      feed_type_id: record.feedTypeId,
      feeding_amount: record.feedingAmount,
      feeding_response: record.feedingResponse,
      notes: record.notes ?? null,
      local_id: record.localId,
    }),
  },
  mortality: {
    apiPath: "/api/mortality/record",
    buildBody: (record) => ({
      farm_id: record.farmId ?? null,
      system_id: record.systemId,
      batch_id: record.batchId ?? null,
      date: record.date,
      number_of_fish_mortality: record.numberOfFishMortality,
      avg_dead_wt_g: record.avgDeadWtG ?? null,
      cause: record.cause,
      is_mass_mortality: record.isMassMortality ?? null,
      notes: record.notes ?? null,
      local_id: record.localId,
    }),
  },
  waterQuality: {
    apiPath: "/api/water-quality/record",
    buildBody: (record) => [
      {
        system_id: record.systemId,
        date: record.date,
        measured_at: record.measuredAt,
        time: record.time,
        parameter_name: record.parameterName,
        parameter_value: record.parameterValue,
        water_depth: record.waterDepth,
        location_reference: record.locationReference ?? null,
        local_id: record.localId,
      },
    ],
  },
  sampling: {
    apiPath: "/api/sampling/record",
    buildBody: (record) => ({
      system_id: record.systemId,
      batch_id: record.batchId ?? null,
      date: record.date,
      number_of_fish_sampling: record.numberOfFishSampling,
      total_weight_sampling: record.totalWeightSampling,
      abw: record.abw,
      notes: record.notes ?? null,
      local_id: record.localId,
    }),
  },
  stocking: {
    apiPath: "/api/stocking/record",
    buildBody: (record) => ({
      system_id: record.systemId,
      batch_id: record.batchId,
      date: record.date,
      number_of_fish_stocking: record.numberOfFishStocking,
      total_weight_stocking: record.totalWeightStocking,
      abw: record.abw,
      type_of_stocking: record.typeOfStocking,
      notes: record.notes ?? null,
      local_id: record.localId,
    }),
  },
  harvest: {
    apiPath: "/api/harvest/record",
    buildBody: (record) => ({
      system_id: record.systemId,
      batch_id: record.batchId ?? null,
      date: record.date,
      number_of_fish_harvest: record.numberOfFishHarvest,
      total_weight_harvest: record.totalWeightHarvest,
      abw: record.abw,
      type_of_harvest: record.typeOfHarvest,
      local_id: record.localId,
    }),
  },
  transfer: {
    apiPath: "/api/transfer/record",
    buildBody: (record) => ({
      origin_system_id: record.originSystemId,
      target_system_id: record.targetSystemId ?? null,
      external_target_name: record.externalTargetName ?? null,
      batch_id: record.batchId ?? null,
      date: record.date,
      number_of_fish_transfer: record.numberOfFishTransfer,
      total_weight_transfer: record.totalWeightTransfer,
      abw: record.abw ?? null,
      transfer_type: record.transferType,
      notes: record.notes ?? null,
      local_id: record.localId,
    }),
  },
}

function extractServerId(responseBody: unknown): number | undefined {
  if (!responseBody || typeof responseBody !== "object") return undefined
  const data = (responseBody as { data?: unknown }).data
  if (Array.isArray(data)) {
    const firstRow = data[0]
    if (firstRow && typeof firstRow === "object" && typeof (firstRow as { id?: unknown }).id === "number") {
      return (firstRow as { id: number }).id
    }
    return undefined
  }
  if (data && typeof data === "object" && typeof (data as { id?: unknown }).id === "number") {
    return (data as { id: number }).id
  }
  return undefined
}

export async function pushPendingRecordById(tableName: OfflineTableName, localId: string): Promise<PushRecordResult> {
  const table = offlineDB.table<any, string>(tableName)
  const record = await table.get(localId)
  if (!record || record.syncStatus !== "pending") {
    return { status: "missing" }
  }

  const config = syncConfigs[tableName]

  try {
    const response = await fetch(config.apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config.buildBody(record)),
    })

    const body = await response.json().catch(() => null)

    if (response.ok) {
      await table.update(localId, {
        syncStatus: "synced",
        serverId: extractServerId(body),
      })
      return { status: "pushed", response: body }
    }

    if (response.status === 409) {
      await table.update(localId, { syncStatus: "synced" })
      return { status: "conflict", response: body }
    }

    return { status: "error", response: body }
  } catch {
    return { status: "error" }
  }
}

async function pushTable(tableName: OfflineTableName): Promise<SyncResult> {
  const table = offlineDB.table<any, string>(tableName)
  const pendingRecords = await table.where("syncStatus").equals("pending").toArray()

  let pushed = 0
  let errors = 0
  let conflicts = 0

  for (const record of pendingRecords) {
    const result = await pushPendingRecordById(tableName, record.localId)
    if (result.status === "pushed") pushed += 1
    else if (result.status === "conflict") conflicts += 1
    else if (result.status === "error") errors += 1
  }

  return { pushed, errors, conflicts }
}

export async function runSync(): Promise<SyncResult> {
  const tableNames: OfflineTableName[] = [
    "feeding",
    "mortality",
    "waterQuality",
    "sampling",
    "stocking",
    "harvest",
    "transfer",
  ]

  const results = await Promise.all(tableNames.map((tableName) => pushTable(tableName)))

  return results.reduce<SyncResult>(
    (aggregate, result) => ({
      pushed: aggregate.pushed + result.pushed,
      errors: aggregate.errors + result.errors,
      conflicts: aggregate.conflicts + result.conflicts,
    }),
    { pushed: 0, errors: 0, conflicts: 0 },
  )
}

export async function getPendingCount(): Promise<number> {
  const tableNames: OfflineTableName[] = [
    "feeding",
    "mortality",
    "waterQuality",
    "sampling",
    "stocking",
    "harvest",
    "transfer",
  ]

  const counts = await Promise.all(
    tableNames.map((tableName) => offlineDB.table(tableName).where("syncStatus").equals("pending").count()),
  )

  return counts.reduce((total, count) => total + count, 0)
}
