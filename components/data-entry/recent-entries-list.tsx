import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"

interface RecentEntriesListProps {
    data: any[]
    type: "mortality" | "feeding" | "sampling" | "transfer" | "harvest" | "water_quality" | "incoming_feed" | "stocking" | "system"
}

export function RecentEntriesList({ data, type }: RecentEntriesListProps) {
    if (!data || data.length === 0) {
        return <div className="text-sm text-muted-foreground mt-4">No recent entries found.</div>
    }

    return (
        <div className="mt-8 border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Recent Entries</h3>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        {/* Dynamic Headers based on Type */}
                        {type === "mortality" && <><TableHead>System</TableHead><TableHead>Count</TableHead></>}
                        {type === "feeding" && <><TableHead>System</TableHead><TableHead>Feed</TableHead><TableHead>Amount (kg)</TableHead></>}
                        {type === "sampling" && <><TableHead>System</TableHead><TableHead>Count</TableHead><TableHead>Avg Wt (g)</TableHead></>}
                        {type === "transfer" && <><TableHead>Origin</TableHead><TableHead>Dest</TableHead><TableHead>Count</TableHead></>}
                        {type === "harvest" && <><TableHead>System</TableHead><TableHead>Type</TableHead><TableHead>Weight (kg)</TableHead></>}
                        {type === "water_quality" && <><TableHead>System</TableHead><TableHead>Parameter</TableHead><TableHead>Value</TableHead></>}
                        {type === "incoming_feed" && <><TableHead>Feed ID</TableHead><TableHead>Qty (kg)</TableHead><TableHead>Supplier</TableHead></>}
                        {type === "stocking" && <><TableHead>System</TableHead><TableHead>Count</TableHead><TableHead>Source</TableHead></>}
                        {type === "system" && <><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Stage</TableHead></>}
                        <TableHead className="text-right">Created At</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row) => (
                        <TableRow key={row.id}>
                            <TableCell>{row.date || row.stocking_date || "N/A"}</TableCell>

                            {type === "mortality" && (
                                <>
                                    <TableCell>{row.system_id}</TableCell>
                                    <TableCell>{row.number_of_fish}</TableCell>
                                </>
                            )}
                            {type === "feeding" && (
                                <>
                                    <TableCell>{row.system_id}</TableCell>
                                    <TableCell>{row.feed_id}</TableCell>
                                    <TableCell>{row.amount_kg}</TableCell>
                                </>
                            )}
                            {type === "sampling" && (
                                <>
                                    <TableCell>{row.system_id}</TableCell>
                                    <TableCell>{row.number_of_fish}</TableCell>
                                    <TableCell>{row.average_body_weight_g}</TableCell>
                                </>
                            )}
                            {type === "transfer" && (
                                <>
                                    <TableCell>{row.origin_system_id}</TableCell>
                                    <TableCell>{row.destination_system_id}</TableCell>
                                    <TableCell>{row.number_of_fish}</TableCell>
                                </>
                            )}
                            {type === "harvest" && (
                                <>
                                    <TableCell>{row.system_id}</TableCell>
                                    <TableCell>{row.type_of_harvest}</TableCell>
                                    <TableCell>{row.amount_kg}</TableCell>
                                </>
                            )}
                            {type === "water_quality" && (
                                <>
                                    <TableCell>{row.system_id}</TableCell>
                                    <TableCell>{row.parameter_name}</TableCell>
                                    <TableCell>{row.parameter_value}</TableCell>
                                </>
                            )}
                            {type === "incoming_feed" && (
                                <>
                                    <TableCell>{row.feed_id}</TableCell>
                                    <TableCell>{row.quantity}</TableCell>
                                    <TableCell>{row.supplier_id || "-"}</TableCell>
                                </>
                            )}
                            {type === "stocking" && (
                                <>
                                    <TableCell>{row.system_id}</TableCell>
                                    <TableCell>{row.number_of_fish}</TableCell>
                                    <TableCell>{row.source || "-"}</TableCell>
                                </>
                            )}
                            {type === "system" && (
                                <>
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.type}</TableCell>
                                    <TableCell>{row.growth_stage}</TableCell>
                                </>
                            )}

                            <TableCell className="text-right text-muted-foreground text-xs">
                                {row.created_at ? format(new Date(row.created_at), "MMM d, HH:mm") : "-"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
