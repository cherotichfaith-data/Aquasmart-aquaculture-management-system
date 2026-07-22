import Dexie, { type Table } from "dexie"
import type { Database } from "@/lib/types/database"
import type { FeedingResponseLevel } from "@/lib/feeding-response"

export type SyncStatus = "pending" | "synced" | "conflict" | "failed"

/** Maximum number of consecutive failures before a record is marked 'failed'. */
export const MAX_SYNC_RETRIES = 5

type WaterQualityParameter = Database["public"]["Enums"]["water_quality_parameters"]
type StockingType = Database["public"]["Enums"]["type_of_stocking"]
type HarvestType = Database["public"]["Enums"]["type_of_harvest"]
type TransferType = Database["public"]["Enums"]["transfer_type"]

export type OfflineBaseRecord = {
  localId: string
  syncStatus: SyncStatus
  serverId?: number
  createdAtLocal: number
  /** Number of consecutive failed sync attempts. Used for exponential backoff. */
  retryCount?: number
  /** Timestamp (ms) before which the next sync attempt should not be made. */
  retryAfter?: number
}

export interface OfflineFeedingRecord extends OfflineBaseRecord {
  farmId?: string | null
  systemId: number
  batchId?: number | null
  date: string
  feedTypeId?: number | null
  feedingAmount: number
  feedingResponse?: FeedingResponseLevel | null
  notes?: string | null
}

export interface OfflineMortalityRecord extends OfflineBaseRecord {
  systemId: number
  farmId?: string | null
  batchId?: number | null
  date: string
  numberOfFishMortality: number
  totalWeightMortality?: number | null
  cause: string
  isMassMortality?: boolean | null
  notes?: string | null
}

export interface OfflineWaterQualityRecord extends OfflineBaseRecord {
  farmId?: string | null
  systemId: number
  date: string
  measuredAt: string
  time: string
  parameterName: WaterQualityParameter
  parameterValue: number
  waterDepth: number
  locationReference?: string | null
}

export interface OfflineSamplingRecord extends OfflineBaseRecord {
  farmId?: string | null
  systemId: number
  batchId?: number | null
  date: string
  numberOfFishSampling: number
  totalWeightSampling: number
  notes?: string | null
}

export interface OfflineStockingRecord extends OfflineBaseRecord {
  farmId?: string | null
  systemId: number
  batchId: number
  date: string
  numberOfFishStocking: number
  totalWeightStocking: number
  typeOfStocking: StockingType
  notes?: string | null
}

export interface OfflineHarvestRecord extends OfflineBaseRecord {
  farmId?: string | null
  systemId: number
  batchId?: number | null
  date: string
  numberOfFishHarvest: number
  totalWeightHarvest: number
  typeOfHarvest: HarvestType
}

export interface OfflineTransferRecord extends OfflineBaseRecord {
  farmId?: string | null
  originSystemId: number
  targetSystemId?: number | null
  externalTargetName?: string | null
  batchId?: number | null
  date: string
  numberOfFishTransfer: number
  totalWeightTransfer: number
  transferType: TransferType
  notes?: string | null
}

export type OfflineTableName =
  | "feeding"
  | "mortality"
  | "waterQuality"
  | "sampling"
  | "stocking"
  | "harvest"
  | "transfer"

export class AquaSmartOfflineDB extends Dexie {
  feeding!: Table<OfflineFeedingRecord, string>
  mortality!: Table<OfflineMortalityRecord, string>
  waterQuality!: Table<OfflineWaterQualityRecord, string>
  sampling!: Table<OfflineSamplingRecord, string>
  stocking!: Table<OfflineStockingRecord, string>
  harvest!: Table<OfflineHarvestRecord, string>
  transfer!: Table<OfflineTransferRecord, string>

  constructor() {
    super("aquasmart-offline")
    // v1 — original schema
    this.version(1).stores({
      feeding: "localId, syncStatus, systemId, createdAtLocal",
      mortality: "localId, syncStatus, systemId, createdAtLocal",
      waterQuality: "localId, syncStatus, systemId, createdAtLocal",
      sampling: "localId, syncStatus, systemId, createdAtLocal",
      stocking: "localId, syncStatus, systemId, createdAtLocal",
      harvest: "localId, syncStatus, systemId, createdAtLocal",
      transfer: "localId, syncStatus, originSystemId, createdAtLocal",
    })
    // v2 — add retryCount and retryAfter fields (non-indexed; schema string unchanged)
    this.version(2).stores({
      feeding: "localId, syncStatus, systemId, createdAtLocal",
      mortality: "localId, syncStatus, systemId, createdAtLocal",
      waterQuality: "localId, syncStatus, systemId, createdAtLocal",
      sampling: "localId, syncStatus, systemId, createdAtLocal",
      stocking: "localId, syncStatus, systemId, createdAtLocal",
      harvest: "localId, syncStatus, systemId, createdAtLocal",
      transfer: "localId, syncStatus, originSystemId, createdAtLocal",
    })
  }
}

export const offlineDB = new AquaSmartOfflineDB()
