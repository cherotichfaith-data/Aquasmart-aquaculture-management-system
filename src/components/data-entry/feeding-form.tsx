"use client"

import { useEffect, useMemo, useState } from "react"
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
import { useFeedingRecords } from "@/lib/hooks/use-reports"
import { useDailyFishInventory } from "@/lib/hooks/use-inventory"
import { useLatestWaterQualityStatus, useWaterQualityMeasurements } from "@/lib/hooks/use-water-quality"
import { diffDateDays } from "@/lib/time-series"
import { logSbError } from "@/lib/supabase/log"
import { OfflineSaveBadge } from "@/components/offline/offline-save-badge"
import { DependencyBlocker } from "./dependency-blocker"
import { FeedTypeQuickCreate } from "./feed-type-quick-create"
import {
  InfoPanel,
  InfoStat,
  findUnitForSystem,
  formatRelativeDays,
  getSystemUnits,
  getSystemsForUnit,
} from "./form-support"
import { toIsoDate } from "./form-utils"
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
  date: z.string().min(1, "Date is required"),
  unit: z.string().min(1, "Cage unit is required"),
  system_id: z.string().min(1, "Cage number is required"),
  feed_id: z.string().min(1, "Feed type is required"),
  amount_kg: z.coerce.number().min(0.01, "Amount must be positive"),
  feeding_response: z.enum(["very_good", "good", "fair", "bad"]),
  batch_id: z.string().optional(),
  notes: z.string().max(500, "Comments must be 500 characters or fewer").optional(),
})

interface FeedingFormProps {
  systems: SystemOption[]
  feeds: Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number][]
  batches: Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number][]
  defaultSystemId?: number | null
  defaultBatchId?: number | null
}

const shiftDate = (dateString: string, days: number) => {
  const next = new Date(`${dateString}T00:00:00`)
  next.setDate(next.getDate() + days)
  return toIsoDate(next)
}

