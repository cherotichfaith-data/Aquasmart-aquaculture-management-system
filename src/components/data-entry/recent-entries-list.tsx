"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { format } from "date-fns"
import { Clock3, Loader2 } from "lucide-react"
import { Badge } from "@/components/app-ui/badge"
import { offlineDB } from "@/lib/offline/db"
import { createSystemLabelResolver, type SystemOption } from "@/lib/system-options"
import type { Tables } from "@/lib/types/database"

type PendingMeta = {
  status?: "pending"
  localId?: string
}

type SystemEntryRow = Pick<Tables<"system">, "id" | "commissioned_at" | "name" | "type" | "growth_stage" | "created_at"> & {
  unit?: string | null
} & PendingMeta

type MortalityRow = Pick<Tables<"fish_mortality">, "id" | "date" | "system_id" | "number_of_fish_mortality" | "created_at"> & PendingMeta
type FeedingRow = Omit<
  Pick<Tables<"feeding_record">, "id" | "date" | "system_id" | "feed_type_id" | "feeding_amount" | "created_at">,
  "feed_type_id"
> & {
  feed_type_id: number | null
} & PendingMeta
type SamplingRow = Omit<
  Pick<Tables<"fish_sampling_weight">, "id" | "date" | "system_id" | "number_of_fish_sampling" | "abw" | "created_at">,
  "abw"
> & {
  abw: number | null
} & PendingMeta
type TransferRow = Pick<Tables<"fish_transfer">, "id" | "date" | "origin_system_id" | "target_system_id" | "external_target_name" | "number_of_fish_transfer" | "created_at"> & PendingMeta
type HarvestRow = Pick<Tables<"fish_harvest">, "id" | "date" | "system_id" | "type_of_harvest" | "total_weight_harvest" | "created_at"> & PendingMeta
type WaterQualityRow = Pick<Tables<"water_quality_measurement">, "id" | "date" | "system_id" | "parameter_name" | "parameter_value" | "created_at"> & PendingMeta
type FeedInventoryRow = Pick<
  Tables<"feed_inventory">,
  | "id"
  | "inventory_date"
  | "feed_type_id"
  | "bag_weight"
  | "amount_of_bags"
  | "opened_bags"
  | "snapshot_kg"
  | "created_at"
> & {
  feed_type_label?: string | null
} &
  PendingMeta
type StockingRow = Pick<Tables<"fish_stocking">, "id" | "date" | "system_id" | "number_of_fish_stocking" | "type_of_stocking" | "created_at"> & PendingMeta

type RecentEntriesListProps =
  | { type: "mortality"; data: MortalityRow[]; systems: SystemOption[] }
  | { type: "feeding"; data: FeedingRow[]; systems: SystemOption[] }
  | { type: "sampling"; data: SamplingRow[]; systems: SystemOption[] }
  | { type: "transfer"; data: TransferRow[]; systems: SystemOption[] }
  | { type: "harvest"; data: HarvestRow[]; systems: SystemOption[] }
  | { type: "water_quality"; data: WaterQualityRow[]; systems: SystemOption[] }
  | { type: "feed_inventory"; data: FeedInventoryRow[]; systems: SystemOption[] }
  | { type: "stocking"; data: StockingRow[]; systems: SystemOption[] }
  | { type: "system"; data: SystemEntryRow[]; systems: SystemOption[] }

type RecentCard = {
  key: string
  title: string
  subtitle: string
  meta: string
  pending?: boolean
  details: Array<{ label: string; value: string }>
}

const formatCreatedAt = (createdAt: string | null) =>
  createdAt ? format(new Date(createdAt), "MMM d, HH:mm") : "-"

const formatDate = (date: string | null) => date ?? "N/A"

const PendingIcon = ({ pending }: { pending?: boolean }) =>
  pending ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : null

function toCreatedAt(createdAtLocal: number) {
  return new Date(createdAtLocal).toISOString()
}

