import type { Table } from "dexie"
import {
  offlineDB,
  MAX_SYNC_RETRIES,
  type OfflineBaseRecord,
  type OfflineFeedingRecord,
  type OfflineHarvestRecord,
  type OfflineMortalityRecord,
  type OfflineSamplingRecord,
  type OfflineStockingRecord,
  type OfflineTableName,
  type OfflineTransferRecord,
  type OfflineWaterQualityRecord,
} from "@/lib/offline/db"

/**
 * Exponential backoff delay (ms) for the given retry count.
 * Retries: 1→30s, 2→60s, 3→2min, 4→4min, 5→8min (capped at 8 minutes).
 */
function backoffDelayMs(retryCount: number): number {
  return Math.min(30_000 * Math.pow(2, retryCount - 1), 8 * 60_000)
}

type SyncResult = {
  pushed: number
  errors: number
  conflicts: number
}

type PushStatus = "pushed" | "conflict" | "error" | "missing"

type PushRecordResult = {
  status: PushStatus
  response?: unknown
  errorMessage?: string
}

type OfflineRecordByTable = {
  feeding: OfflineFeedingRecord
  mortality: OfflineMortalityRecord
  sampling: OfflineSamplingRecord
  waterQuality: OfflineWaterQualityRecord
  harvest: OfflineHarvestRecord
  transfer: OfflineTransferRecord
  stocking: OfflineStockingRecord
}

type SyncConfig<RecordType> = {
  apiPath: string
  buildBody: (record: RecordType) => unknown
}

/**
 * Updates the shared sync-bookkeeping fields (syncStatus/retryCount/retryAfter/serverId)
 * on a table whose record type is generic over `OfflineTableName`. Dexie's `UpdateSpec<T>`
 * can't be checked against a generic indexed-access type (`OfflineRecordByTable[Key]`), even
 * though every concrete record type extends `OfflineBaseRecord` and therefore has these
 * fields — so this narrows the table handle to its common base type for the update call only.
 */
function updateSyncFields<Key extends OfflineTableName>(
  table: Table<OfflineRecordByTable[Key], string>,
  localId: string,
  changes: Partial<OfflineBaseRecord>,
) {
  return (table as unknown as Table<OfflineBaseRecord, string>).update(localId, changes)
}

export const syncTargets = {
  feeding: "/api/feeding/record",
  mortality: "/api/mortality/record",
  sampling: "/api/sampling/record",
  waterQuality: "/api/water-quality/record",
  harvest: "/api/harvest/record",
  transfer: "/api/transfer/record",
  stocking: "/api/stocking/record",
} satisfies Record<OfflineTableName, string>

