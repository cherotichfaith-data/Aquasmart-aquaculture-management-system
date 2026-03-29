"use client"

import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDateOnly, formatNumberValue } from "@/lib/analytics-format"
import { useRecordHarvest } from "@/lib/hooks/use-harvest"
import { useProductionSummary } from "@/lib/hooks/use-production"
import { countTimeRangeDays } from "@/lib/time-period"
import { logSbError } from "@/lib/supabase/log"
import type { Database } from "@/lib/types/database"
import type { SystemOption } from "@/lib/system-options"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import { parseNumericId } from "./form-utils"
import { SelectedBatchSupplierInfo, SelectedSystemInfo } from "./selection-info"

const formSchema = z.object({
    system_id: z.string().min(1, "System is required"),
    batch_id: z.string().optional(),
    date: z.string().min(1, "Date is required"),
    number_of_fish: z.coerce.number().min(0, "Count must be positive"),
    amount_kg: z.coerce.number().min(0, "Weight must be positive"),
    type_of_harvest: z.enum(["partial", "final"]).default("partial"),
})

interface HarvestFormProps {
    farmId: string | null
    systems: SystemOption[]
    batches: Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number][]
    defaultSystemId?: number | null
    defaultBatchId?: number | null
}

function HarvestCycleSummary({
    farmId,
    system,
    systemId,
    selectedDate,
}: {
    farmId: string | null
    system: SystemOption | null
    systemId: number | null
    selectedDate: string
}) {
    const summaryQuery = useProductionSummary({
        farmId,
        systemId: systemId ?? undefined,
        dateTo: selectedDate || undefined,
        limit: 2500,
        enabled: Boolean(farmId) && Boolean(systemId),
    })

    const summaryRows = summaryQuery.data?.status === "success" ? summaryQuery.data.data : []
    const latestCycleRow = summaryRows[0] ?? null
    const cycleRows = useMemo(() => {
        if (!latestCycleRow) return []
        return summaryRows.filter((row) => row.cycle_id === latestCycleRow.cycle_id)
    }, [latestCycleRow, summaryRows])
    const cycleStartDate = cycleRows[cycleRows.length - 1]?.date ?? latestCycleRow?.date ?? null
    const cycleDays = countTimeRangeDays(cycleStartDate, latestCycleRow?.date ?? null)
    const queryError = getErrorMessage(summaryQuery.error) ?? getQueryResultError(summaryQuery.data)
    const summaryLabel = system?.label ?? (systemId ? `System ${systemId}` : "Selected system")
    const asOfDate = latestCycleRow?.date ?? null

    return (
        <Card className="xl:sticky xl:top-6">
            <CardHeader>
                <CardTitle>Current Cycle Summary</CardTitle>
                <CardDescription>
                    {summaryLabel}
                    {asOfDate ? ` as of ${formatDateOnly(asOfDate)}` : ""}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!systemId ? (
                    <div className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                        Select a system to load cycle checks before submitting harvest.
                    </div>
                ) : queryError ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-4 text-sm text-destructive">
                        Unable to load cycle summary. {queryError}
                    </div>
                ) : summaryQuery.isLoading ? (
                    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <div key={index} className="rounded-md border border-border/80 bg-muted/30 p-3">
                                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                                <div className="mt-3 h-7 w-20 animate-pulse rounded bg-muted" />
                            </div>
                        ))}
                    </div>
                ) : !latestCycleRow ? (
                    <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                        No production-cycle summary is available yet for this system.
                    </div>
                ) : (
                    <>
                        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                            <div className="rounded-md border border-border/80 bg-muted/20 p-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Days In Cycle</p>
                                <p className="mt-2 text-2xl font-semibold">{formatNumberValue(cycleDays)}</p>
                            </div>
                            <div className="rounded-md border border-border/80 bg-muted/20 p-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Cumulative eFCR</p>
                                <p className="mt-2 text-2xl font-semibold">
                                    {formatNumberValue(latestCycleRow.efcr_aggregated, { decimals: 2, fallback: "--" })}
                                </p>
                            </div>
                            <div className="rounded-md border border-border/80 bg-muted/20 p-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Fish Count</p>
                                <p className="mt-2 text-2xl font-semibold">
                                    {formatNumberValue(latestCycleRow.number_of_fish_inventory)}
                                </p>
                            </div>
                        </div>
                        <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                            Use these cycle totals to confirm the entered harvest fish count and weight are consistent before saving.
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}