function usePendingOfflineEntries(type: RecentEntriesListProps["type"]) {
  return (
    useLiveQuery(async () => {
      switch (type) {
        case "feeding": {
          const rows = await offlineDB.feeding.where("syncStatus").equals("pending").toArray()
          return rows
            .sort((left, right) => right.createdAtLocal - left.createdAtLocal)
            .map<FeedingRow>((row) => ({
              id: 0,
              localId: row.localId,
              status: "pending",
              date: row.date,
              system_id: row.systemId,
              feed_type_id: row.feedTypeId ?? null,
              feeding_amount: row.feedingAmount,
              created_at: toCreatedAt(row.createdAtLocal),
            }))
        }
        case "mortality": {
          const rows = await offlineDB.mortality.where("syncStatus").equals("pending").toArray()
          return rows
            .sort((left, right) => right.createdAtLocal - left.createdAtLocal)
            .map<MortalityRow>((row) => ({
              id: 0,
              localId: row.localId,
              status: "pending",
              date: row.date,
              system_id: row.systemId,
              number_of_fish_mortality: row.numberOfFishMortality,
              created_at: toCreatedAt(row.createdAtLocal),
            }))
        }
        case "sampling": {
          const rows = await offlineDB.sampling.where("syncStatus").equals("pending").toArray()
          return rows
            .sort((left, right) => right.createdAtLocal - left.createdAtLocal)
            .map<SamplingRow>((row) => ({
              id: 0,
              localId: row.localId,
              status: "pending",
              date: row.date,
              system_id: row.systemId,
              number_of_fish_sampling: row.numberOfFishSampling,
              abw: null,
              created_at: toCreatedAt(row.createdAtLocal),
            }))
        }
        case "transfer": {
          const rows = await offlineDB.transfer.where("syncStatus").equals("pending").toArray()
          return rows
            .sort((left, right) => right.createdAtLocal - left.createdAtLocal)
            .map<TransferRow>((row) => ({
              id: 0,
              localId: row.localId,
              status: "pending",
              date: row.date,
              origin_system_id: row.originSystemId,
              target_system_id: row.targetSystemId ?? row.originSystemId,
              external_target_name: row.externalTargetName ?? null,
              number_of_fish_transfer: row.numberOfFishTransfer,
              created_at: toCreatedAt(row.createdAtLocal),
            }))
        }
        case "harvest": {
          const rows = await offlineDB.harvest.where("syncStatus").equals("pending").toArray()
          return rows
            .sort((left, right) => right.createdAtLocal - left.createdAtLocal)
            .map<HarvestRow>((row) => ({
              id: 0,
              localId: row.localId,
              status: "pending",
              date: row.date,
              system_id: row.systemId,
              type_of_harvest: row.typeOfHarvest,
              total_weight_harvest: row.totalWeightHarvest,
              created_at: toCreatedAt(row.createdAtLocal),
            }))
        }
        case "water_quality": {
          const rows = await offlineDB.waterQuality.where("syncStatus").equals("pending").toArray()
          return rows
            .sort((left, right) => right.createdAtLocal - left.createdAtLocal)
            .map<WaterQualityRow>((row) => ({
              id: 0,
              localId: row.localId,
              status: "pending",
              date: row.date,
              system_id: row.systemId,
              parameter_name: row.parameterName,
              parameter_value: row.parameterValue,
              created_at: toCreatedAt(row.createdAtLocal),
            }))
        }
        case "stocking": {
          const rows = await offlineDB.stocking.where("syncStatus").equals("pending").toArray()
          return rows
            .sort((left, right) => right.createdAtLocal - left.createdAtLocal)
            .map<StockingRow>((row) => ({
              id: 0,
              localId: row.localId,
              status: "pending",
              date: row.date,
              system_id: row.systemId,
              number_of_fish_stocking: row.numberOfFishStocking,
              type_of_stocking: row.typeOfStocking,
              created_at: toCreatedAt(row.createdAtLocal),
            }))
        }
        default:
          return []
      }
    }, [type]) ?? []
  )
}

function mergeRecentEntriesByPrimaryDate<T extends { created_at: string | null; status?: "pending" }>(
  serverRows: T[],
  pendingRows: T[],
  getPrimaryDate: (row: T) => string | null | undefined,
) {
  const hasLivePendingRows = serverRows.some((row) => row.status === "pending")
  const combined = hasLivePendingRows ? serverRows : [...pendingRows, ...serverRows]

  return [...combined]
    .sort((left, right) => {
      const dateCompare = String(getPrimaryDate(right) ?? "").localeCompare(String(getPrimaryDate(left) ?? ""))
      if (dateCompare !== 0) return dateCompare
      return new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime()
    })
    .slice(0, 5)
}

