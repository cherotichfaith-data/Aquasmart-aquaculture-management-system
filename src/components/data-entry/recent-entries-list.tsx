import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import type { Tables } from "@/lib/types/database"
import type { SystemOption } from "@/lib/system-options"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"

type SystemEntryRow = Tables<"system"> & { unit?: string | null }

type RecentEntriesListProps =
    | { type: "mortality"; data: Array<Tables<"fish_mortality"> & { status?: "pending" }>; systems: SystemOption[] }
    | { type: "feeding"; data: Array<Tables<"feeding_record"> & { status?: "pending" }>; systems: SystemOption[] }
    | { type: "sampling"; data: Array<Tables<"fish_sampling_weight"> & { status?: "pending" }>; systems: SystemOption[] }
    | { type: "transfer"; data: Array<Tables<"fish_transfer"> & { status?: "pending" }>; systems: SystemOption[] }
    | { type: "harvest"; data: Array<Tables<"fish_harvest"> & { status?: "pending" }>; systems: SystemOption[] }
    | { type: "water_quality"; data: Array<Tables<"water_quality_measurement"> & { status?: "pending" }>; systems: SystemOption[] }
    | { type: "incoming_feed"; data: Array<Tables<"feed_inventory_snapshot"> & { status?: "pending" }>; systems: SystemOption[] }
    | { type: "stocking"; data: Array<Tables<"fish_stocking"> & { status?: "pending" }>; systems: SystemOption[] }
    | { type: "system"; data: Array<Tables<"system"> & { status?: "pending" }>; systems: SystemOption[] }

const formatCreatedAt = (createdAt: string | null) =>
    createdAt ? format(new Date(createdAt), "MMM d, HH:mm") : "-"

const formatDate = (date: string | null) => date ?? "N/A"
const recentTableClassName = "min-w-[640px]"
const recentSystemTableClassName = "min-w-[720px]"

const PendingIcon = ({ pending }: { pending?: boolean }) =>
    pending ? <Loader2 className="mr-2 h-3 w-3 animate-spin text-muted-foreground" /> : null

