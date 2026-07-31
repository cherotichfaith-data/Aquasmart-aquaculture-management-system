"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { Badge } from "@/components/app-ui/badge"
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

const toEntryDateValue = (entry: LatestEntrySummary) => entry.date || ""

export function sortLatestEntries(entries: LatestEntrySummary[]) {
  return [...entries].sort((left, right) => toEntryTimestamp(right) - toEntryTimestamp(left))
}

export function sortLatestEntriesByRecordDate(entries: LatestEntrySummary[]) {
  return [...entries].sort((left, right) => {
    const dateCompare = toEntryDateValue(right).localeCompare(toEntryDateValue(left))
    if (dateCompare !== 0) return dateCompare
    return toEntryTimestamp(right) - toEntryTimestamp(left)
  })
}

export function pickLatestEntryByRecordDate(entries: LatestEntrySummary[]) {
  return sortLatestEntriesByRecordDate(entries)[0] ?? null
}

export function pickSameDayEntry(entries: LatestEntrySummary[], date?: string | null) {
  if (!date) return null
  return sortLatestEntries(entries.filter((entry) => entry.date === date))[0] ?? null
}

/**
 * Duplicate key for feeding entries: a cage/system can have multiple feeding entries the same
 * day as long as each uses a different feed type -- only same cage + date + feed type collides.
 * This is a frontend-only check (no DB-level constraint); kept in one place so the client-side
 * check (feeding-form.tsx, for both server rows and locally-pending offline rows below) stays
 * consistent.
 */
export function composeFeedingDuplicateKey(feedTypeId: number | null | undefined) {
  return feedTypeId != null ? String(feedTypeId) : "none"
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
  feedTypes?: Array<{ id: number; label: string }>,
) {
  return (
    useLiveQuery(async () => {
      if (!systemId || !Number.isFinite(systemId) || systemId <= 0) return [] as LatestEntrySummary[]

      switch (kind) {
        case "feeding": {
          const rows = await offlineDB.feeding.where("systemId").equals(systemId).toArray()
          const feedTypeLabel = (feedTypeId: number | null | undefined) =>
            feedTypeId != null
              ? feedTypes?.find((feedType) => feedType.id === feedTypeId)?.label ?? `Feed type #${feedTypeId}`
              : "Not selected"
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
            metadata: { feedingDuplicateKey: composeFeedingDuplicateKey(row.feedTypeId) },
            duplicateMessage:
              row.feedTypeId != null
                ? `A feeding entry with this feed type already exists for this cage on ${row.date}.`
                : `A feeding entry already exists for this cage on ${row.date}. Select a feed type to log an additional feeding.`,
          }))
        }
        case "mortality": {
          const rows = await offlineDB.mortality.where("systemId").equals(systemId).toArray()
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
          const rows = await offlineDB.sampling.where("systemId").equals(systemId).toArray()
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
          const rows = await offlineDB.stocking.where("systemId").equals(systemId).toArray()
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
          const rows = await offlineDB.harvest.where("systemId").equals(systemId).toArray()
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
          const rows = await offlineDB.transfer.where("originSystemId").equals(systemId).toArray()
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
          const rows = await offlineDB.waterQuality.where("systemId").equals(systemId).toArray()
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
    }, [kind, systemId, feedTypes]) ?? []
  )
}

export function LatestEntryGuard({
  latestEntry,
  duplicateEntry,
  itemLabel,
}: {
  latestEntry: LatestEntrySummary | null
  duplicateEntry: LatestEntrySummary | null
  itemLabel: string
}) {
  if (!latestEntry && !duplicateEntry) return null

  return (
    <div className="space-y-3">
      {duplicateEntry ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-destructive">
          {duplicateEntry.duplicateMessage ?? `A ${itemLabel} entry already exists for this cage on ${duplicateEntry.date}.`}
        </div>
      ) : null}

      {latestEntry ? (
        <div className="data-entry-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">Latest {itemLabel} entry for this cage</div>
              <div className="text-xs text-muted-foreground">{latestEntry.date}</div>
            </div>
            {latestEntry.pending ? (
              <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
                Pending sync
              </Badge>
            ) : null}
          </div>
          <div className="mt-3 text-sm font-medium text-foreground">{latestEntry.summary}</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {latestEntry.details.map((detail) => (
              <div key={`${latestEntry.key}-${detail.label}`} className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{detail.label}</div>
                <div className="text-sm text-foreground">{detail.value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
