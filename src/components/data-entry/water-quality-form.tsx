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
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/app/use-toast"
import { useSystemOptions } from "@/lib/hooks/use-options"
import { useRecordWaterQuality } from "@/lib/hooks/use-water-quality"
import { logSbError } from "@/lib/supabase/log"
import { OfflineSaveBadge } from "@/components/offline/offline-save-badge"
import { InfoPanel, InfoStat } from "./form-support"
import { SelectedSystemInfo } from "./selection-info"

const optionalNumber = z.preprocess(
  (value) => (value === "" || value == null ? undefined : Number(value)),
  z.number().optional(),
)

const formSchema = z.object({
  system_id: z.string().min(1, "System is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  location_reference: z.string().optional(),
  water_depth: z.coerce.number().min(0, "Depth must be positive"),
  temperature: optionalNumber,
  dissolved_oxygen: optionalNumber,
  ph: optionalNumber,
  total_ammonia: optionalNumber,
  no2: optionalNumber,
  no3: optionalNumber,
  salinity: optionalNumber,
  secchi_disk: optionalNumber,
})

type MeasurementParameter =
  Database["public"]["Tables"]["water_quality_measurement"]["Row"]["parameter_name"]

const nearestQuarterHour = () => {
  const now = new Date()
  const minutes = now.getMinutes()
  const rounded = Math.round(minutes / 15) * 15
  now.setMinutes(rounded, 0, 0)
  return now.toISOString().split("T")[1]?.slice(0, 5) ?? "08:00"
}

export function WaterQualityForm({
  farmId,
  systems,
  defaultSystemId = null,
}: {
  farmId: string | null
  systems: SystemOption[]
  defaultSystemId?: number | null
}) {
  const mutation = useRecordWaterQuality()
  const { toast } = useToast()
  const supabase = useMemo(() => createClient(), [])
  const [doClassification, setDoClassification] = useState<Database["public"]["Enums"]["water_quality_rating"] | null>(null)

  const allSystemsQuery = useSystemOptions({ farmId, activeOnly: false, enabled: Boolean(farmId) })
  const allSystems = allSystemsQuery.data?.status === "success" ? allSystemsQuery.data.data : []
  const lakeReferenceSystem = allSystems.find((system) => system.label?.toLowerCase().includes("lake reference")) ?? null
  const selectableSystems = useMemo(() => {
    const activeIds = new Set(systems.map((system) => system.id))
    if (lakeReferenceSystem && !activeIds.has(lakeReferenceSystem.id)) {
      return [...systems, lakeReferenceSystem]
    }
    return systems
  }, [lakeReferenceSystem, systems])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      system_id: defaultSystemId ? String(defaultSystemId) : "",
      time: nearestQuarterHour(),
      location_reference: "",
      water_depth: 1,
      temperature: undefined,
      dissolved_oxygen: undefined,
      ph: undefined,
      total_ammonia: undefined,
      no2: undefined,
      no3: undefined,
      salinity: undefined,
      secchi_disk: undefined,
    },
  })

  const selectedSystemValue = form.watch("system_id")
  const selectedSystemId = Number(selectedSystemValue)
  const doValue = form.watch("dissolved_oxygen")
  const selectedTime = form.watch("time")
  const selectedDepth = form.watch("water_depth")
  const selectedSystem =
    selectableSystems.find((system) => String(system.id) === selectedSystemValue) ?? null
  const isLakeReference = selectedSystem?.label?.toLowerCase().includes("lake reference") ?? false

  useEffect(() => {
    let active = true

    async function classifyDo() {
      if (typeof doValue !== "number" || Number.isNaN(doValue)) {
        if (active) setDoClassification(null)
        return
      }

      const { data: framework, error: frameworkError } = await supabase
        .from("water_quality_framework")
        .select("parameter_optimal, parameter_acceptable, parameter_critical, parameter_lethal")
        .eq("parameter_name", "dissolved_oxygen")
        .maybeSingle()

      if (frameworkError || !framework) {
        if (active) setDoClassification(null)
        return
      }

      const { data, error } = await supabase.rpc("classify_water_quality_measurement", {
        p_parameter_value: doValue,
        p_optimal: framework.parameter_optimal,
        p_acceptable: framework.parameter_acceptable,
        p_critical: framework.parameter_critical,
        p_lethal: framework.parameter_lethal,
      })

      if (!active || error) return
      setDoClassification(data?.[0]?.measurement_rating ?? null)
    }

    void classifyDo()

    return () => {
      active = false
    }
  }, [doValue, supabase])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (isLakeReference && !values.location_reference?.trim()) {
        form.setError("location_reference", {
          message: "Location / reference is required for LAKE measurements",
        })
        return
      }

      const systemId = Number(values.system_id)
      const measurements: Array<{
        parameter_name: MeasurementParameter
        parameter_value: number
      }> = []

      if (typeof values.temperature === "number") measurements.push({ parameter_name: "temperature", parameter_value: values.temperature })
      if (typeof values.dissolved_oxygen === "number") measurements.push({ parameter_name: "dissolved_oxygen", parameter_value: values.dissolved_oxygen })
      if (typeof values.ph === "number") measurements.push({ parameter_name: "pH", parameter_value: values.ph })
      if (typeof values.total_ammonia === "number") measurements.push({ parameter_name: "ammonia", parameter_value: values.total_ammonia })
      if (typeof values.no2 === "number") measurements.push({ parameter_name: "nitrite", parameter_value: values.no2 })
      if (typeof values.no3 === "number") measurements.push({ parameter_name: "nitrate", parameter_value: values.no3 })
      if (typeof values.salinity === "number") measurements.push({ parameter_name: "salinity", parameter_value: values.salinity })
      if (typeof values.secchi_disk === "number") measurements.push({ parameter_name: "secchi_disk_depth", parameter_value: values.secchi_disk })

      if (measurements.length === 0) {
        throw new Error("Enter at least one water quality measurement.")
      }

      const payload = measurements.map((measurement) => ({
        system_id: systemId,
        date: values.date,
        time: values.time,
        measured_at: `${values.date}T${values.time}:00`,
        water_depth: values.water_depth,
        parameter_name: measurement.parameter_name,
        parameter_value: measurement.parameter_value,
        location_reference: values.location_reference?.trim() ? values.location_reference.trim() : null,
      }))

      await mutation.mutateAsync(payload)
      form.reset({
        date: new Date().toISOString().split("T")[0],
        system_id: values.system_id,
        time: values.time,
        location_reference: isLakeReference ? values.location_reference : "",
        water_depth: values.water_depth,
        temperature: undefined,
        dissolved_oxygen: undefined,
        ph: undefined,
        total_ammonia: undefined,
        no2: undefined,
        no3: undefined,
        salinity: undefined,
        secchi_disk: undefined,
      })
    } catch (error) {
      logSbError("dataEntry:waterQuality:submit", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record water quality data.",
      })
    }
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Record Water Quality</h2>
        <p className="text-sm text-muted-foreground">Multi-parameter entry with a live dissolved oxygen classification preview.</p>
      </div>

      <div className="mb-4">
        <OfflineSaveBadge result={mutation.data} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          {selectedTime < "12:00" ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              Morning measurement logged. Remember to return for the PM measurement as well.
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
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" step="900" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="system_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System / Cage</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select system" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectableSystems.map((system) => (
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
                  name="location_reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isLakeReference ? "Location / Reference" : "Location / Reference (Optional)"}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={isLakeReference ? "e.g. lake edge, 20m from cage line" : "Optional reference note"}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="water_depth"
                render={({ field }) => (
                  <FormItem className="max-w-sm">
                    <FormLabel>Water Depth (m)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SelectedSystemInfo systems={selectableSystems} systemId={selectedSystemId} />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature (C)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dissolved_oxygen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DO (mg/L)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ph"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>pH</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="total_ammonia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ammonia (mg/L)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="no2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nitrite (mg/L)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="no3"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nitrate (mg/L)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="salinity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salinity (ppt)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="secchi_disk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secchi Disk (m)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value ?? ""} />
                      </FormControl>
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

        <InfoPanel title="DO Classification Preview">
          <InfoStat
            label="DO Rating"
            tone={
              doClassification === "lethal"
                ? "critical"
                : doClassification === "critical"
                  ? "warning"
                  : doClassification === "acceptable"
                    ? "default"
                    : doClassification === "optimal"
                      ? "success"
                      : "default"
            }
            value={doClassification ? doClassification.replace("_", " ") : "Enter DO value"}
          />
          <InfoStat label="Selected System" value={selectedSystem?.label ?? "No system selected"} />
          <InfoStat label="Depth" value={`${selectedDepth} m`} />
          <InfoStat label="PM Check" value={selectedTime < "12:00" ? "Still due today" : "PM reading captured"} />
        </InfoPanel>
      </div>
    </div>
  )
}