function cageDetail(formatSystemName: (systemId: number | null | undefined) => string, systemId: number | null | undefined) {
  return { label: "Cage", value: formatSystemName(systemId) }
}

function EntriesSection({
  cards,
  pendingCount,
}: {
  cards: RecentCard[]
  pendingCount: number
}) {
  return (
    <div className="data-entry-recent-panel">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Recent Entries</h3>
          <p className="text-xs text-muted-foreground">Latest saved records for this entry type.</p>
        </div>
        {pendingCount > 0 ? (
          <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
              <Clock3 className="h-3 w-3" />
              {pendingCount} queued
          </Badge>
        ) : null}
      </div>

      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-background/70 px-3 py-4 text-sm text-muted-foreground">
          No recent entries found.
        </div>
      ) : (
        <div className="data-entry-recent-list">
          {cards.map((card) => (
            <article key={card.key} className={`data-entry-recent-item ${card.pending ? "opacity-70" : ""}`}>
              <div className="data-entry-recent-item-header">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <PendingIcon pending={card.pending} />
                    <h4 className="data-entry-recent-item-title">{card.title}</h4>
                  </div>
                  <p className="data-entry-recent-item-subtitle">{card.subtitle}</p>
                </div>
                <span className="data-entry-recent-meta">{card.meta}</span>
              </div>
              <div className="data-entry-recent-grid">
                {card.details.map((detail) => (
                  <div key={`${card.key}-${detail.label}`} className="data-entry-recent-detail">
                    <span className="data-entry-recent-detail-label">{detail.label}</span>
                    <span className="data-entry-recent-detail-value">{detail.value}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export function RecentEntriesList(props: RecentEntriesListProps) {
  const { data, type, systems } = props
  const pendingEntries = usePendingOfflineEntries(type)
  const formatSystemName = createSystemLabelResolver(systems)

  let cards: RecentCard[] = []
  let pendingCount = 0

  if (type === "mortality") {
    const rows = mergeRecentEntriesByPrimaryDate(data, pendingEntries as MortalityRow[], (row) => row.date)
    pendingCount = (pendingEntries as MortalityRow[]).length
    cards = rows.map((row, index) => ({
      key: String(row.localId ?? row.id ?? index),
      title: formatSystemName(row.system_id),
      subtitle: formatDate(row.date),
      meta: formatCreatedAt(row.created_at),
      pending: row.status === "pending",
      details: [
        cageDetail(formatSystemName, row.system_id),
        { label: "Dead Fish", value: String(row.number_of_fish_mortality) },
      ],
    }))
  } else if (type === "feeding") {
    const rows = mergeRecentEntriesByPrimaryDate(data, pendingEntries as FeedingRow[], (row) => row.date)
    pendingCount = (pendingEntries as FeedingRow[]).length
    cards = rows.map((row, index) => ({
      key: String(row.localId ?? row.id ?? index),
      title: formatSystemName(row.system_id),
      subtitle: formatDate(row.date),
      meta: formatCreatedAt(row.created_at),
      pending: row.status === "pending",
      details: [
        cageDetail(formatSystemName, row.system_id),
        { label: "Feed Type", value: String(row.feed_type_id) },
        { label: "Amount", value: `${row.feeding_amount} kg` },
      ],
    }))
  } else if (type === "sampling") {
    const rows = mergeRecentEntriesByPrimaryDate(data, pendingEntries as SamplingRow[], (row) => row.date)
    pendingCount = (pendingEntries as SamplingRow[]).length
    cards = rows.map((row, index) => ({
      key: String(row.localId ?? row.id ?? index),
      title: formatSystemName(row.system_id),
      subtitle: formatDate(row.date),
      meta: formatCreatedAt(row.created_at),
      pending: row.status === "pending",
      details: [
        cageDetail(formatSystemName, row.system_id),
        { label: "Sampled", value: String(row.number_of_fish_sampling) },
        { label: "ABW", value: row.abw != null ? `${row.abw} g` : "-" },
      ],
    }))
  } else if (type === "transfer") {
    const rows = mergeRecentEntriesByPrimaryDate(data, pendingEntries as TransferRow[], (row) => row.date)
    pendingCount = (pendingEntries as TransferRow[]).length
    cards = rows.map((row, index) => ({
      key: String(row.localId ?? row.id ?? index),
      title: formatSystemName(row.origin_system_id),
      subtitle: formatDate(row.date),
      meta: formatCreatedAt(row.created_at),
      pending: row.status === "pending",
      details: [
        { label: "Origin", value: formatSystemName(row.origin_system_id) },
        { label: "Destination", value: row.external_target_name?.trim() || formatSystemName(row.target_system_id) },
        { label: "Count", value: String(row.number_of_fish_transfer) },
      ],
    }))
  } else if (type === "harvest") {
    const rows = mergeRecentEntriesByPrimaryDate(data, pendingEntries as HarvestRow[], (row) => row.date)
    pendingCount = (pendingEntries as HarvestRow[]).length
    cards = rows.map((row, index) => ({
      key: String(row.localId ?? row.id ?? index),
      title: formatSystemName(row.system_id),
      subtitle: formatDate(row.date),
      meta: formatCreatedAt(row.created_at),
      pending: row.status === "pending",
      details: [
        cageDetail(formatSystemName, row.system_id),
        { label: "Harvest", value: String(row.type_of_harvest) },
        { label: "Weight", value: `${row.total_weight_harvest} kg` },
      ],
    }))
  } else if (type === "water_quality") {
    const rows = mergeRecentEntriesByPrimaryDate(data, pendingEntries as WaterQualityRow[], (row) => row.date)
    pendingCount = (pendingEntries as WaterQualityRow[]).length
    cards = rows.map((row, index) => ({
      key: String(row.localId ?? row.id ?? index),
      title: formatSystemName(row.system_id),
      subtitle: formatDate(row.date),
      meta: formatCreatedAt(row.created_at),
      pending: row.status === "pending",
      details: [
        cageDetail(formatSystemName, row.system_id),
        { label: "Parameter", value: String(row.parameter_name) },
        { label: "Value", value: String(row.parameter_value) },
      ],
    }))
  } else if (type === "feed_inventory") {
    const feedInventoryPendingEntries = pendingEntries as unknown as FeedInventoryRow[]
    const rows = mergeRecentEntriesByPrimaryDate(data, feedInventoryPendingEntries, (row) => row.inventory_date)
    pendingCount = feedInventoryPendingEntries.length
    cards = rows.map((row, index) => {
      return {
        key: String(row.localId ?? row.id ?? index),
        title: row.feed_type_label?.trim() as string,
        subtitle: formatDate(row.inventory_date),
        meta: formatCreatedAt(row.created_at),
        pending: row.status === "pending",
        details: [
          { label: "Closed Bags", value: String(row.amount_of_bags ?? 0) },
          { label: "Open Feed", value: `${row.opened_bags ?? 0} g` },
          { label: "Total", value: row.snapshot_kg != null ? `${row.snapshot_kg.toFixed(2)} kg` : "-" },
        ],
      }
    })
  } else if (type === "stocking") {
    const rows = mergeRecentEntriesByPrimaryDate(data, pendingEntries as StockingRow[], (row) => row.date)
    pendingCount = (pendingEntries as StockingRow[]).length
    cards = rows.map((row, index) => ({
      key: String(row.localId ?? row.id ?? index),
      title: formatSystemName(row.system_id),
      subtitle: formatDate(row.date),
      meta: formatCreatedAt(row.created_at),
      pending: row.status === "pending",
      details: [
        cageDetail(formatSystemName, row.system_id),
        { label: "Count", value: String(row.number_of_fish_stocking) },
        { label: "Type", value: String(row.type_of_stocking) },
      ],
    }))
  } else {
    cards = data.slice(0, 5).map((row, index) => ({
      key: String(row.localId ?? row.id ?? index),
      title: row.name,
      subtitle: formatDate(row.commissioned_at),
      meta: formatCreatedAt(row.created_at),
      pending: row.status === "pending",
      details: [
        { label: "Unit", value: row.unit ?? "-" },
        { label: "Type", value: row.type },
        { label: "Stage", value: row.growth_stage },
      ],
    }))
  }

  return <EntriesSection cards={cards} pendingCount={pendingCount} />
}

