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
type SystemType = Database["public"]["Enums"]["system_type"]
type SystemGrowthStage = Database["public"]["Enums"]["system_growth_stage"]

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

export interface OfflineFeedInventoryRecord extends OfflineBaseRecord {
  farmId?: string | null
  inventoryDate: string
  inventoryTime?: string | null
  feedTypeId: number
  bagWeight: number
  amountOfBags: number
  openedBags?: number | null
  comments?: string | null
}

export interface OfflineSystemRecord extends OfflineBaseRecord {
  farmId?: string | null
  commissionedAt?: string | null
  unit?: string | null
  name: string
  type: SystemType
  growthStage: SystemGrowthStage
  volume?: number | null
  depth?: number | null
}

export type OfflineTableName =
  | "feeding"
  | "mortality"
  | "waterQuality"
  | "sampling"
  | "stocking"
  | "harvest"
  | "transfer"
  | "feedInventory"
  | "system"

/**
 * Read-through cache for dropdown/reference data (systems, batches, feed types) so
 * data-entry forms keep working after days offline, instead of showing whatever the
 * last server-rendered payload happened to contain. Distinct from the offline write
 * queue above -- this table is never synced, just refreshed opportunistically whenever
 * live data comes through.
 */
export type ReferenceCacheKind = "systems" | "batches" | "feeds"

export interface ReferenceCacheEntry {
  /** `${kind}:${farmId}` */
  key: string
  kind: ReferenceCacheKind
  farmId: string
  data: unknown[]
  cachedAt: number
}

export class Samaki360OfflineDB extends Dexie {
  feeding!: Table<OfflineFeedingRecord, string>
  mortality!: Table<OfflineMortalityRecord, string>
  waterQuality!: Table<OfflineWaterQualityRecord, string>
  sampling!: Table<OfflineSamplingRecord, string>
  stocking!: Table<OfflineStockingRecord, string>
  harvest!: Table<OfflineHarvestRecord, string>
  transfer!: Table<OfflineTransferRecord, string>
  feedInventory!: Table<OfflineFeedInventoryRecord, string>
  system!: Table<OfflineSystemRecord, string>
  referenceCache!: Table<ReferenceCacheEntry, string>

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
    // v3 — add feedInventory and system tables (farm-scoped, no systemId index)
    this.version(3).stores({
      feeding: "localId, syncStatus, systemId, createdAtLocal",
      mortality: "localId, syncStatus, systemId, createdAtLocal",
      waterQuality: "localId, syncStatus, systemId, createdAtLocal",
      sampling: "localId, syncStatus, systemId, createdAtLocal",
      stocking: "localId, syncStatus, systemId, createdAtLocal",
      harvest: "localId, syncStatus, systemId, createdAtLocal",
      transfer: "localId, syncStatus, originSystemId, createdAtLocal",
      feedInventory: "localId, syncStatus, createdAtLocal",
      system: "localId, syncStatus, createdAtLocal",
    })
    // v4 — add referenceCache table for offline dropdown/lookup data
    this.version(4).stores({
      feeding: "localId, syncStatus, systemId, createdAtLocal",
      mortality: "localId, syncStatus, systemId, createdAtLocal",
      waterQuality: "localId, syncStatus, systemId, createdAtLocal",
      sampling: "localId, syncStatus, systemId, createdAtLocal",
      stocking: "localId, syncStatus, systemId, createdAtLocal",
      harvest: "localId, syncStatus, systemId, createdAtLocal",
      transfer: "localId, syncStatus, originSystemId, createdAtLocal",
      feedInventory: "localId, syncStatus, createdAtLocal",
      system: "localId, syncStatus, createdAtLocal",
      referenceCache: "key, kind, farmId",
    })
  }
}

export const offlineDB = new Samaki360OfflineDB()
