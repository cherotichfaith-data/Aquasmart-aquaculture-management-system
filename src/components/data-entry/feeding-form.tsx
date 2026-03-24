"use client"

import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
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
import type { Database } from "@/lib/types/database"
import type { SystemOption } from "@/lib/system-options"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useRecordFeeding } from "@/lib/hooks/use-feeding"
import { useFeedPlans, useFeedingRecords } from "@/lib/hooks/use-reports"
import { useDailyFishInventory } from "@/lib/hooks/use-inventory"
import { useWaterQualityMeasurements } from "@/lib/hooks/use-water-quality"
import { logSbError } from "@/lib/supabase/log"
import { selectApplicableFeedPlan } from "@/app/feed/_lib/feed-analytics"
import { cn } from "@/lib/utils"
import { DependencyBlocker } from "./dependency-blocker"
import { FeedTypeQuickCreate } from "./feed-type-quick-create"
import { SelectedBatchSupplierInfo, SelectedSystemInfo } from "./selection-info"

type FeedingInsertOverride = Database["public"]["Tables"]["feeding_record"]["Insert"] & {
    feeding_response: "very_good" | "good" | "fair" | "bad"
}

const FEEDING_RESPONSE_OPTIONS = [
    { value: "very_good", label: "Excellent" },
    { value: "good", label: "Good" },
    { value: "fair", label: "Fair" },
    { value: "bad", label: "Poor" },
] as const

const formSchema = z.object({
    system_id: z.string().min(1, "System is required"),
    batch_id: z.string().optional(),
    date: z.string().min(1, "Date is required"),
    feed_id: z.string().min(1, "Feed type is required"),
    amount_kg: z.coerce.number().min(0, "Amount must be positive"),
    feeding_response: z.enum(["very_good", "good", "fair", "bad"]),
})

interface FeedingFormProps {
    systems: SystemOption[]
    feeds: Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number][]
    batches: Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number][]
    defaultSystemId?: number | null
    defaultBatchId?: number | null
}

