"use client"

import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import * as z from "zod"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/app-ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { Dialog } from "@/components/app-ui/dialog"
import { OfflineSaveBadge } from "@/components/offline/offline-save-badge"
import { useProductionSummary } from "@/features/production/hooks"
import { useHarvests, useMortalityData, useStockingData, useTransferData } from "@/features/reports/hooks"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/app-ui/form"
import { Input } from "@/components/app-ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/app-ui/select"
import { formatDateOnly, formatNumberValue } from "@/lib/analytics-format"
import { useRecordHarvest } from "@/lib/hooks/use-harvest"
import { logSbError } from "@/lib/supabase/log"
import { Constants } from "@/lib/types/database"
import { formatCageLabel, type SystemOption } from "@/lib/system-options"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import { resolveBatchIdForSystem, type BatchOptionItem } from "@/features/shared/batch-options"
import {
    findUnitForSystem,
    getSystemUnits,
    getSystemsForUnit,
} from "./form-support"
import {
    parseNumericId,
    parseRequiredNumericId,
    reportDataEntrySubmitError,
    requireActiveFarmId,
} from "./form-utils"
import {
    pickSameDayEntry,
    usePendingLatestEntries,
    type LatestEntrySummary,
} from "./latest-entry-guard"
import { SelectionChips } from "./selection-info"
import { FieldGrid, FormActions, FormSection } from "./form-layout"

const formSchema = z.object({
    unit: z.string().min(1, "Cage unit is required"),
    system_id: z.string().min(1, "Cage number is required"),
    date: z.string().min(1, "Date is required"),
    number_of_fish: z.coerce.number().int("Count must be a whole number").min(1, "Count must be positive"),
    amount_kg: z.coerce.number().min(0.01, "Weight must be positive"),
    type_of_harvest: z.enum(Constants.public.Enums.type_of_harvest).default("partial"),
})

const DAY_MS = 86_400_000

