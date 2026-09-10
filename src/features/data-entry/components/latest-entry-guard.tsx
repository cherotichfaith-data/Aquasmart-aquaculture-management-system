"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { offlineDB } from "@/lib/offline/db"

export type LatestEntrySummary = {
  key: string
  date: string
  createdAt: string | null
  pending?: boolean
  summary: string
  details: Array<{ label: string; value: string }>
  metadata?: Record<string, string | number | null | undefined>
  duplicateMessage?: string
}

export type LatestEntryGuardKind =
  | "feeding"
  | "mortality"
  | "sampling"
  | "stocking"
  | "harvest"
  | "transfer"
  | "water_quality"

const toCreatedAt = (createdAtLocal: number) => new Date(createdAtLocal).toISOString()

const toEntryTimestamp = (entry: LatestEntrySummary) =>
  new Date(entry.createdAt ?? `${entry.date}T00:00:00`).getTime()

export function sortLatestEntries(entries: LatestEntrySummary[]) {
  return [...entries].sort((left, right) => toEntryTimestamp(right) - toEntryTimestamp(left))
}

export function pickSameDayEntry(entries: LatestEntrySummary[], date?: string | null) {
  if (!date) return null
  return sortLatestEntries(entries.filter((entry) => entry.date === date))[0] ?? null
}

export function pickSameDayEntryByMetadata(
  entries: LatestEntrySummary[],
  params: {
    date?: string | null
    metadataKey: string
    metadataValue?: string | number | null
  },
) {
  if (!params.date || params.metadataValue == null) return null
  return (
    sortLatestEntries(
      entries.filter(
        (entry) =>
          entry.date === params.date &&
          entry.metadata?.[params.metadataKey] === params.metadataValue,
      ),
    )[0] ?? null
  )
}

