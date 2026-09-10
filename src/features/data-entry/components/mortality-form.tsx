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
import { useRecordMortality } from "@/features/data-entry/hooks"
import { useMortalityData } from "@/features/reports/hooks"
import { formatCageLabel, type SystemOption } from "@/lib/system-options"
import { MORTALITY_CAUSES, type MortalityCause } from "@/lib/mortality"
import { logSbError } from "@/lib/supabase/log"
import { OfflineSaveBadge } from "@/components/offline/offline-save-badge"
import { resolveBatchIdForSystem, type BatchOptionItem } from "@/features/shared/batch-options"
import {
  findUnitForSystem,
  getSystemUnits,
  getSystemsForUnit,
} from "./form-support"
import {
  pickSameDayEntry,
  usePendingLatestEntries,
  type LatestEntrySummary,
} from "./latest-entry-guard"
import { SelectionChips } from "./selection-info"
import { FieldGrid, FormActions, FormSection } from "./form-layout"
import {
  parseRequiredNumericId,
  reportDataEntrySubmitError,
  requireActiveFarmId,
  toIsoDate,
} from "./form-utils"

const formSchema = z.object({
  unit: z.string().min(1, "Cage unit is required"),
  system_id: z.string().min(1, "Cage number is required"),
  date: z.string().min(1, "Date is required"),
  number_of_fish: z.coerce.number().int("Count must be a whole number").min(1, "Must be positive"),
  cause: z.enum(MORTALITY_CAUSES, { errorMap: () => ({ message: "Cause is required" }) }),
  total_weight_mortality: z.preprocess((value) => (value === "" ? undefined : value), z.coerce.number().min(0).optional()),
  notes: z.string().max(500, "Notes must be 500 characters or fewer").optional(),
}).superRefine((values, ctx) => {
  if (values.number_of_fish >= 100 && values.total_weight_mortality == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["total_weight_mortality"],
      message: "Total dead weight is required for 100 or more dead fish.",
    })
  }
})

interface MortalityFormProps {
  farmId: string | null
  systems: SystemOption[]
  batches: BatchOptionItem[]
  defaultSystemId?: number | null
  defaultBatchId?: number | null
  onSystemChange?: (systemId: number | null) => void
}

const CAUSE_LABELS: Record<MortalityCause, string> = {
  unknown: "Unknown",
  hypoxia: "Low DO / Hypoxia",
  disease: "Disease",
  injury: "Injury",
  handling: "Handling",
  predator: "Predator",
  starvation: "Starvation",
  temperature: "Temperature",
  other: "Other",
}

export function MortalityForm({ farmId, systems, batches, defaultSystemId = null, onSystemChange }: MortalityFormProps) {
  const mutation = useRecordMortality()

  const units = useMemo(() => getSystemUnits(systems), [systems])
  const defaultUnit = findUnitForSystem(systems, defaultSystemId)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      date: toIsoDate(new Date()),
      unit: defaultUnit,
      number_of_fish: 0,
      system_id: defaultSystemId ? String(defaultSystemId) : "",
      total_weight_mortality: undefined,
      notes: "",
    },
  })
  const defaultSystemValue = defaultSystemId ? String(defaultSystemId) : ""

  const selectedUnit = useWatch({ control: form.control, name: "unit" })
  const selectedSystemValue = useWatch({ control: form.control, name: "system_id" })
  const mortalityCount = useWatch({ control: form.control, name: "number_of_fish" })
  const selectedDate = useWatch({ control: form.control, name: "date" })
  const resolvedSystemId = Number(selectedSystemValue)
  const hasValidSystemId = Number.isFinite(resolvedSystemId) && resolvedSystemId > 0
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
    onSystemChange?.(hasValidSystemId ? resolvedSystemId : null)
  }, [hasValidSystemId, onSystemChange, resolvedSystemId])

  const resolvedBatchId = resolveBatchIdForSystem(batches, resolvedSystemId)

  const duplicateQuery = useMortalityData({
    farmId,
    systemId: hasValidSystemId ? resolvedSystemId : undefined,
    dateFrom: selectedDate || undefined,
    dateTo: selectedDate || undefined,
    limit: 20,
    enabled: hasValidSystemId && Boolean(selectedDate),
  })
  const pendingEntries = usePendingLatestEntries("mortality", hasValidSystemId ? resolvedSystemId : null)

  const duplicateServerEntries = (duplicateQuery.data?.status === "success" ? duplicateQuery.data.data : []).map<LatestEntrySummary>((row) => ({
    key: `mortality-duplicate-${row.id ?? row.created_at ?? row.date ?? "entry"}`,
    date: row.date ?? "",
    createdAt: row.created_at ?? null,
    summary: `${row.number_of_fish_mortality ?? 0} dead fish`,
    details: [],
  }))
  const duplicateEntry = pickSameDayEntry([...duplicateServerEntries, ...pendingEntries], selectedDate)

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (duplicateEntry) {
        form.setError("date", { message: `A mortality entry already exists for ${values.date}.` })
        return
      }

      const resolvedFarmId = requireActiveFarmId(farmId)
      const systemId = parseRequiredNumericId(values.system_id, "Cage number")

      await mutation.mutateAsync({
        farm_id: resolvedFarmId,
        system_id: systemId,
        batch_id: resolvedBatchId,
        date: values.date,
        number_of_fish_mortality: values.number_of_fish,
        total_weight_mortality: values.total_weight_mortality ?? null,
        cause: values.cause,
        notes: values.notes?.trim() ? values.notes.trim() : null,
      })

      form.reset({
        date: toIsoDate(new Date()),
        unit: values.unit,
        number_of_fish: 0,
        system_id: values.system_id,
        total_weight_mortality: undefined,
        notes: "",
      })
    } catch (error) {
      logSbError("dataEntry:mortality:submit", error)
      reportDataEntrySubmitError(error, "Failed to record mortality.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="data-entry-status">
        <OfflineSaveBadge result={mutation.data} />
      </div>

      {mortalityCount >= 100 ? (
        <div className="data-entry-callout-alert border-destructive/40 bg-destructive/10 text-destructive">
          Mass mortality threshold exceeded. Weigh the dead fish and record the total dead weight, then complete a DO and water-quality check for this cage.
        </div>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormSection title="Record mortality">
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedUnit}>
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
                    <FormLabel>Number of Dead Fish</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cause"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cause</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select cause" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MORTALITY_CAUSES.map((cause) => (
                          <SelectItem key={cause} value={cause}>
                            {CAUSE_LABELS[cause]}
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
                name="total_weight_mortality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Dead Weight (kg){mortalityCount >= 100 ? " *" : ""}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" inputMode="decimal" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="data-entry-field-wide">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={3}
                        className="data-entry-textarea"
                        placeholder="Observed signs, handling issue, water condition, or follow-up action."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FieldGrid>
          </FormSection>

          <FormActions>
            <Button
              type="submit"
              className="min-h-11 rounded-lg px-5"
              disabled={form.formState.isSubmitting || mutation.isPending}
            >
              {(form.formState.isSubmitting || mutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Mortality
            </Button>
          </FormActions>
        </form>
      </Form>
    </div>
  )
}