function countCycleDays(startDate?: string | null, endDate?: string | null) {
    if (!startDate || !endDate) return null
    const start = new Date(`${startDate}T00:00:00Z`)
    const end = new Date(`${endDate}T00:00:00Z`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null
    return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1
}

interface HarvestFormProps {
    farmId: string | null
    systems: SystemOption[]
    batches: BatchOptionItem[]
    defaultSystemId?: number | null
    defaultBatchId?: number | null
    onSystemChange?: (systemId: number | null) => void
}

function HarvestCycleSummary({
    farmId,
    system,
    systemId,
    batchId,
    selectedDate,
}: {
    farmId: string | null
    system: SystemOption | null
    systemId: number | null
    batchId: number | null
    selectedDate: string
}) {
    const summaryQuery = useProductionSummary({
        farmId,
        systemId: systemId ?? undefined,
        dateTo: selectedDate || undefined,
        limit: 2500,
        enabled: Boolean(farmId) && Boolean(systemId),
    })
    const stockingQuery = useStockingData({
        farmId,
        systemId: systemId ?? undefined,
        batchId: batchId ?? undefined,
        dateTo: selectedDate || undefined,
        enabled: Boolean(farmId) && Boolean(systemId) && Boolean(selectedDate),
    })
    const mortalityQuery = useMortalityData({
        farmId,
        systemId: systemId ?? undefined,
        batchId: batchId ?? undefined,
        dateTo: selectedDate || undefined,
        enabled: Boolean(farmId) && Boolean(systemId) && Boolean(selectedDate),
    })
    const transferQuery = useTransferData({
        farmId,
        systemId: systemId ?? undefined,
        batchId: batchId ?? undefined,
        dateTo: selectedDate || undefined,
        enabled: Boolean(farmId) && Boolean(systemId) && Boolean(selectedDate),
    })
    const harvestQuery = useHarvests({
        farmId,
        systemId: systemId ?? undefined,
        batchId: batchId ?? undefined,
        dateTo: selectedDate || undefined,
        enabled: Boolean(farmId) && Boolean(systemId) && Boolean(selectedDate),
    })

    const latestCycleRow = summaryQuery.data?.status === "success" ? summaryQuery.data.data[0] ?? null : null
    const cycleRows = useMemo(() => {
        const summaryRows = summaryQuery.data?.status === "success" ? summaryQuery.data.data : []
        if (!latestCycleRow) return []
        return summaryRows.filter((row) => row.cycle_id === latestCycleRow.cycle_id)
    }, [latestCycleRow, summaryQuery.data])
    const liveFishCount = useMemo(() => {
        if (!systemId) return null

        const stockingRows = stockingQuery.data?.status === "success" ? stockingQuery.data.data : []
        const mortalityRows = mortalityQuery.data?.status === "success" ? mortalityQuery.data.data : []
        const transferRows = transferQuery.data?.status === "success" ? transferQuery.data.data : []
        const harvestRows = harvestQuery.data?.status === "success" ? harvestQuery.data.data : []

        const stocked = stockingRows.reduce((sum, row) => sum + (row.number_of_fish_stocking ?? 0), 0)
        const dead = mortalityRows.reduce((sum, row) => sum + (row.number_of_fish_mortality ?? 0), 0)
        const harvested = harvestRows.reduce((sum, row) => sum + (row.number_of_fish_harvest ?? 0), 0)
        const transferredNet = transferRows.reduce((sum, row) => {
            const incoming = row.target_system_id === systemId ? (row.number_of_fish_transfer ?? 0) : 0
            const outgoing = row.origin_system_id === systemId ? (row.number_of_fish_transfer ?? 0) : 0
            return sum + incoming - outgoing
        }, 0)

        return stocked + transferredNet - dead - harvested
    }, [
        harvestQuery.data,
        mortalityQuery.data,
        stockingQuery.data,
        systemId,
        transferQuery.data,
    ])
    const cycleStartDate =
        latestCycleRow?.cycle_start ??
        cycleRows[cycleRows.length - 1]?.cycle_start ??
        cycleRows[cycleRows.length - 1]?.date ??
        latestCycleRow?.date ??
        null
    const cycleDays = countCycleDays(cycleStartDate, selectedDate || (latestCycleRow?.date ?? null))
    const queryError =
        getErrorMessage(summaryQuery.error) ??
        getQueryResultError(summaryQuery.data) ??
        getErrorMessage(stockingQuery.error) ??
        getQueryResultError(stockingQuery.data) ??
        getErrorMessage(mortalityQuery.error) ??
        getQueryResultError(mortalityQuery.data) ??
        getErrorMessage(transferQuery.error) ??
        getQueryResultError(transferQuery.data) ??
        getErrorMessage(harvestQuery.error) ??
        getQueryResultError(harvestQuery.data)
    const summaryLabel = systemId ? formatCageLabel(system) : "Selected system"
    const asOfDate = latestCycleRow?.date ?? null
    const isLoadingSummary =
        summaryQuery.isLoading || stockingQuery.isLoading || mortalityQuery.isLoading || transferQuery.isLoading || harvestQuery.isLoading

    if (!systemId) return null

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    Current cycle · {summaryLabel}
                    {asOfDate ? ` — as of ${formatDateOnly(asOfDate)}` : ""}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {queryError ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-4 text-sm text-destructive">
                        Unable to load cycle summary. {queryError}
                    </div>
                ) : isLoadingSummary ? (
                    <div className="grid gap-3 sm:grid-cols-3">
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
                        <div className="grid gap-3 sm:grid-cols-3">
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
                                    {formatNumberValue(liveFishCount)}
                                </p>
                            </div>
                        </div>
                        <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                            {asOfDate && selectedDate && asOfDate !== selectedDate
                                ? `Cycle days are counted through ${formatDateOnly(selectedDate)}. Inventory and eFCR reflect the latest available summary on ${formatDateOnly(asOfDate)}.`
                                : "Use these cycle totals to confirm the entered harvest fish count and weight are consistent before saving."}
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
    onSystemChange,
}: HarvestFormProps) {
    const mutation = useRecordHarvest()
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [pendingConfirmation, setPendingConfirmation] = useState<z.infer<typeof formSchema> | null>(null)

    const units = useMemo(() => getSystemUnits(systems), [systems])
    const defaultUnit = findUnitForSystem(systems, defaultSystemId)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        mode: "onBlur",
        defaultValues: {
            date: new Date().toISOString().split("T")[0],
            unit: defaultUnit,
            number_of_fish: 0,
            amount_kg: 0,
            type_of_harvest: "partial",
            system_id: defaultSystemId ? String(defaultSystemId) : "",
        },
    })
    const defaultSystemValue = defaultSystemId ? String(defaultSystemId) : ""

    const selectedUnit = useWatch({ control: form.control, name: "unit" })
    const selectedSystemId = useWatch({ control: form.control, name: "system_id" })
    const selectedDate = useWatch({ control: form.control, name: "date" })
    const harvestType = useWatch({ control: form.control, name: "type_of_harvest" })
    const resolvedSystemId = parseNumericId(selectedSystemId)
    const selectedSystem = useMemo(
        () => systems.find((system) => system.id === resolvedSystemId) ?? null,
        [resolvedSystemId, systems],
    )
    const selectedCageLabel = resolvedSystemId ? formatCageLabel(selectedSystem) : "this system"
    const systemsForUnit = useMemo(() => getSystemsForUnit(systems, selectedUnit), [selectedUnit, systems])

    useEffect(() => {
        if (!defaultSystemValue) return
        const resolvedUnit = findUnitForSystem(systems, defaultSystemId)
        if (!resolvedUnit) return

        const currentSystem = form.getValues("system_id")
        if (currentSystem && currentSystem !== defaultSystemValue) return

        if (form.getValues("unit") !== resolvedUnit) {
            form.setValue("unit", resolvedUnit, { shouldValidate: true })
        }
        if (currentSystem !== defaultSystemValue) {
            form.setValue("system_id", defaultSystemValue, { shouldValidate: true })
        }
    }, [defaultSystemId, defaultSystemValue, form, systems])

    useEffect(() => {
        if (!selectedUnit) return
        const currentValue = form.getValues("system_id")
        if (!currentValue) return
        const existsInUnit = systemsForUnit.some((system) => String(system.id) === currentValue)
        if (!existsInUnit) {
            form.setValue("system_id", "", { shouldValidate: true })
        }
    }, [form, selectedUnit, systemsForUnit])

    useEffect(() => {
        onSystemChange?.(resolvedSystemId ?? null)
    }, [onSystemChange, resolvedSystemId])

    const resolvedBatchId = useMemo(
        () => resolveBatchIdForSystem(batches, resolvedSystemId),
        [batches, resolvedSystemId],
    )
    const duplicateQuery = useHarvests({
        farmId,
        systemId: resolvedSystemId ?? undefined,
        dateFrom: selectedDate || undefined,
        dateTo: selectedDate || undefined,
        limit: 20,
        enabled: Boolean(resolvedSystemId) && Boolean(selectedDate),
    })
    const pendingEntries = usePendingLatestEntries("harvest", resolvedSystemId)
    const duplicateServerEntries = (duplicateQuery.data?.status === "success" ? duplicateQuery.data.data : []).map<LatestEntrySummary>((row) => ({
        key: `harvest-duplicate-${row.id ?? row.created_at ?? row.date ?? "entry"}`,
        date: row.date ?? "",
        createdAt: row.created_at ?? null,
        summary: `${row.total_weight_harvest ?? 0} kg harvested`,
        details: [],
    }))
    const duplicateEntry = pickSameDayEntry([...duplicateServerEntries, ...pendingEntries], selectedDate)

    async function submitHarvest(values: z.infer<typeof formSchema>) {
        if (duplicateEntry) {
            form.setError("date", { message: `A harvest entry already exists for ${values.date}.` })
            return
        }

        const resolvedFarmId = requireActiveFarmId(farmId)
        const systemId = parseRequiredNumericId(values.system_id, "System")

        await mutation.mutateAsync({
            farm_id: resolvedFarmId,
            system_id: systemId,
            batch_id: resolvedBatchId,
            date: values.date,
            number_of_fish_harvest: values.number_of_fish,
            total_weight_harvest: values.amount_kg,
            type_of_harvest: values.type_of_harvest,
        })

        form.reset({
            date: new Date().toISOString().split("T")[0],
            unit: values.unit,
            number_of_fish: 0,
            amount_kg: 0,
            type_of_harvest: "partial",
            system_id: values.system_id,
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
            reportDataEntrySubmitError(error, "Failed to record harvest.")
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
            reportDataEntrySubmitError(error, "Failed to record final harvest.")
        }
    }

    return (
        <>
            <div className="space-y-4">
                <div className="data-entry-status">
                    <OfflineSaveBadge result={mutation.data} />
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormSection title="Record harvest">
                            <SelectionChips
                                systems={systems}
                                systemId={resolvedSystemId}
                                batches={batches}
                                batchId={resolvedBatchId}
                            />

                            <FieldGrid>
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

                                <FormField
                                    control={form.control}
                                    name="unit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cage Unit</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select unit" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {units.map((unit) => (
                                                        <SelectItem key={unit} value={unit}>
                                                            {unit}
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
                                    name="system_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cage Number</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || undefined} disabled={!selectedUnit}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={selectedUnit ? "Select cage" : "Select unit first"} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {systemsForUnit.map((system) => (
                                                        <SelectItem key={system.id} value={String(system.id)}>
                                                            {formatCageLabel(system)}
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
                                    name="number_of_fish"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Harvested Fish Count</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="1" inputMode="numeric" {...field} />
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
                                            <FormLabel>Total Harvested Weight (kg)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" inputMode="decimal" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

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
                            </FieldGrid>

                            {harvestType === "final" ? (
                                <div className="data-entry-callout-alert border-destructive/30 bg-destructive/5">
                                    <p className="font-medium text-foreground">Final harvest will close this cycle.</p>
                                    <p className="mt-1 text-muted-foreground">
                                        This will close the production cycle for {selectedCageLabel}. All subsequent
                                        events will start a new cycle.
                                    </p>
                                </div>
                            ) : null}
                        </FormSection>

                        <HarvestCycleSummary
                            farmId={farmId}
                            system={selectedSystem}
                            systemId={resolvedSystemId}
                            batchId={resolvedBatchId}
                            selectedDate={selectedDate}
                        />

                        <FormActions>
                            <Button
                                type="submit"
                                className="min-h-11 rounded-lg px-5"
                                disabled={form.formState.isSubmitting || mutation.isPending}
                            >
                                {(form.formState.isSubmitting || mutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Record Harvest
                            </Button>
                        </FormActions>
                    </form>
                </Form>
            </div>

            <Dialog
                open={confirmOpen}
                onClose={() => {
                    setConfirmOpen(false)
                    setPendingConfirmation(null)
                }}
                title="Confirm Final Harvest"
                description={`This will close the production cycle for ${selectedCageLabel}. All subsequent events will start a new cycle. Continue?`}
                maxWidth="sm"
            >
                <div className="max-w-md">
                    <div className="flex justify-end gap-2 pt-2">
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
                    </div>
                </div>
            </Dialog>
        </>
    )
}