const syncConfigs: { [Key in OfflineTableName]: SyncConfig<OfflineRecordByTable[Key]> } = {
  feeding: {
    apiPath: syncTargets.feeding,
    buildBody: (record) => ({
      farm_id: record.farmId ?? null,
      system_id: record.systemId,
      batch_id: record.batchId ?? null,
      date: record.date,
      feed_type_id: record.feedTypeId ?? null,
      feeding_amount: record.feedingAmount,
      feeding_response: record.feedingResponse ?? null,
      notes: record.notes ?? null,
      local_id: record.localId,
    }),
  },
  mortality: {
    apiPath: syncTargets.mortality,
    buildBody: (record) => ({
      farm_id: record.farmId ?? null,
      system_id: record.systemId,
      batch_id: record.batchId ?? null,
      date: record.date,
      number_of_fish_mortality: record.numberOfFishMortality,
      total_weight_mortality: record.totalWeightMortality ?? null,
      cause: record.cause,
      notes: record.notes ?? null,
      local_id: record.localId,
    }),
  },
  waterQuality: {
    apiPath: syncTargets.waterQuality,
    buildBody: (record) => [
      {
        farm_id: record.farmId ?? null,
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
    apiPath: syncTargets.sampling,
    buildBody: (record) => ({
      farm_id: record.farmId ?? null,
      system_id: record.systemId,
      batch_id: record.batchId ?? null,
      date: record.date,
      number_of_fish_sampling: record.numberOfFishSampling,
      total_weight_sampling: record.totalWeightSampling,
      notes: record.notes ?? null,
      local_id: record.localId,
    }),
  },
  stocking: {
    apiPath: syncTargets.stocking,
    buildBody: (record) => ({
      farm_id: record.farmId ?? null,
      system_id: record.systemId,
      batch_id: record.batchId,
      date: record.date,
      number_of_fish_stocking: record.numberOfFishStocking,
      total_weight_stocking: record.totalWeightStocking,
      type_of_stocking: record.typeOfStocking,
      notes: record.notes ?? null,
      local_id: record.localId,
    }),
  },
  harvest: {
    apiPath: syncTargets.harvest,
    buildBody: (record) => ({
      farm_id: record.farmId ?? null,
      system_id: record.systemId,
      batch_id: record.batchId ?? null,
      date: record.date,
      number_of_fish_harvest: record.numberOfFishHarvest,
      total_weight_harvest: record.totalWeightHarvest,
      type_of_harvest: record.typeOfHarvest,
      local_id: record.localId,
    }),
  },
  transfer: {
    apiPath: syncTargets.transfer,
    buildBody: (record) => ({
      farm_id: record.farmId ?? null,
      origin_system_id: record.originSystemId,
      target_system_id: record.targetSystemId ?? null,
      external_target_name: record.externalTargetName ?? null,
      batch_id: record.batchId ?? null,
      date: record.date,
      number_of_fish_transfer: record.numberOfFishTransfer,
      total_weight_transfer: record.totalWeightTransfer,
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

function extractResponseError(responseBody: unknown, fallback: string): string {
  if (responseBody && typeof responseBody === "object") {
    const maybeError = (responseBody as { error?: unknown; message?: unknown }).error
    const maybeMessage = (responseBody as { error?: unknown; message?: unknown }).message
    if (typeof maybeError === "string" && maybeError.trim()) return maybeError
    if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage
  }
  return fallback
}

export async function pushRecordDirect<Key extends OfflineTableName>(
  tableName: Key,
  record: OfflineRecordByTable[Key],
): Promise<PushRecordResult> {
  const config = syncConfigs[tableName]
  const response = await fetch(config.apiPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config.buildBody(record)),
  })

  const body = await response.json().catch(() => null)

  if (response.ok) {
    return { status: "pushed", response: body }
  }

  if (response.status === 409) {
    return { status: "conflict", response: body }
  }

  return {
    status: "error",
    response: body,
    errorMessage: extractResponseError(body, "Unable to save this record."),
  }
}

export async function pushPendingRecordById<Key extends OfflineTableName>(
  tableName: Key,
  localId: string,
): Promise<PushRecordResult> {
  const table = offlineDB.table<OfflineRecordByTable[Key], string>(tableName)
  const record = await table.get(localId)
  if (!record || record.syncStatus !== "pending") {
    return { status: "missing" }
  }

  // Respect exponential backoff: skip records that are cooling down after a failure
  const now = Date.now()
  if (record.retryAfter && record.retryAfter > now) {
    return { status: "error" }
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
      await updateSyncFields(table, localId, {
        syncStatus: "synced",
        serverId: extractServerId(body),
        retryCount: 0,
        retryAfter: undefined,
      })
      return { status: "pushed", response: body }
    }

    if (response.status === 409) {
      await updateSyncFields(table, localId, { syncStatus: "synced", retryCount: 0, retryAfter: undefined })
      return { status: "conflict", response: body }
    }

    // Server error: apply exponential backoff and mark as failed after MAX_SYNC_RETRIES
    const nextRetryCount = (record.retryCount ?? 0) + 1
    if (nextRetryCount >= MAX_SYNC_RETRIES) {
      await updateSyncFields(table, localId, {
        syncStatus: "failed",
        retryCount: nextRetryCount,
        retryAfter: undefined,
      })
    } else {
      await updateSyncFields(table, localId, {
        retryCount: nextRetryCount,
        retryAfter: now + backoffDelayMs(nextRetryCount),
      })
    }
    return { status: "error", response: body }
  } catch {
    // Network error: apply backoff but don't increment retryCount as it might be offline
    const nextRetryCount = (record.retryCount ?? 0) + 1
    await updateSyncFields(table, localId, {
      retryCount: nextRetryCount,
      retryAfter: now + backoffDelayMs(nextRetryCount),
    })
    return { status: "error" }
  }
}

async function pushTable<Key extends OfflineTableName>(tableName: Key): Promise<SyncResult> {
  const table = offlineDB.table<OfflineRecordByTable[Key], string>(tableName)
  // Only attempt records that are still 'pending' (not 'failed', 'synced', or 'conflict')
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