export function usePendingLatestEntries(
  kind: LatestEntryGuardKind,
  systemId?: number | null,
  feedTypes?: Array<{ id: number; label?: string | null; feed_line?: string | null }>,
) {
  return (
    useLiveQuery(async () => {
      if (!systemId || !Number.isFinite(systemId) || systemId <= 0) return [] as LatestEntrySummary[]

      switch (kind) {
        case "feeding": {
          const rows = await offlineDB.feeding
            .where("systemId")
            .equals(systemId)
            .and((row) => row.syncStatus === "pending")
            .toArray()
          const feedTypeLabel = (feedTypeId: number | null | undefined) => {
            if (feedTypeId == null) return "Not selected"
            const feedType = feedTypes?.find((item) => item.id === feedTypeId)
            return feedType?.label ?? feedType?.feed_line ?? "Not recorded"
          }
          return rows.map<LatestEntrySummary>((row) => ({
            key: `pending-feeding-${row.localId}`,
            date: row.date,
            createdAt: toCreatedAt(row.createdAtLocal),
            pending: true,
            summary: `${row.feedingAmount.toFixed(2)} kg feed`,
            details:
              row.feedingAmount === 0
                ? [{ label: "Reason", value: row.notes?.trim() || "No reason recorded" }]
                : [
                    { label: "Feed Type", value: feedTypeLabel(row.feedTypeId) },
                    { label: "Response", value: row.feedingResponse != null ? `Level ${row.feedingResponse}` : "Not recorded" },
                  ],
            metadata: {
              feedTypeId: row.feedTypeId ?? 0,
            },
            duplicateMessage:
              row.feedTypeId != null
                ? `A feeding entry already exists for this cage on ${row.date} with ${feedTypeLabel(row.feedTypeId)}.`
                : `A feeding entry already exists for this cage on ${row.date}.`,
          }))
        }
        case "mortality": {
          const rows = await offlineDB.mortality
            .where("systemId")
            .equals(systemId)
            .and((row) => row.syncStatus === "pending")
            .toArray()
          return rows.map<LatestEntrySummary>((row) => ({
            key: `pending-mortality-${row.localId}`,
            date: row.date,
            createdAt: toCreatedAt(row.createdAtLocal),
            pending: true,
            summary: `${row.numberOfFishMortality} dead fish`,
            details: [
              { label: "Cause", value: row.cause || "Unknown" },
              {
                label: "Dead Weight",
                value: row.totalWeightMortality != null ? `${row.totalWeightMortality} kg` : "Not recorded",
              },
            ],
          }))
        }
        case "sampling": {
          const rows = await offlineDB.sampling
            .where("systemId")
            .equals(systemId)
            .and((row) => row.syncStatus === "pending")
            .toArray()
          return rows.map<LatestEntrySummary>((row) => ({
            key: `pending-sampling-${row.localId}`,
            date: row.date,
            createdAt: toCreatedAt(row.createdAtLocal),
            pending: true,
            summary: `${row.numberOfFishSampling} fish sampled`,
            details: [
              { label: "Total Weight", value: `${row.totalWeightSampling} kg` },
            ],
          }))
        }
        case "stocking": {
          const rows = await offlineDB.stocking
            .where("systemId")
            .equals(systemId)
            .and((row) => row.syncStatus === "pending")
            .toArray()
          return rows.map<LatestEntrySummary>((row) => ({
            key: `pending-stocking-${row.localId}`,
            date: row.date,
            createdAt: toCreatedAt(row.createdAtLocal),
            pending: true,
            summary: `${row.numberOfFishStocking} fish stocked`,
            details: [
              { label: "Weight", value: `${row.totalWeightStocking} kg` },
              { label: "Type", value: row.typeOfStocking },
            ],
          }))
        }
        case "harvest": {
          const rows = await offlineDB.harvest
            .where("systemId")
            .equals(systemId)
            .and((row) => row.syncStatus === "pending")
            .toArray()
          return rows.map<LatestEntrySummary>((row) => ({
            key: `pending-harvest-${row.localId}`,
            date: row.date,
            createdAt: toCreatedAt(row.createdAtLocal),
            pending: true,
            summary: `${row.totalWeightHarvest} kg harvested`,
            details: [
              { label: "Count", value: String(row.numberOfFishHarvest) },
              { label: "Type", value: row.typeOfHarvest },
            ],
          }))
        }
        case "transfer": {
          const rows = await offlineDB.transfer
            .where("originSystemId")
            .equals(systemId)
            .and((row) => row.syncStatus === "pending")
            .toArray()
          return rows.map<LatestEntrySummary>((row) => ({
            key: `pending-transfer-${row.localId}`,
            date: row.date,
            createdAt: toCreatedAt(row.createdAtLocal),
            pending: true,
            summary: `${row.numberOfFishTransfer} fish transferred`,
            details: [
              {
                label: "Destination",
                value: row.externalTargetName?.trim() || (row.targetSystemId != null ? `Cage ${row.targetSystemId}` : "Not set"),
              },
              { label: "Weight", value: `${row.totalWeightTransfer} kg` },
            ],
          }))
        }
        case "water_quality": {
          const rows = await offlineDB.waterQuality
            .where("systemId")
            .equals(systemId)
            .and((row) => row.syncStatus === "pending")
            .toArray()
          return rows.map<LatestEntrySummary>((row) => ({
            key: `pending-water-quality-${row.localId}`,
            date: row.date,
            createdAt: toCreatedAt(row.createdAtLocal),
            pending: true,
            summary: `${row.parameterName}: ${row.parameterValue}`,
            details: [
              { label: "Time", value: row.time },
              { label: "Depth", value: `${row.waterDepth} m` },
            ],
            metadata: {
              waterDepth: row.waterDepth,
            },
            duplicateMessage: `A water quality entry already exists for this cage on ${row.date} at ${row.waterDepth} m depth.`,
          }))
        }
      }
    }, [feedTypes, kind, systemId]) ?? []
  )
}
