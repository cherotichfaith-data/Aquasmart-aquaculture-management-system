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
import { formatCageLabel, type SystemOption } from "@/lib/system-options"
import { useTransferData } from "@/features/reports/hooks"
import { useRecordTransfer } from "@/lib/hooks/use-transfer"
import { logSbError } from "@/lib/supabase/log"
import { TRANSFER_TYPE_LABELS, UI_TRANSFER_TYPES } from "@/lib/transfer-types"
import { OfflineSaveBadge } from "@/components/offline/offline-save-badge"
import { resolveBatchIdForSystem, type BatchOptionItem } from "@/features/shared/batch-options"
import {
  findUnitForSystem,
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
  pickSameDayEntry,
  usePendingLatestEntries,
  type LatestEntrySummary,
} from "./latest-entry-guard"
import { SelectionChips } from "./selection-info"
import { FieldGrid, FormActions, FormSection } from "./form-layout"

const EXTERNAL_DESTINATION = "__external__"

const formSchema = z.object({
  origin_unit: z.string().min(1, "Origin unit is required"),
  origin_system_id: z.string().min(1, "Origin cage is required"),
  target_unit: z.string().optional(),
  target_system_id: z.string().optional(),
  external_target_name: z.string().optional(),
  transfer_type: z.enum(UI_TRANSFER_TYPES),
  date: z.string().min(1, "Date is required"),
  number_of_fish: z.coerce.number().int("Count must be a whole number").min(1, "Count must be positive"),
  total_weight_kg: z.coerce.number().min(0.01, "Weight must be positive"),
  notes: z.string().max(500, "Comments must be 500 characters or fewer").optional(),
}).superRefine((values, ctx) => {
  if (values.transfer_type === "external_out") {
    if (!values.external_target_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["external_target_name"],
        message: "External destination is required",
      })
    }
    return
  }

  if (!values.target_unit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["target_unit"],
      message: "Destination unit is required",
    })
  }
  if (!values.target_system_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["target_system_id"],
      message: "Destination cage is required",
    })
  }
})

interface TransferFormProps {
  farmId: string | null
  systems: SystemOption[]
  batches: BatchOptionItem[]
  defaultSystemId?: number | null
  defaultBatchId?: number | null
  onSystemChange?: (systemId: number | null) => void
}