export function RecentEntriesList(props: RecentEntriesListProps) {
    const { data, type, systems } = props
    const systemNameById = new Map(systems.map((system) => [system.id, system.label]))
    const formatSystemName = (systemId: number | null | undefined) =>
        systemId == null ? "-" : systemNameById.get(systemId) ?? `System ${systemId}`

    if (!data || data.length === 0) {
        return <div className="text-sm text-muted-foreground mt-4">No recent entries found.</div>
    }

    if (type === "mortality") {
        return (
            <div className="mt-8 rounded-lg border p-3 sm:p-4">
                <h3 className="font-semibold mb-4">Recent Entries</h3>
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
                        {data.map((row, index) => (
                            <TableRow key={row.id ?? index} className={row.status === "pending" ? "opacity-60" : ""}>
                                <TableCell className="flex items-center">
                                    <PendingIcon pending={row.status === "pending"} />
                                    {formatDate(row.date)}
                                </TableCell>
                                <TableCell>{formatSystemName(row.system_id)}</TableCell>
                                <TableCell>{row.number_of_fish_mortality}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">{formatCreatedAt(row.created_at)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )
    }

    if (type === "feeding") {
        return (
            <div className="mt-8 rounded-lg border p-3 sm:p-4">
                <h3 className="font-semibold mb-4">Recent Entries</h3>
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
                        {data.map((row, index) => (
                            <TableRow key={row.id ?? index} className={row.status === "pending" ? "opacity-60" : ""}>
                                <TableCell className="flex items-center">
                                    <PendingIcon pending={row.status === "pending"} />
                                    {formatDate(row.date)}
                                </TableCell>
                                <TableCell>{formatSystemName(row.system_id)}</TableCell>
                                <TableCell>{row.feed_type_id}</TableCell>
                                <TableCell>{row.feeding_amount}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">{formatCreatedAt(row.created_at)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )
    }

    if (type === "sampling") {
        return (
            <div className="mt-8 rounded-lg border p-3 sm:p-4">
                <h3 className="font-semibold mb-4">Recent Entries</h3>
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
                        {data.map((row, index) => (
                            <TableRow key={row.id ?? index} className={row.status === "pending" ? "opacity-60" : ""}>
                                <TableCell className="flex items-center">
                                    <PendingIcon pending={row.status === "pending"} />
                                    {formatDate(row.date)}
                                </TableCell>
                                <TableCell>{formatSystemName(row.system_id)}</TableCell>
                                <TableCell>{row.number_of_fish_sampling}</TableCell>
                                <TableCell>{row.abw}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">{formatCreatedAt(row.created_at)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )
    }

    if (type === "transfer") {
        return (
            <div className="mt-8 rounded-lg border p-3 sm:p-4">
                <h3 className="font-semibold mb-4">Recent Entries</h3>
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
                        {data.map((row, index) => (
                            <TableRow key={row.id ?? index} className={row.status === "pending" ? "opacity-60" : ""}>
                                <TableCell className="flex items-center">
                                    <PendingIcon pending={row.status === "pending"} />
                                    {formatDate(row.date)}
                                </TableCell>
                                <TableCell>{formatSystemName(row.origin_system_id)}</TableCell>
                                <TableCell>{row.external_target_name?.trim() || formatSystemName(row.target_system_id)}</TableCell>
                                <TableCell>{row.number_of_fish_transfer}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">{formatCreatedAt(row.created_at)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )
    }

    if (type === "harvest") {
        return (
            <div className="mt-8 rounded-lg border p-3 sm:p-4">
                <h3 className="font-semibold mb-4">Recent Entries</h3>
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
                        {data.map((row, index) => (
                            <TableRow key={row.id ?? index} className={row.status === "pending" ? "opacity-60" : ""}>
                                <TableCell className="flex items-center">
                                    <PendingIcon pending={row.status === "pending"} />
                                    {formatDate(row.date)}
                                </TableCell>
                                <TableCell>{formatSystemName(row.system_id)}</TableCell>
                                <TableCell>{row.type_of_harvest}</TableCell>
                                <TableCell>{row.total_weight_harvest}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">{formatCreatedAt(row.created_at)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )
    }

    if (type === "water_quality") {
        return (
            <div className="mt-8 rounded-lg border p-3 sm:p-4">
                <h3 className="font-semibold mb-4">Recent Entries</h3>
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
                        {data.map((row, index) => (
                            <TableRow key={row.id ?? index} className={row.status === "pending" ? "opacity-60" : ""}>
                                <TableCell className="flex items-center">
                                    <PendingIcon pending={row.status === "pending"} />
                                    {formatDate(row.date)}
                                </TableCell>
                                <TableCell>{formatSystemName(row.system_id)}</TableCell>
                                <TableCell>{row.parameter_name}</TableCell>
                                <TableCell>{row.parameter_value}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">{formatCreatedAt(row.created_at)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )
    }

    if (type === "incoming_feed") {
        return (
            <div className="mt-8 rounded-lg border p-3 sm:p-4">
                <h3 className="font-semibold mb-4">Recent Entries</h3>
                <Table className={recentTableClassName}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Feed</TableHead>
                            <TableHead>Bags</TableHead>
                            <TableHead>Total Stock (kg)</TableHead>
                            <TableHead className="text-right">Created At</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row, index) => (
                            <TableRow key={row.id ?? index} className={row.status === "pending" ? "opacity-60" : ""}>
                                <TableCell className="flex items-center">
                                    <PendingIcon pending={row.status === "pending"} />
                                    {formatDate(row.date)}
                                </TableCell>
                                <TableCell>{row.snapshot_time?.slice(0, 5) ?? "-"}</TableCell>
                                <TableCell>{row.feed_type_id}</TableCell>
                                <TableCell>{row.number_of_bags}</TableCell>
                                <TableCell>{row.total_stock_kg ?? ((row.bag_weight_kg * row.number_of_bags) + row.open_bags_kg)}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">{formatCreatedAt(row.created_at)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )
    }

    if (type === "stocking") {
        return (
            <div className="mt-8 rounded-lg border p-3 sm:p-4">
                <h3 className="font-semibold mb-4">Recent Entries</h3>
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
                        {data.map((row, index) => (
                            <TableRow key={row.id ?? index} className={row.status === "pending" ? "opacity-60" : ""}>
                                <TableCell className="flex items-center">
                                    <PendingIcon pending={row.status === "pending"} />
                                    {formatDate(row.date)}
                                </TableCell>
                                <TableCell>{formatSystemName(row.system_id)}</TableCell>
                                <TableCell>{row.number_of_fish_stocking}</TableCell>
                                <TableCell>{row.type_of_stocking}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">{formatCreatedAt(row.created_at)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )
    }

    return (
        <div className="mt-8 rounded-lg border p-3 sm:p-4">
            <h3 className="font-semibold mb-4">Recent Entries</h3>
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
                    <TableRow key={row.id ?? index} className={row.status === "pending" ? "opacity-60" : ""}>
                        <TableCell className="flex items-center">
                            <PendingIcon pending={row.status === "pending"} />
                            {formatDate(row.commissioned_at)}
                        </TableCell>
                        <TableCell>{(row as SystemEntryRow).unit ?? "-"}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.type}</TableCell>
                        <TableCell>{row.growth_stage}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">{formatCreatedAt(row.created_at)}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
