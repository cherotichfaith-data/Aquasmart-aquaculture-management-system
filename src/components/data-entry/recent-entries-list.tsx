"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { format } from "date-fns"
import { Clock3, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { offlineDB } from "@/lib/offline/db"
import type { SystemOption } from "@/lib/system-options"
import type { Tables } from "@/lib/types/database"

type PendingMeta = {
  status?: "pending"
  localId?: string
}

type SystemEntryRow = Pick<Tables<"system">, "id" | "commissioned_at" | "name" | "type" | "growth_stage" | "created_at"> & {
  unit?: string | null
} & PendingMeta

type MortalityRow = Pick<Tables<"fish_mortality">, "id" | "date" | "system_id" | "number_of_fish_mortality" | "created_at"> & PendingMeta
type FeedingRow = Pick<Tables<"feeding_record">, "id" | "date" | "system_id" | "feed_type_id" | "feeding_amount" | "created_at"> & PendingMeta
type SamplingRow = Pick<Tables<"fish_sampling_weight">, "id" | "date" | "system_id" | "number_of_fish_sampling" | "abw" | "created_at"> & PendingMeta
type TransferRow = Pick<Tables<"fish_transfer">, "id" | "date" | "origin_system_id" | "target_system_id" | "external_target_name" | "number_of_fish_transfer" | "created_at"> & PendingMeta
type HarvestRow = Pick<Tables<"fish_harvest">, "id" | "date" | "system_id" | "type_of_harvest" | "total_weight_harvest" | "created_at"> & PendingMeta
type WaterQualityRow = Pick<Tables<"water_quality_measurement">, "id" | "date" | "system_id" | "parameter_name" | "parameter_value" | "created_at"> & PendingMeta
type IncomingFeedRow = Pick<Tables<"feed_incoming">, "id" | "date" | "feed_type_id" | "feed_amount" | "created_at"> & PendingMeta
type StockingRow = Pick<Tables<"fish_stocking">, "id" | "date" | "system_id" | "number_of_fish_stocking" | "type_of_stocking" | "created_at"> & PendingMeta

type RecentEntriesListProps =
  | { type: "mortality"; data: MortalityRow[]; systems: SystemOption[] }
  | { type: "feeding"; data: FeedingRow[]; systems: SystemOption[] }
  | { type: "sampling"; data: SamplingRow[]; systems: SystemOption[] }
  | { type: "transfer"; data: TransferRow[]; systems: SystemOption[] }
  | { type: "harvest"; data: HarvestRow[]; systems: SystemOption[] }
  | { type: "water_quality"; data: WaterQualityRow[]; systems: SystemOption[] }
  | { type: "incoming_feed"; data: IncomingFeedRow[]; systems: SystemOption[] }
  | { type: "stocking"; data: StockingRow[]; systems: SystemOption[] }
  | { type: "system"; data: SystemEntryRow[]; systems: SystemOption[] }

const formatCreatedAt = (createdAt: string | null) =>
  createdAt ? format(new Date(createdAt), "MMM d, HH:mm") : "-"

const formatDate = (date: string | null) => date ?? "N/A"

const recentTableClassName = "min-w-[640px] text-xs sm:text-sm"
const recentSystemTableClassName = "min-w-[720px] text-xs sm:text-sm"

const PendingIcon = ({ pending }: { pending?: boolean }) =>
  pending ? <Loader2 className="mr-2 h-3 w-3 animate-spin text-muted-foreground" /> : null

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
              feed_type_id: row.feedTypeId,
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
              abw: row.abw,
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

function mergeRecentEntries<T extends { created_at: string | null; status?: "pending" }>(serverRows: T[], pendingRows: T[]) {
  const hasLivePendingRows = serverRows.some((row) => row.status === "pending")
  const combined = hasLivePendingRows ? serverRows : [...pendingRows, ...serverRows]

  return [...combined]
    .sort((left, right) => new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime())
    .slice(0, 10)
}

function EntriesSection({
  children,
  pendingCount,
}: {
  children: React.ReactNode
  pendingCount: number
}) {
  return (
    <div className="mt-8 rounded-lg border p-3 sm:p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">Recent Entries</h3>
          <p className="text-xs text-muted-foreground">Latest saved records, including queued offline submissions.</p>
        </div>
        {pendingCount > 0 ? (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <Clock3 className="h-3 w-3" />
            {pendingCount} queued offline
          </Badge>
        ) : null}
      </div>
      <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">{children}</div>
      <p className="mt-3 text-[11px] text-muted-foreground sm:hidden">Swipe horizontally to view all columns.</p>
    </div>
  )
}

export function RecentEntriesList(props: RecentEntriesListProps) {
  const { data, type, systems } = props
  const pendingEntries = usePendingOfflineEntries(type)
  const systemNameById = new Map(systems.map((system) => [system.id, system.label]))
  const formatSystemName = (systemId: number | null | undefined) =>
    systemId == null ? "-" : systemNameById.get(systemId) ?? `System ${systemId}`

  if (type === "mortality") {
    const rows = mergeRecentEntries(data, pendingEntries as MortalityRow[])
    if (rows.length === 0) return <div className="mt-4 text-sm text-muted-foreground">No recent entries found.</div>
    return (
      <EntriesSection pendingCount={(pendingEntries as MortalityRow[]).length}>
        <Table className={recentTableClassName}>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Count</TableHead>
              <TableHead className="text-right">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.localId ?? row.id ?? index} className={row.status === "pending" ? "opacity-70" : ""}>
                <TableCell className="flex items-center">
                  <PendingIcon pending={row.status === "pending"} />
                  {formatDate(row.date)}
                </TableCell>
                <TableCell>{formatSystemName(row.system_id)}</TableCell>
                <TableCell>{row.number_of_fish_mortality}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{formatCreatedAt(row.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </EntriesSection>
    )
  }

  if (type === "feeding") {
    const rows = mergeRecentEntries(data, pendingEntries as FeedingRow[])
    if (rows.length === 0) return <div className="mt-4 text-sm text-muted-foreground">No recent entries found.</div>
    return (
      <EntriesSection pendingCount={(pendingEntries as FeedingRow[]).length}>
        <Table className={recentTableClassName}>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Feed</TableHead>
              <TableHead>Amount (kg)</TableHead>
              <TableHead className="text-right">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.localId ?? row.id ?? index} className={row.status === "pending" ? "opacity-70" : ""}>
                <TableCell className="flex items-center">
                  <PendingIcon pending={row.status === "pending"} />
                  {formatDate(row.date)}
                </TableCell>
                <TableCell>{formatSystemName(row.system_id)}</TableCell>
                <TableCell>{row.feed_type_id}</TableCell>
                <TableCell>{row.feeding_amount}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{formatCreatedAt(row.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </EntriesSection>
    )
  }

  if (type === "sampling") {
    const rows = mergeRecentEntries(data, pendingEntries as SamplingRow[])
    if (rows.length === 0) return <div className="mt-4 text-sm text-muted-foreground">No recent entries found.</div>
    return (
      <EntriesSection pendingCount={(pendingEntries as SamplingRow[]).length}>
        <Table className={recentTableClassName}>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Count</TableHead>
              <TableHead>Avg Wt (g)</TableHead>
              <TableHead className="text-right">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.localId ?? row.id ?? index} className={row.status === "pending" ? "opacity-70" : ""}>
                <TableCell className="flex items-center">
                  <PendingIcon pending={row.status === "pending"} />
                  {formatDate(row.date)}
                </TableCell>
                <TableCell>{formatSystemName(row.system_id)}</TableCell>
                <TableCell>{row.number_of_fish_sampling}</TableCell>
                <TableCell>{row.abw}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{formatCreatedAt(row.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </EntriesSection>
    )
  }

  if (type === "transfer") {
    const rows = mergeRecentEntries(data, pendingEntries as TransferRow[])
    if (rows.length === 0) return <div className="mt-4 text-sm text-muted-foreground">No recent entries found.</div>
    return (
      <EntriesSection pendingCount={(pendingEntries as TransferRow[]).length}>
        <Table className={recentTableClassName}>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Dest</TableHead>
              <TableHead>Count</TableHead>
              <TableHead className="text-right">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.localId ?? row.id ?? index} className={row.status === "pending" ? "opacity-70" : ""}>
                <TableCell className="flex items-center">
                  <PendingIcon pending={row.status === "pending"} />
                  {formatDate(row.date)}
                </TableCell>
                <TableCell>{formatSystemName(row.origin_system_id)}</TableCell>
                <TableCell>{row.external_target_name?.trim() || formatSystemName(row.target_system_id)}</TableCell>
                <TableCell>{row.number_of_fish_transfer}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{formatCreatedAt(row.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </EntriesSection>
    )
  }

  if (type === "harvest") {
    const rows = mergeRecentEntries(data, pendingEntries as HarvestRow[])
    if (rows.length === 0) return <div className="mt-4 text-sm text-muted-foreground">No recent entries found.</div>
    return (
      <EntriesSection pendingCount={(pendingEntries as HarvestRow[]).length}>
        <Table className={recentTableClassName}>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Weight (kg)</TableHead>
              <TableHead className="text-right">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.localId ?? row.id ?? index} className={row.status === "pending" ? "opacity-70" : ""}>
                <TableCell className="flex items-center">
                  <PendingIcon pending={row.status === "pending"} />
                  {formatDate(row.date)}
                </TableCell>
                <TableCell>{formatSystemName(row.system_id)}</TableCell>
                <TableCell>{row.type_of_harvest}</TableCell>
                <TableCell>{row.total_weight_harvest}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{formatCreatedAt(row.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </EntriesSection>
    )
  }

  if (type === "water_quality") {
    const rows = mergeRecentEntries(data, pendingEntries as WaterQualityRow[])
    if (rows.length === 0) return <div className="mt-4 text-sm text-muted-foreground">No recent entries found.</div>
    return (
      <EntriesSection pendingCount={(pendingEntries as WaterQualityRow[]).length}>
        <Table className={recentTableClassName}>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Parameter</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="text-right">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.localId ?? row.id ?? index} className={row.status === "pending" ? "opacity-70" : ""}>
                <TableCell className="flex items-center">
                  <PendingIcon pending={row.status === "pending"} />
                  {formatDate(row.date)}
                </TableCell>
                <TableCell>{formatSystemName(row.system_id)}</TableCell>
                <TableCell>{row.parameter_name}</TableCell>
                <TableCell>{row.parameter_value}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{formatCreatedAt(row.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </EntriesSection>
    )
  }

  if (type === "incoming_feed") {
    if (data.length === 0) return <div className="mt-4 text-sm text-muted-foreground">No recent entries found.</div>
    return (
      <EntriesSection pendingCount={0}>
        <Table className={recentTableClassName}>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Feed</TableHead>
              <TableHead>Amount (kg)</TableHead>
              <TableHead className="text-right">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={row.localId ?? row.id ?? index} className={row.status === "pending" ? "opacity-70" : ""}>
                <TableCell className="flex items-center">
                  <PendingIcon pending={row.status === "pending"} />
                  {formatDate(row.date)}
                </TableCell>
                <TableCell>{row.feed_type_id}</TableCell>
                <TableCell>{row.feed_amount}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{formatCreatedAt(row.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </EntriesSection>
    )
  }

  if (type === "stocking") {
    const rows = mergeRecentEntries(data, pendingEntries as StockingRow[])
    if (rows.length === 0) return <div className="mt-4 text-sm text-muted-foreground">No recent entries found.</div>
    return (
      <EntriesSection pendingCount={(pendingEntries as StockingRow[]).length}>
        <Table className={recentTableClassName}>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Count</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.localId ?? row.id ?? index} className={row.status === "pending" ? "opacity-70" : ""}>
                <TableCell className="flex items-center">
                  <PendingIcon pending={row.status === "pending"} />
                  {formatDate(row.date)}
                </TableCell>
                <TableCell>{formatSystemName(row.system_id)}</TableCell>
                <TableCell>{row.number_of_fish_stocking}</TableCell>
                <TableCell>{row.type_of_stocking}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{formatCreatedAt(row.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </EntriesSection>
    )
  }

  if (data.length === 0) return <div className="mt-4 text-sm text-muted-foreground">No recent entries found.</div>

  return (
    <EntriesSection pendingCount={0}>
      <Table className={recentSystemTableClassName}>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Cage Unit</TableHead>
            <TableHead>Cage/System</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead className="text-right">Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={row.localId ?? row.id ?? index} className={row.status === "pending" ? "opacity-70" : ""}>
              <TableCell className="flex items-center">
                <PendingIcon pending={row.status === "pending"} />
                {formatDate(row.commissioned_at)}
              </TableCell>
              <TableCell>{row.unit ?? "-"}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.type}</TableCell>
              <TableCell>{row.growth_stage}</TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">{formatCreatedAt(row.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </EntriesSection>
  )
}