export function FeedingForm({ systems, feeds, batches, defaultSystemId = null, defaultBatchId = null }: FeedingFormProps) {
  const { farmId } = useActiveFarm()
  const mutation = useRecordFeeding()
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [submissionSummary, setSubmissionSummary] = useState<string | null>(null)

  const units = useMemo(() => getSystemUnits(systems), [systems])
  const defaultUnit = findUnitForSystem(systems, defaultSystemId)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: toIsoDate(new Date()),
      unit: defaultUnit,
      amount_kg: 0,
      system_id: defaultSystemId ? String(defaultSystemId) : "",
      feed_id: "",
      feeding_response: "good",
      batch_id: defaultBatchId ? String(defaultBatchId) : "none",
      notes: "",
    },
  })

  const selectedUnit = form.watch("unit")
  const selectedSystemValue = form.watch("system_id")
  const selectedSystemId = Number(selectedSystemValue)
  const selectedBatchValue = form.watch("batch_id")
  const selectedBatchId =
    selectedBatchValue && selectedBatchValue !== "none" ? Number(selectedBatchValue) : null
  const selectedDate = form.watch("date")
  const selectedFeedId = Number(form.watch("feed_id"))
  const selectedSystem = systems.find((system) => system.id === selectedSystemId) ?? null
  const selectedFeed = feeds.find((feed) => feed.id === selectedFeedId) ?? null
  const systemsForUnit = useMemo(() => getSystemsForUnit(systems, selectedUnit), [selectedUnit, systems])
  const previousDate = selectedDate ? shiftDate(selectedDate, -1) : undefined

  useEffect(() => {
    if (!selectedUnit) return
    const currentValue = form.getValues("system_id")
    if (!currentValue) return
    const existsInUnit = systemsForUnit.some((system) => String(system.id) === currentValue)
    if (!existsInUnit) {
      form.setValue("system_id", "", { shouldValidate: true })
    }
  }, [form, selectedUnit, systemsForUnit])

  const duplicateQuery = useFeedingRecords({
    systemId: Number.isFinite(selectedSystemId) ? selectedSystemId : undefined,
    dateFrom: selectedDate || undefined,
    dateTo: selectedDate || undefined,
    limit: 20,
    enabled: Boolean(selectedDate) && Number.isFinite(selectedSystemId),
  })
  const yesterdayFeedQuery = useFeedingRecords({
    systemId: Number.isFinite(selectedSystemId) ? selectedSystemId : undefined,
    dateFrom: previousDate,
    dateTo: previousDate,
    limit: 20,
    enabled: Boolean(previousDate) && Number.isFinite(selectedSystemId),
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
  const latestWaterStatusQuery = useLatestWaterQualityStatus(
    Number.isFinite(selectedSystemId) ? selectedSystemId : undefined,
    { farmId },
  )
  const doQuery = useWaterQualityMeasurements({
    systemId: Number.isFinite(selectedSystemId) ? selectedSystemId : undefined,
    parameterName: "dissolved_oxygen",
    limit: 10,
    requireSystem: true,
    enabled: Number.isFinite(selectedSystemId),
  })

  const existingDailyRecords = duplicateQuery.data?.status === "success" ? duplicateQuery.data.data : []
  const yesterdayRecords = yesterdayFeedQuery.data?.status === "success" ? yesterdayFeedQuery.data.data : []
  const latestInventoryRow = inventoryQuery.data?.status === "success" ? inventoryQuery.data.data[0] ?? null : null
  const latestDoReading = useMemo(() => {
    const rows = doQuery.data?.status === "success" ? doQuery.data.data : []
    return rows
      .slice()
      .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))[0] ?? null
  }, [doQuery.data])
  const latestWaterStatus =
    latestWaterStatusQuery.data?.status === "success" ? latestWaterStatusQuery.data.data[0] ?? null : null
  const doValue = latestDoReading?.parameter_value ?? null
  const yesterdayFeedAmount = yesterdayRecords.reduce((sum, row) => sum + (row.feeding_amount ?? 0), 0)
  const latestDoAge = diffDateDays(latestDoReading?.date, selectedDate)
  const doTone =
    doValue == null
      ? "default"
      : doValue < 4
        ? "critical"
        : doValue < 5
          ? "warning"
          : "success"

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const systemId = Number(values.system_id)
      const feedTypeId = Number(values.feed_id)
      const batchId = values.batch_id && values.batch_id !== "none" ? Number(values.batch_id) : null
      const existingTotal = existingDailyRecords.reduce((sum, row) => sum + (row.feeding_amount ?? 0), 0)
      const dailyTotal = existingTotal + values.amount_kg
      const biomassKg = latestInventoryRow?.biomass_last_sampling ?? null
      const feedRatePct = biomassKg && biomassKg > 0 ? (dailyTotal / biomassKg) * 100 : null

      const payload = {
        system_id: systemId,
        batch_id: Number.isFinite(batchId as number) ? batchId : null,
        date: values.date,
        feed_type_id: feedTypeId,
        feeding_amount: values.amount_kg,
        feeding_response: values.feeding_response,
        notes: values.notes?.trim() ? values.notes.trim() : null,
      } as FeedingInsertOverride

      await mutation.mutateAsync(payload)
      setSubmissionSummary(
        `Saved for ${selectedSystem?.label ?? `System ${systemId}`}. Daily total: ${dailyTotal.toFixed(2)} kg${
          feedRatePct != null ? ` (${feedRatePct.toFixed(2)}% BW/day).` : "."
        }`,
      )
      form.reset({
        date: toIsoDate(new Date()),
        unit: values.unit,
        amount_kg: 0,
        system_id: values.system_id,
        feed_id: values.feed_id,
        batch_id: values.batch_id,
        feeding_response: values.feeding_response,
        notes: "",
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
    <div className="max-w-7xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Record Feeding</h2>
        <p className="text-sm text-muted-foreground">Fast cage-first feeding entry with live feed target context.</p>
      </div>

      <div className="mb-4">
        <OfflineSaveBadge result={mutation.data} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          {existingDailyRecords.length > 0 ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              Feeding is already recorded for {selectedSystem?.label ?? "this cage"} on {selectedDate}. Confirm this is an additional feed event before saving.
            </div>
          ) : null}
          {submissionSummary ? (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
              {submissionSummary}
            </div>
          ) : null}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value)
                          setSubmissionSummary(null)
                        }}
                        value={field.value}
                      >
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedUnit}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedUnit ? "Select cage" : "Select unit first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {systemsForUnit.map((system) => (
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
                  name="feed_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feed Type</FormLabel>
                      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select feed" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {feeds.map((feed) => (
                              <SelectItem key={feed.id} value={String(feed.id)}>
                                {feed.label ?? feed.feed_line ?? `Feed ${feed.id}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant={showQuickCreate ? "secondary" : "outline"}
                          size="sm"
                          className="w-full md:w-auto md:min-w-[11rem]"
                          onClick={() => setShowQuickCreate((current) => !current)}
                        >
                          {showQuickCreate ? "Hide new feed type" : "Add new feed type"}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {showQuickCreate ? <FeedTypeQuickCreate onCreated={() => setShowQuickCreate(false)} allowSupplierCreate={false} /> : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectedSystemInfo systems={systems} systemId={selectedSystemId} />
                <SelectedBatchSupplierInfo batches={batches} batchId={selectedBatchValue} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="amount_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Amount (kg)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="feeding_response"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feeding Response</FormLabel>
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

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comments</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={3}
                        className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Feed behaviour, weather, missed appetite, or any exception."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-lg border border-border/80 bg-muted/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Advanced</h3>
                    <p className="text-xs text-muted-foreground">Batch is optional and hidden by default to keep the common feeding flow fast.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAdvanced((current) => !current)}>
                    {showAdvanced ? "Hide" : "Show"}
                  </Button>
                </div>
                {showAdvanced ? (
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="batch_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Batch (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
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
                ) : null}
              </div>

              <Button type="submit" disabled={form.formState.isSubmitting || mutation.isPending}>
                {(form.formState.isSubmitting || mutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Entry
              </Button>
            </form>
          </Form>
        </div>

        <div className="space-y-4">
          <InfoPanel title="Cage Feed Context">
            <InfoStat
              label="Latest DO"
              tone={doTone}
              value={
                doValue != null
                  ? `${doValue.toFixed(2)} mg/L${latestDoAge != null ? ` · ${formatRelativeDays(latestDoAge)}` : ""}`
                  : "No DO reading"
              }
            />
            <InfoStat
              label="Yesterday's Feed"
              value={previousDate ? `${yesterdayFeedAmount.toFixed(2)} kg on ${previousDate}` : "No prior day"}
            />
            <InfoStat
              label="ABW / Biomass"
              value={
                latestInventoryRow?.abw_last_sampling != null && latestInventoryRow?.biomass_last_sampling != null
                  ? `${latestInventoryRow.abw_last_sampling.toFixed(2)} g · ${latestInventoryRow.biomass_last_sampling.toFixed(2)} kg`
                  : "No recent sampling snapshot"
              }
            />
            <InfoStat
              label="Active DO Alert"
              tone={latestWaterStatus?.do_exceeded ? "critical" : "default"}
              value={
                latestWaterStatus?.do_exceeded
                  ? `DO threshold exceeded${latestWaterStatus.low_do_threshold != null ? ` (< ${latestWaterStatus.low_do_threshold} mg/L)` : ""}`
                  : "No active DO warning"
              }
            />
            {selectedFeed?.feed_pellet_size ? (
              <InfoStat label="Pellet Guide" value={selectedFeed.feed_pellet_size} />
            ) : null}
          </InfoPanel>
        </div>
      </div>
    </div>
  )
}
