"use client"

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
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Tables } from "@/lib/types/database"

const formSchema = z.object({
    system_id: z.string().min(1, "System is required"),
    date: z.string().min(1, "Date is required"),
    time: z.string().min(1, "Time is required"),
    water_depth: z.coerce.number().min(0, "Depth must be positive"),
    temperature: z.coerce.number().optional(),
    dissolved_oxygen: z.coerce.number().optional(),
    ph: z.coerce.number().optional(),
    total_ammonia: z.coerce.number().optional(),
    no2: z.coerce.number().optional(),
    no3: z.coerce.number().optional(),
    salinity: z.coerce.number().optional(),
    secchi_disk: z.coerce.number().optional(),
})

interface WaterQualityFormProps {
    systems: Tables<"system">[]
}

export function WaterQualityForm({ systems }: WaterQualityFormProps) {
    const { toast } = useToast()
    const supabase = createClient()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date().toISOString().split("T")[0],
            system_id: "",
            time: new Date().toISOString().split("T")[1]?.slice(0, 5) ?? "08:00",
            water_depth: 0,
            // Use empty strings for optional number inputs to avoid "0" default if not desired, 
            // or 0 if acceptable. For paramters like pH, 0 is invalid/extreme.
            // We use standard values or undefined->"" via controller if possible, 
            // but to fix the "uncontrolled" error, we need a defined value.
            // Let's use undefined, BUT we must ensure the Input field uses value={field.value ?? ""}
            // However, the error says it changing from undefined to defined.
            // So we MUST initialize with "".
            temperature: "" as any,
            dissolved_oxygen: "" as any,
            ph: "" as any,
            total_ammonia: "" as any,
            no2: "" as any,
            no3: "" as any,
            salinity: "" as any,
            secchi_disk: "" as any,
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const systemId = Number(values.system_id)
            const measurements: Array<{
                parameter_name: Tables<"water_quality_measurement">["parameter_name"]
                parameter_value: number
            }> = []

            if (typeof values.temperature === "number") {
                measurements.push({ parameter_name: "temperature", parameter_value: values.temperature })
            }
            if (typeof values.dissolved_oxygen === "number") {
                measurements.push({ parameter_name: "dissolved_oxygen", parameter_value: values.dissolved_oxygen })
            }
            if (typeof values.ph === "number") {
                measurements.push({ parameter_name: "pH", parameter_value: values.ph })
            }
            if (typeof values.total_ammonia === "number") {
                measurements.push({ parameter_name: "ammonia_ammonium", parameter_value: values.total_ammonia })
            }
            if (typeof values.no2 === "number") {
                measurements.push({ parameter_name: "nitrite", parameter_value: values.no2 })
            }
            if (typeof values.no3 === "number") {
                measurements.push({ parameter_name: "nitrate", parameter_value: values.no3 })
            }
            if (typeof values.salinity === "number") {
                measurements.push({ parameter_name: "salinity", parameter_value: values.salinity })
            }
            if (typeof values.secchi_disk === "number") {
                measurements.push({ parameter_name: "secchi_disk_depth", parameter_value: values.secchi_disk })
            }

            if (measurements.length === 0) {
                throw new Error("Enter at least one water quality measurement.")
            }

            const payload = measurements.map((measurement) => ({
                system_id: systemId,
                date: values.date,
                time: values.time,
                water_depth: values.water_depth,
                parameter_name: measurement.parameter_name,
                parameter_value: measurement.parameter_value,
            }))

            const { error } = await supabase.from("water_quality_measurement").insert(payload)

            if (error) throw error

            toast({
                title: "Success",
                description: "Water quality data recorded.",
            })
            form.reset({
                date: new Date().toISOString().split("T")[0],
                system_id: values.system_id,
                time: values.time,
                water_depth: values.water_depth,
            })
        } catch (error) {
            console.error(error)
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to record water quality data.",
            })
        }
    }

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">Record Water Quality</h2>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                                                    {s.name ?? `System ${s.id}`}
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
                        <FormField
                            control={form.control}
                            name="time"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Time</FormLabel>
                                    <FormControl>
                                        <Input type="time" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="water_depth"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Water Depth (m)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormField
                            control={form.control}
                            name="temperature"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Temperature (°C)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.1" {...field} />
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
                                        <Input type="number" step="0.01" {...field} />
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
                                        <Input type="number" step="0.1" {...field} />
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
                                    <FormLabel>Ammonia (Total)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
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
                                    <FormLabel>NO2 (Nitrite)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
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
                                    <FormLabel>NO3 (Nitrate)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
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
                                        <Input type="number" step="0.1" {...field} />
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
                                    <FormLabel>Secchi Disk (cm)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Entry
                    </Button>
                </form>
            </Form>
        </div>
    )
}