export function FeedingForm({ systems, feeds, batches, defaultSystemId = null, defaultBatchId = null }: FeedingFormProps) {
    const { farmId } = useActiveFarm()
    const mutation = useRecordFeeding()
    const [showQuickCreate, setShowQuickCreate] = useState(false)
    const [submissionSummary, setSubmissionSummary] = useState<string | null>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date().toISOString().split("T")[0],
            amount_kg: 0,
            system_id: defaultSystemId ? String(defaultSystemId) : "",
            feed_id: "",
            feeding_response: "good",
            batch_id: defaultBatchId ? String(defaultBatchId) : "none",
        },
    })
    const selectedSystemId = Number(form.watch("system_id"))
    const selectedBatchValue = form.watch("batch_id")
    const selectedBatchId = selectedBatchValue && selectedBatchValue !== "none" ? Number(selectedBatchValue) : null
    const selectedBatchIdForQuery: number | undefined =
        typeof selectedBatchId === "number" && Number.isFinite(selectedBatchId) ? selectedBatchId : undefined
    const selectedDate = form.watch("date")
    const selectedFeedId = Number(form.watch("feed_id"))
    const selectedSystem = systems.find((system) => system.id === selectedSystemId) ?? null
    const selectedFeed = feeds.find((feed) => feed.id === selectedFeedId) ?? null

    const duplicateQuery = useFeedingRecords({
        systemId: Number.isFinite(selectedSystemId) ? selectedSystemId : undefined,
        dateFrom: selectedDate || undefined,
        dateTo: selectedDate || undefined,
        limit: 20,
        enabled: Boolean(selectedDate) && Number.isFinite(selectedSystemId),
    })
    const inventoryQuery = useDailyFishInventory({
        farmId,
        systemId: Number.isFinite(selectedSystemId) ? selectedSystemId : undefined,
        dateFrom: selectedDate || undefined,
        dateTo: selectedDate || undefined,
        limit: 7,
        orderAsc: false,
        enabled: Boolean(farmId) && Boolean(selectedDate) && Number.isFinite(selectedSystemId),
    })
    const feedPlansQuery = useFeedPlans({
        farmId,
        systemIds: Number.isFinite(selectedSystemId) ? [selectedSystemId] : [],
        batchId: selectedBatchIdForQuery,
        dateFrom: selectedDate || undefined,
        dateTo: selectedDate || undefined,
        enabled: Boolean(farmId) && Boolean(selectedDate) && Number.isFinite(selectedSystemId),
    })
    const doQuery = useWaterQualityMeasurements({
        systemId: Number.isFinite(selectedSystemId) ? selectedSystemId : undefined,
        parameterName: "dissolved_oxygen",
        limit: 20,
        requireSystem: true,
        enabled: Number.isFinite(selectedSystemId),
    })

    const existingDailyRecords =
        duplicateQuery.data?.status === "success" ? duplicateQuery.data.data : []
    const latestInventoryRow =
        inventoryQuery.data?.status === "success" ? inventoryQuery.data.data[0] ?? null : null
    const matchedFeedPlan = useMemo(() => {
        const rows = feedPlansQuery.data?.status === "success" ? feedPlansQuery.data.data : []
        if (!selectedDate || !Number.isFinite(selectedSystemId)) return null
        return selectApplicableFeedPlan(rows, {
            systemId: selectedSystemId,
            date: selectedDate,
            abwG: latestInventoryRow?.abw_last_sampling ?? null,
            batchId: Number.isFinite(selectedBatchId) ? selectedBatchId : null,
            feedTypeId: Number.isFinite(selectedFeedId) ? selectedFeedId : null,
        })
    }, [feedPlansQuery.data, latestInventoryRow?.abw_last_sampling, selectedBatchId, selectedDate, selectedFeedId, selectedSystemId])
    const latestDoReading = useMemo(() => {
        const rows = doQuery.data?.status === "success" ? doQuery.data.data : []
        return rows
            .slice()
            .sort((a, b) =>
                `${b.date ?? ""}T${b.time ?? "00:00"}`.localeCompare(`${a.date ?? ""}T${a.time ?? "00:00"}`)
            )[0] ?? null
    }, [doQuery.data])
    const doValue = latestDoReading?.parameter_value ?? null
    const doBadgeClass =
        doValue == null
            ? "border-border bg-muted/20 text-muted-foreground"
            : doValue < 4
                ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
                : doValue < 5
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    const doBadgeLabel =
        doValue == null
            ? "DO unavailable"
            : doValue < 4
                ? `Low DO ${doValue.toFixed(1)} mg/L - consider reducing feed.`
                : doValue < 5
                    ? `DO ${doValue.toFixed(1)} mg/L - caution.`
                    : `DO ${doValue.toFixed(1)} mg/L`
    const targetDailyFeedKg = useMemo(() => {
        const biomassKg = latestInventoryRow?.biomass_last_sampling ?? null
        const targetRate = matchedFeedPlan?.target_feeding_rate_pct ?? null
        return biomassKg != null && biomassKg > 0 && targetRate != null ? (biomassKg * targetRate) / 100 : null
    }, [latestInventoryRow?.biomass_last_sampling, matchedFeedPlan])
    const plannedDailyFeedText =
        matchedFeedPlan?.target_feeding_rate_pct != null
            ? `${matchedFeedPlan.target_feeding_rate_pct.toFixed(2)}% biomass`
            : null

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const systemId = Number(values.system_id)
            const feedTypeId = Number(values.feed_id)
            const batchId = values.batch_id && values.batch_id !== "none" ? Number(values.batch_id) : null
            const existingTotal = existingDailyRecords.reduce((sum, row) => sum + (row.feeding_amount ?? 0), 0)
            const dailyTotal = existingTotal + values.amount_kg
            const biomassKg = latestInventoryRow?.biomass_last_sampling ?? null
            const feedRatePct = biomassKg && biomassKg > 0 ? (dailyTotal / biomassKg) * 100 : null
            const percentOfPlan =
                targetDailyFeedKg != null && targetDailyFeedKg > 0 ? (dailyTotal / targetDailyFeedKg) * 100 : null

            const payload = {
                system_id: systemId,
                batch_id: Number.isFinite(batchId as number) ? batchId : null,
                date: values.date,
                feed_type_id: feedTypeId,
                feeding_amount: values.amount_kg,
                feeding_response: values.feeding_response,
            } as unknown as FeedingInsertOverride

            await mutation.mutateAsync(payload)
            setSubmissionSummary(
                `Saved. Daily total for ${selectedSystem?.label ?? `System ${systemId}`}: ${dailyTotal.toFixed(2)} kg.${
                    feedRatePct != null ? ` Feed rate: ${feedRatePct.toFixed(2)}% of biomass.` : ""
                }${
                    targetDailyFeedKg != null
                        ? ` Target: ${targetDailyFeedKg.toFixed(2)} kg/day${plannedDailyFeedText ? ` (${plannedDailyFeedText})` : ""}.`
                        : ""
                }${
                    percentOfPlan != null ? ` Plan coverage: ${percentOfPlan.toFixed(0)}%.` : ""
                }`,
            )
            form.reset({
                date: new Date().toISOString().split("T")[0],
                amount_kg: 0,
                system_id: values.system_id,
                feed_id: values.feed_id,
                batch_id: values.batch_id,
                feeding_response: values.feeding_response,
            })
        } catch (error) {
            logSbError("dataEntry:feeding:submit", error)
        }
    }

    if (feeds.length === 0) {
        return (
            <DependencyBlocker
                title="No feed types found."
                description="Add a feed type to continue."
                actionLabel={showQuickCreate ? "Hide feed type form" : "Add feed type"}
                onAction={() => setShowQuickCreate((current) => !current)}
            >
                {showQuickCreate ? <FeedTypeQuickCreate onCreated={() => setShowQuickCreate(false)} /> : null}
            </DependencyBlocker>
        )
    }

    return (
        <div className="max-w-5xl">
            <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">Record Feeding</h2>
                <p className="text-sm text-muted-foreground">Record daily feed usage for a system.</p>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className={cn("rounded-md border px-3 py-2 text-sm font-medium", doBadgeClass)}>
                    {doBadgeLabel}
                </div>
                {plannedDailyFeedText ? (
                    <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                        Active feed target: <span className="font-medium">{plannedDailyFeedText}</span>
                        {targetDailyFeedKg != null ? ` (${targetDailyFeedKg.toFixed(2)} kg/day)` : ""}
                    </div>
                ) : null}
                {selectedFeed?.feed_pellet_size ? (
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                        Pellet guide: <span className="font-medium text-foreground">{selectedFeed.feed_pellet_size}</span>
                    </div>
                ) : null}
            </div>
            {existingDailyRecords.length > 0 ? (
                <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                    Feeding is already recorded for {selectedSystem?.label ?? "this system"} on {selectedDate}. Check before adding a duplicate entry.
                </div>
            ) : null}
            {submissionSummary ? (
                <div className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
                    {submissionSummary}
                </div>
            ) : null}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="system_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>System</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select system" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {systems.map((s) => (
                                                <SelectItem key={s.id} value={String(s.id)}>
                                                    {s.label ?? `System ${s.id}`}
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
                            name="batch_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Batch (Optional)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SelectedSystemInfo systems={systems} systemId={selectedSystemId} />
                        <SelectedBatchSupplierInfo batches={batches} batchId={selectedBatchValue} />
                    </div>

                    <FormField
                        control={form.control}
                        name="feed_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Feed Type</FormLabel>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-full sm:flex-1">
                                                <SelectValue placeholder="Select feed" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {feeds.map((f) => (
                                                <SelectItem key={f.id} value={String(f.id)}>
                                                    {f.label ?? f.feed_line ?? `Feed ${f.id}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant={showQuickCreate ? "secondary" : "outline"}
                                        size="sm"
                                        className="shrink-0"
                                        onClick={() => setShowQuickCreate((current) => !current)}
                                    >
                                        {showQuickCreate ? "Hide new feed type" : "Add new feed type"}
                                    </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {showQuickCreate ? <FeedTypeQuickCreate onCreated={() => setShowQuickCreate(false)} /> : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="amount_kg"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount (kg)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="feeding_response"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Response</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select response" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {FEEDING_RESPONSE_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <Button type="submit" disabled={form.formState.isSubmitting || mutation.isPending}>
                        {(form.formState.isSubmitting || mutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Entry
                    </Button>
                </form>
            </Form>
        </div>
    )
}
