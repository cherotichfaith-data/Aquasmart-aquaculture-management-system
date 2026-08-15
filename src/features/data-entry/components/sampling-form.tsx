"use client"

import { useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/app-ui/button"
import { Loader2 } from "lucide-react"
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
import { useRecordSampling } from "@/features/sampling/hooks"
import { useSamplingData } from "@/features/reports/hooks"
import { formatCageLabel, type SystemOption } from "@/lib/system-options"
import { diffDateDays } from "@/lib/time-series"
import { logSbError } from "@/lib/supabase/log"
import { OfflineSaveBadge } from "@/components/offline/offline-save-badge"
import { resolveBatchIdForSystem, type BatchOptionItem } from "@/features/shared/batch-options"
import {
  InfoPanel,
  InfoStat,
  findUnitForSystem,
  formatRelativeDays,
  getSystemUnits,
  getSystemsForUnit,
} from "./form-support"
import {
  parseRequiredNumericId,
  reportDataEntrySubmitError,
  requireActiveFarmId,
  toIsoDate,
} from "./form-utils"
import {
  LatestEntryGuard,
  pickLatestEntryByRecordDate,
  usePendingLatestEntries,
  type LatestEntrySummary,
} from "./latest-entry-guard"
import { SelectedBatchSupplierInfo, SelectedSystemInfo } from "./selection-info"

const formSchema = z.object({
  unit: z.string().min(1, "Cage unit is required"),
  system_id: z.string().min(1, "Cage number is required"),
  date: z.string().min(1, "Date is required"),
  number_of_fish: z.coerce.number().int("Sample count must be a whole number").min(1, "Sample count must be at least 1"),
  total_weight_kg: z.coerce.number().min(0.001, "Weight must be positive"),
  notes: z.string().max(500, "Comments must be 500 characters or fewer").optional(),
})

interface SamplingFormProps {
  farmId: string | null
  systems: SystemOption[]
  batches: BatchOptionItem[]
  defaultSystemId?: number | null
  defaultBatchId?: number | null
  onSystemChange?: (systemId: number | null) => void
}

const projectAbwFromHistory = (
  latestAbw: number | null | undefined,
  latestDate: string | null | undefined,
  priorAbw: number | null | undefined,
  priorDate: string | null | undefined,
  targetDate: string | null | undefined,
) => {
  if (!latestAbw || !latestDate || !targetDate) return null
  if (!priorAbw || !priorDate) return latestAbw
  const intervalDays = diffDateDays(priorDate, latestDate)
  const projectionDays = diffDateDays(latestDate, targetDate)
  if (!intervalDays || projectionDays == null) return latestAbw
  const sgrPerDay = Math.log(latestAbw / priorAbw) / intervalDays
  return latestAbw * Math.exp(sgrPerDay * projectionDays)
}

export function SamplingForm({ farmId, systems, batches, defaultSystemId = null, onSystemChange }: SamplingFormProps) {
  const mutation = useRecordSampling()

  const units = useMemo(() => getSystemUnits(systems), [systems])
  const defaultUnit = findUnitForSystem(systems, defaultSystemId)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      date: toIsoDate(new Date()),
      unit: defaultUnit,
      number_of_fish: 0,
      total_weight_kg: 0,
      system_id: defaultSystemId ? String(defaultSystemId) : "",
      notes: "",
    },
  })
  const defaultSystemValue = defaultSystemId ? String(defaultSystemId) : ""

  const selectedUnit = useWatch({ control: form.control, name: "unit" })
  const selectedSystemValue = useWatch({ control: form.control, name: "system_id" })
  const selectedSystemId = Number(selectedSystemValue)
  const selectedDate = useWatch({ control: form.control, name: "date" })
  const systemsForUnit = useMemo(() => getSystemsForUnit(systems, selectedUnit), [selectedUnit, systems])
  const resolvedBatchId = useMemo(
    () => resolveBatchIdForSystem(batches, selectedSystemId),
    [batches, selectedSystemId],
  )

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

  const hasValidSystemId = Number.isFinite(selectedSystemId) && selectedSystemId > 0

  useEffect(() => {
    onSystemChange?.(hasValidSystemId ? selectedSystemId : null)
  }, [hasValidSystemId, onSystemChange, selectedSystemId])

  const samplingHistoryQuery = useSamplingData({
    farmId,
    systemId: hasValidSystemId ? selectedSystemId : undefined,
    limit: 10,
    enabled: hasValidSystemId,
  })
  const latestEntryQuery = useSamplingData({
    farmId,
    systemId: hasValidSystemId ? selectedSystemId : undefined,
    limit: 1,
    enabled: hasValidSystemId,
  })
  const pendingEntries = usePendingLatestEntries("sampling", hasValidSystemId ? selectedSystemId : null)

  const samplingHistory = useMemo(() => {
    const rows = samplingHistoryQuery.data?.status === "success" ? samplingHistoryQuery.data.data : []
    return rows
      .filter((row) => !selectedDate || row.date <= selectedDate)
      .sort((a, b) => `${b.date}`.localeCompare(`${a.date}`))
  }, [samplingHistoryQuery.data, selectedDate])
  const previousSample = samplingHistory[0] ?? null
  const priorSample = samplingHistory[1] ?? null
  const projectedAbw = projectAbwFromHistory(
    previousSample?.abw,
    previousSample?.date,
    priorSample?.abw,
    priorSample?.date,
    selectedDate,
  )
  const daysSinceLastSample = diffDateDays(previousSample?.date, selectedDate)
  const isVeryRecentResample = daysSinceLastSample != null && daysSinceLastSample < 10
  const latestServerEntries = (latestEntryQuery.data?.status === "success" ? latestEntryQuery.data.data : []).map<LatestEntrySummary>((row) => ({
    key: `sampling-${row.id ?? row.created_at ?? row.date ?? "latest"}`,
    date: row.date ?? "",
    createdAt: row.created_at ?? null,
    summary: `${row.number_of_fish_sampling ?? 0} fish sampled`,
    details: [
      { label: "Total Weight", value: row.total_weight_sampling != null ? `${row.total_weight_sampling} kg` : "Not recorded" },
      { label: "ABW", value: row.abw != null ? `${row.abw.toFixed(2)} g` : "Not recorded" },
    ],
  }))
  const latestEntry = pickLatestEntryByRecordDate([...latestServerEntries, ...pendingEntries])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const resolvedFarmId = requireActiveFarmId(farmId)
      const systemId = parseRequiredNumericId(values.system_id, "Cage number")

      await mutation.mutateAsync({
        farm_id: resolvedFarmId,
        system_id: systemId,
        batch_id: resolvedBatchId,
        date: values.date,
        number_of_fish_sampling: values.number_of_fish,
        total_weight_sampling: values.total_weight_kg,
        notes: values.notes?.trim() ? values.notes.trim() : null,
      })

      form.reset({
        date: toIsoDate(new Date()),
        unit: values.unit,
        number_of_fish: 0,
        total_weight_kg: 0,
        system_id: values.system_id,
        notes: "",
      })
    } catch (error) {
      logSbError("dataEntry:sampling:submit", error)
      reportDataEntrySubmitError(error, "Failed to record sampling.")
    }
  }

  return (
    <div>
      <div className="data-entry-form-intro">
        <h2 className="text-xl font-semibold tracking-tight">Record Sampling</h2>
      </div>

      <div className="data-entry-status">
        <OfflineSaveBadge result={mutation.data} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <LatestEntryGuard
            latestEntry={latestEntry}
            duplicateEntry={null}
            itemLabel="sampling"
            isLoading={latestEntryQuery.isLoading}
          />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-3.5">
              <div className="data-entry-secondary-grid">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="max-w-xs" {...field} />
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
                          <SelectTrigger className="max-w-xs">
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
                          <SelectTrigger className="max-w-xs">
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

              </div>

              <div className="data-entry-secondary-grid">
                <SelectedSystemInfo systems={systems} systemId={selectedSystemId} />
                <SelectedBatchSupplierInfo batches={batches} batchId={resolvedBatchId} />
              </div>

              <div className="data-entry-secondary-grid">
              <FormField
                  control={form.control}
                  name="number_of_fish"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Fish Sampled</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" className="max-w-xs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="total_weight_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Weight (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className="max-w-xs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isVeryRecentResample ? (
                <div className="data-entry-callout-alert rounded-md border border-warning/40 bg-warning/10 text-sm text-warning">
                  Last sampling was {formatRelativeDays(daysSinceLastSample)}. Bi-weekly and monthly schedules are supported, but this entry is close to the previous sample, so confirm the date before saving.
                </div>
              ) : null}

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
                        className="data-entry-textarea"
                        placeholder="Net size, fish condition, uneven sample, or any reason the reading may be atypical."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-1">
                <Button type="submit" className="min-h-11 rounded-lg px-5" disabled={form.formState.isSubmitting || mutation.isPending}>
                  {(form.formState.isSubmitting || mutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Sampling
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div className="space-y-4">
          <InfoPanel title="Sampling Checks">
            <InfoStat
              label="Previous ABW"
              value={previousSample?.abw != null ? `${previousSample.abw.toFixed(2)} g` : "No prior sample"}
            />
            <InfoStat
              label="Days Since Last Sample"
              value={daysSinceLastSample != null ? formatRelativeDays(daysSinceLastSample) : "No prior sample"}
            />
            <InfoStat
              label="Expected ABW Today"
              value={projectedAbw != null ? `${projectedAbw.toFixed(2)} g` : "Projection unavailable"}
            />
          </InfoPanel>
        </div>
      </div>

    </div>
  )
}

