import Dexie, { type Table } from "dexie"
import type { Database } from "@/lib/types/database"

export type SyncStatus = "pending" | "synced" | "conflict"

type FeedingResponse = Database["public"]["Enums"]["feeding_response"]
type WaterQualityParameter = Database["public"]["Enums"]["water_quality_parameters"]
type StockingType = Database["public"]["Enums"]["type_of_stocking"]
type HarvestType = Database["public"]["Enums"]["type_of_harvest"]
type TransferType = Database["public"]["Enums"]["transfer_type"]

type OfflineBaseRecord = {
  localId: string
  syncStatus: SyncStatus
  serverId?: number
  createdAtLocal: number
}

export interface OfflineFeedingRecord extends OfflineBaseRecord {
  systemId: number
  batchId?: number | null
  date: string
  feedTypeId: number
  feedingAmount: number
  feedingResponse: FeedingResponse
  notes?: string | null
}

export interface OfflineMortalityRecord extends OfflineBaseRecord {
  systemId: number
  farmId?: string | null
  batchId?: number | null
  date: string
  numberOfFishMortality: number
  avgDeadWtG?: number | null
  cause: string
  isMassMortality?: boolean | null
  notes?: string | null
}

export interface OfflineWaterQualityRecord extends OfflineBaseRecord {
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
  systemId: number
  batchId?: number | null
  date: string
  numberOfFishSampling: number
  totalWeightSampling: number
  abw: number
  notes?: string | null
}

export interface OfflineStockingRecord extends OfflineBaseRecord {
  systemId: number
  batchId: number
  date: string
  numberOfFishStocking: number
  totalWeightStocking: number
  abw: number
  typeOfStocking: StockingType
  notes?: string | null
}

export interface OfflineHarvestRecord extends OfflineBaseRecord {
  systemId: number
  batchId?: number | null
  date: string
  numberOfFishHarvest: number
  totalWeightHarvest: number
  abw: number
  typeOfHarvest: HarvestType
}

export interface OfflineTransferRecord extends OfflineBaseRecord {
  originSystemId: number
  targetSystemId?: number | null
  externalTargetName?: string | null
  batchId?: number | null
  date: string
  numberOfFishTransfer: number
  totalWeightTransfer: number
  abw?: number | null
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
    this.version(1).stores({
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