export function TransferForm({ farmId, systems, batches, defaultSystemId = null, onSystemChange }: TransferFormProps) {
  const mutation = useRecordTransfer()

  const units = useMemo(() => getSystemUnits(systems), [systems])
  const defaultUnit = findUnitForSystem(systems, defaultSystemId)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      date: toIsoDate(new Date()),
      number_of_fish: 0,
      total_weight_kg: 0,
      origin_unit: defaultUnit,
      origin_system_id: defaultSystemId ? String(defaultSystemId) : "",
      target_unit: "",
      target_system_id: "",
      external_target_name: "",
      transfer_type: "transfer",
      notes: "",
    },
  })
  const defaultSystemValue = defaultSystemId ? String(defaultSystemId) : ""

  const originUnit = useWatch({ control: form.control, name: "origin_unit" })
  const targetUnit = useWatch({ control: form.control, name: "target_unit" })
  const originSystemId = useWatch({ control: form.control, name: "origin_system_id" })
  const selectedDate = useWatch({ control: form.control, name: "date" })
  const transferType = useWatch({ control: form.control, name: "transfer_type" })
  const isExternalOut = transferType === "external_out"
  const resolvedOriginSystemId = Number(originSystemId)
  const hasValidOriginSystemId = Number.isFinite(resolvedOriginSystemId) && resolvedOriginSystemId > 0
  const originSystemsForUnit = useMemo(() => getSystemsForUnit(systems, originUnit), [originUnit, systems])
  const targetSystemsForUnit = useMemo(() => getSystemsForUnit(systems, targetUnit), [targetUnit, systems])

  useEffect(() => {
    if (!defaultSystemValue) return
    const resolvedUnit = findUnitForSystem(systems, defaultSystemId)
    if (!resolvedUnit) return

    const currentSystem = form.getValues("origin_system_id")
    if (currentSystem && currentSystem !== defaultSystemValue) return

    if (form.getValues("origin_unit") !== resolvedUnit) {
      form.setValue("origin_unit", resolvedUnit, { shouldValidate: true })
    }
    if (currentSystem !== defaultSystemValue) {
      form.setValue("origin_system_id", defaultSystemValue, { shouldValidate: true })
    }
  }, [defaultSystemId, defaultSystemValue, form, systems])

  useEffect(() => {
    if (!originUnit) return
    const currentValue = form.getValues("origin_system_id")
    if (!currentValue) return
    if (!originSystemsForUnit.some((system) => String(system.id) === currentValue)) {
      form.setValue("origin_system_id", "", { shouldValidate: true })
    }
  }, [form, originUnit, originSystemsForUnit])

  useEffect(() => {
    if (!targetUnit) return
    const currentValue = form.getValues("target_system_id")
    if (!currentValue || currentValue === EXTERNAL_DESTINATION) return
    if (!targetSystemsForUnit.some((system) => String(system.id) === currentValue)) {
      form.setValue("target_system_id", "", { shouldValidate: true })
    }
  }, [form, targetUnit, targetSystemsForUnit])

  useEffect(() => {
    onSystemChange?.(hasValidOriginSystemId ? resolvedOriginSystemId : null)
  }, [hasValidOriginSystemId, onSystemChange, resolvedOriginSystemId])

  const resolvedBatchId = useMemo(
    () => resolveBatchIdForSystem(batches, resolvedOriginSystemId),
    [batches, resolvedOriginSystemId],
  )
  const duplicateQuery = useTransferData({
    farmId,
    systemId: hasValidOriginSystemId ? resolvedOriginSystemId : undefined,
    dateFrom: selectedDate || undefined,
    dateTo: selectedDate || undefined,
    limit: 20,
    enabled: hasValidOriginSystemId && Boolean(selectedDate),
  })
  const pendingEntries = usePendingLatestEntries("transfer", hasValidOriginSystemId ? resolvedOriginSystemId : null)
  const duplicateServerEntries = (duplicateQuery.data?.status === "success" ? duplicateQuery.data.data : []).map<LatestEntrySummary>((row) => ({
    key: `transfer-duplicate-${row.id ?? row.created_at ?? row.date ?? "entry"}`,
    date: row.date ?? "",
    createdAt: row.created_at ?? null,
    summary: `${row.number_of_fish_transfer ?? 0} fish transferred`,
    details: [],
  }))
  const duplicateEntry = pickSameDayEntry([...duplicateServerEntries, ...pendingEntries], selectedDate)

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (duplicateEntry) {
        form.setError("date", { message: `A transfer entry already exists for ${values.date}.` })
        return
      }

      const resolvedFarmId = requireActiveFarmId(farmId)
      const isExternalTransfer = values.transfer_type === "external_out"
      if (!isExternalTransfer && values.origin_system_id === values.target_system_id) {
        form.setError("target_system_id", { message: "Origin and destination cannot be the same" })
        return
      }

      const originId = parseRequiredNumericId(values.origin_system_id, "Origin cage")
      const targetId =
        values.target_system_id && values.target_system_id !== EXTERNAL_DESTINATION
          ? parseRequiredNumericId(values.target_system_id, "Destination cage")
          : null
      const resolvedTransferType = isExternalTransfer ? "external_out" : values.transfer_type

      await mutation.mutateAsync({
        farm_id: resolvedFarmId,
        origin_system_id: originId,
        target_system_id: isExternalTransfer ? null : targetId,
        external_target_name:
          resolvedTransferType === "external_out" ? values.external_target_name?.trim() ?? null : null,
        transfer_type: resolvedTransferType,
        batch_id: resolvedBatchId,
        date: values.date,
        number_of_fish_transfer: values.number_of_fish,
        total_weight_transfer: values.total_weight_kg,
        notes: values.notes?.trim() ? values.notes.trim() : null,
      })

      form.reset({
        date: toIsoDate(new Date()),
        number_of_fish: 0,
        total_weight_kg: 0,
        origin_unit: values.origin_unit,
        origin_system_id: values.origin_system_id,
        target_unit: "",
        target_system_id: "",
        external_target_name: "",
        transfer_type: values.transfer_type,
        notes: "",
      })
    } catch (error) {
      logSbError("dataEntry:transfer:submit", error)
      reportDataEntrySubmitError(error, "Failed to record transfer.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="data-entry-status">
        <OfflineSaveBadge result={mutation.data} />
      </div>

      {isExternalOut ? (
        <div className="data-entry-callout-alert border-warning/40 bg-warning/10 text-warning">
          Fish will leave this farm system and no receiving cage will be tracked.
        </div>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormSection title="Record transfer">
            <SelectionChips
              systems={systems}
              systemId={resolvedOriginSystemId}
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
                name="transfer_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transfer Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value)
                        if (value === "external_out") {
                          form.setValue("target_system_id", EXTERNAL_DESTINATION, { shouldValidate: false })
                        } else if (form.getValues("target_system_id") === EXTERNAL_DESTINATION) {
                          form.setValue("target_system_id", "", { shouldValidate: false })
                          form.setValue("external_target_name", "")
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select transfer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UI_TRANSFER_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {TRANSFER_TYPE_LABELS[type]}
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
                name="origin_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origin Unit</FormLabel>
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
                name="origin_system_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origin Cage</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!originUnit}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={originUnit ? "Select origin" : "Select unit first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {originSystemsForUnit.map((system) => (
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

              {isExternalOut ? (
                <FormField
                  control={form.control}
                  name="external_target_name"
                  render={({ field }) => (
                    <FormItem className="data-entry-field-wide">
                      <FormLabel>Destination Location</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. KIMBWELA Pond 3" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="target_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destination Unit</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            if (value === EXTERNAL_DESTINATION) {
                              form.setValue("transfer_type", "external_out", { shouldValidate: true })
                              form.setValue("target_system_id", EXTERNAL_DESTINATION, { shouldValidate: false })
                              return
                            }
                            field.onChange(value)
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
                            <SelectItem value={EXTERNAL_DESTINATION}>External location</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="target_system_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destination Cage</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!targetUnit}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={targetUnit ? "Select destination" : "Select unit first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {targetSystemsForUnit.map((system) => (
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
                </>
              )}

              <FormField
                control={form.control}
                name="number_of_fish"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Fish</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" inputMode="numeric" {...field} />
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
                      <Input type="number" step="0.01" inputMode="decimal" {...field} />
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
                    <FormLabel>Comment</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={3}
                        className="data-entry-textarea"
                        placeholder="Reason for movement, handling detail, or receiving location note."
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
              Record Transfer
            </Button>
          </FormActions>
        </form>
      </Form>
    </div>
  )
}
