import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import type { Tables } from "@/lib/types/database"
import { format } from "date-fns"

type RecentEntriesListProps =
    | { type: "mortality"; data: Tables<"fish_mortality">[] }
    | { type: "feeding"; data: Tables<"feeding_record">[] }
    | { type: "sampling"; data: Tables<"fish_sampling_weight">[] }
    | { type: "transfer"; data: Tables<"fish_transfer">[] }
    | { type: "harvest"; data: Tables<"fish_harvest">[] }
    | { type: "water_quality"; data: Tables<"water_quality_measurement">[] }
    | { type: "incoming_feed"; data: Tables<"feed_incoming">[] }
    | { type: "stocking"; data: Tables<"fish_stocking">[] }
    | { type: "system"; data: Tables<"system">[] }

const formatCreatedAt = (createdAt: string | null) =>
    createdAt ? format(new Date(createdAt), "MMM d, HH:mm") : "-"

const formatDate = (date: string | null) => date ?? "N/A"

export function RecentEntriesList(props: RecentEntriesListProps) {
    const { data, type } = props

    if (!data || data.length === 0) {
        return <div className="text-sm text-muted-foreground mt-4">No recent entries found.</div>
    }

    if (type === "mortality") {
        return (
            <div className="mt-8 border rounded-lg p-4">
                <h3 className="font-semibold mb-4">Recent Entries</h3>
                <Table>
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
                            <TableRow key={row.id ?? index}>
                                <TableCell>{formatDate(row.date)}</TableCell>
                                <TableCell>{row.system_id}</TableCell>
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
            <div className="mt-8 border rounded-lg p-4">
                <h3 className="font-semibold mb-4">Recent Entries</h3>
                <Table>
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
                            <TableRow key={row.id ?? index}>
                                <TableCell>{formatDate(row.date)}</TableCell>
                                <TableCell>{row.system_id}</TableCell>
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
            <div className="mt-8 border rounded-lg p-4">
                <h3 className="font-semibold mb-4">Recent Entries</h3>
                <Table>
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
                            <TableRow key={row.id ?? index}>
                                <TableCell>{formatDate(row.date)}</TableCell>
                                <TableCell>{row.system_id}</TableCell>
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
            <div className="mt-8 border rounded-lg p-4">
                <h3 className="font-semibold mb-4">Recent Entries</h3>
                <Table>
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
                            <TableRow key={row.id ?? index}>
                                <TableCell>{formatDate(row.date)}</TableCell>
                                <TableCell>{row.origin_system_id}</TableCell>
                                <TableCell>{row.target_system_id}</TableCell>
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
            <div className="mt-8 border rounded-lg p-4">
                <h3 className="font-semibold mb-4">Recent Entries</h3>
                <Table>
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
                            <TableRow key={row.id ?? index}>
                                <TableCell>{formatDate(row.date)}</TableCell>
                                <TableCell>{row.system_id}</TableCell>
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
            <div className="mt-8 border rounded-lg p-4">
                <h3 className="font-semibold mb-4">Recent Entries</h3>
                <Table>
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
                            <TableRow key={row.id ?? index}>
                                <TableCell>{formatDate(row.date)}</TableCell>
                                <TableCell>{row.system_id}</TableCell>
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
            <div className="mt-8 border rounded-lg p-4">
                <h3 className="font-semibold mb-4">Recent Entries</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Feed</TableHead>
                            <TableHead>Qty (kg)</TableHead>
                            <TableHead className="text-right">Created At</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row, index) => (
                            <TableRow key={row.id ?? index}>
                                <TableCell>{formatDate(row.date)}</TableCell>
                                <TableCell>{row.feed_type_id}</TableCell>
                                <TableCell>{row.feed_amount}</TableCell>
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
            <div className="mt-8 border rounded-lg p-4">
                <h3 className="font-semibold mb-4">Recent Entries</h3>
                <Table>
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
                            <TableRow key={row.id ?? index}>
                                <TableCell>{formatDate(row.date)}</TableCell>
                                <TableCell>{row.system_id}</TableCell>
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
        <div className="mt-8 border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Recent Entries</h3>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead className="text-right">Created At</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, index) => (
                        <TableRow key={row.id ?? index}>
                            <TableCell>N/A</TableCell>
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