export function HarvestForm({
    farmId,
    systems,
    batches,
    defaultSystemId = null,
    defaultBatchId = null,
}: HarvestFormProps) {
    const mutation = useRecordHarvest()
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [pendingConfirmation, setPendingConfirmation] = useState<z.infer<typeof formSchema> | null>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date().toISOString().split("T")[0],
            number_of_fish: 0,
            amount_kg: 0,
            type_of_harvest: "partial",
            system_id: defaultSystemId ? String(defaultSystemId) : "",
            batch_id: defaultBatchId ? String(defaultBatchId) : "none",
        },
    })

    const selectedSystemId = form.watch("system_id")
    const selectedBatchId = form.watch("batch_id")
    const selectedDate = form.watch("date")
    const numberOfFish = form.watch("number_of_fish")
    const amountKg = form.watch("amount_kg")
    const harvestType = form.watch("type_of_harvest")
    const resolvedSystemId = parseNumericId(selectedSystemId)
    const selectedSystem = useMemo(
        () => systems.find((system) => system.id === resolvedSystemId) ?? null,
        [resolvedSystemId, systems],
    )
    const selectedCageLabel =
        selectedSystem?.unit?.trim() ||
        selectedSystem?.label ||
        (resolvedSystemId ? `System ${resolvedSystemId}` : "this system")
    const computedAbw = numberOfFish > 0 && amountKg > 0 ? (amountKg * 1000) / numberOfFish : null

    async function submitHarvest(values: z.infer<typeof formSchema>) {
        const systemId = Number(values.system_id)
        const batchId = values.batch_id && values.batch_id !== "none" ? Number(values.batch_id) : null

        await mutation.mutateAsync({
            system_id: systemId,
            batch_id: Number.isFinite(batchId as number) ? batchId : null,
            date: values.date,
            number_of_fish_harvest: values.number_of_fish,
            total_weight_harvest: values.amount_kg,
            type_of_harvest: values.type_of_harvest,
            abw: values.number_of_fish > 0 ? (values.amount_kg * 1000) / values.number_of_fish : 0,
        })

        form.reset({
            date: new Date().toISOString().split("T")[0],
            number_of_fish: 0,
            amount_kg: 0,
            type_of_harvest: "partial",
            system_id: values.system_id,
            batch_id: values.batch_id,
        })
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (values.type_of_harvest === "final") {
            setPendingConfirmation(values)
            setConfirmOpen(true)
            return
        }

        try {
            await submitHarvest(values)
        } catch (error) {
            logSbError("dataEntry:harvest:submit", error)
        }
    }

    async function onConfirmFinalHarvest() {
        if (!pendingConfirmation) return

        try {
            await submitHarvest(pendingConfirmation)
            setConfirmOpen(false)
            setPendingConfirmation(null)
        } catch (error) {
            logSbError("dataEntry:harvest:confirmFinal", error)
        }
    }

    return (
        <>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                <div className="max-w-2xl">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold tracking-tight">Record Harvest</h2>
                    </div>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="system_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>System</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select system" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {systems.map((system) => (
                                                        <SelectItem key={system.id} value={String(system.id)}>
                                                            {system.label ?? `System ${system.id}`}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <SelectedSystemInfo systems={systems} systemId={selectedSystemId} />
                                <SelectedBatchSupplierInfo batches={batches} batchId={selectedBatchId} />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="number_of_fish"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fish Count</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="amount_kg"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Weight (kg)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="type_of_harvest"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Harvest Type</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="partial">Partial</SelectItem>
                                                    <SelectItem value="final">Final</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="batch_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Batch (Optional)</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || "none"}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select batch" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">No batch</SelectItem>
                                                    {batches.map((batch) => (
                                                        <SelectItem key={batch.id} value={String(batch.id)}>
                                                            {batch.label || `Batch ${batch.id}`}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {harvestType === "final" ? (
                                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm">
                                    <p className="font-medium text-foreground">Final harvest will close this cycle.</p>
                                    <p className="mt-1 text-muted-foreground">
                                        This will close the production cycle for {selectedCageLabel}. All subsequent
                                        events will start a new cycle.
                                    </p>
                                </div>
                            ) : null}

                            <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                                Computed ABW (weight x 1000 / fish count):{" "}
                                {computedAbw != null ? `${computedAbw.toFixed(2)} g` : "Enter count and weight"}
                            </div>

                            <Button type="submit" disabled={form.formState.isSubmitting || mutation.isPending}>
                                {(form.formState.isSubmitting || mutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Entry
                            </Button>
                        </form>
                    </Form>
                </div>

                <HarvestCycleSummary
                    farmId={farmId}
                    system={selectedSystem}
                    systemId={resolvedSystemId}
                    selectedDate={selectedDate}
                />
            </div>

            <Dialog
                open={confirmOpen}
                onOpenChange={(open) => {
                    setConfirmOpen(open)
                    if (!open) setPendingConfirmation(null)
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Final Harvest</DialogTitle>
                        <DialogDescription>
                            This will close the production cycle for {selectedCageLabel}. All subsequent events will
                            start a new cycle. Continue?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setConfirmOpen(false)
                                setPendingConfirmation(null)
                            }}
                            disabled={mutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="button" onClick={onConfirmFinalHarvest} disabled={mutation.isPending}>
                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
