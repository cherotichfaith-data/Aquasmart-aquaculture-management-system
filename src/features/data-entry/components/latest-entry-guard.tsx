"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { Badge } from "@/components/app-ui/badge"
import { Skeleton } from "@/components/app-ui/skeleton"
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

export function pickLatestEntry(entries: LatestEntrySummary[]) {
  return sortLatestEntries(entries)[0] ?? null
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

export function LatestEntryGuard({
  latestEntry,
  duplicateEntry,
  itemLabel,
  isLoading = false,
}: {
  latestEntry: LatestEntrySummary | null
  duplicateEntry: LatestEntrySummary | null
  itemLabel: string
  /**
   * Whether the server-backed "latest entry" query is still on its first
   * fetch. A pending offline entry can already satisfy `latestEntry` before
   * that resolves, so this only matters -- and only renders a skeleton --
   * when neither entry is known yet, instead of the panel just being absent
   * and then popping in once the network call finishes.
   */
  isLoading?: boolean
}) {
  if (!latestEntry && !duplicateEntry) {
    if (!isLoading) return null

    return (
      <div className="rounded-md border border-border/80 bg-muted/15 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="mt-3 h-4 w-40" />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Skeleton className="h-12 rounded-md" />
          <Skeleton className="h-12 rounded-md" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {duplicateEntry ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-destructive">
          {duplicateEntry.duplicateMessage ?? `A ${itemLabel} entry already exists for this cage on ${duplicateEntry.date}.`}
        </div>
      ) : null}

      {latestEntry ? (
        <div className="rounded-md border border-border/80 bg-muted/15 px-4 py-4">
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
              <div key={`${latestEntry.key}-${detail.label}`} className="rounded-md border border-border/70 bg-background/70 px-3 py-2">
                <div className="text-tag uppercase tracking-wide text-muted-foreground">{detail.label}</div>
                <div className="text-sm text-foreground">{detail.value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
