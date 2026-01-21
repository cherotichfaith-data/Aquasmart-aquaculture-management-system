"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
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
    systems: Tables<"systems">[]
}

export function WaterQualityForm({ systems }: WaterQualityFormProps) {
    const { toast } = useToast()
    const supabase = createClient()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date().toISOString().split("T")[0],
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const { error } = await supabase.from("water_quality_events").insert({
                system_id: values.system_id,
                date: values.date,
                temperature: values.temperature,
                dissolved_oxygen: values.dissolved_oxygen,
                ph: values.ph,
                total_ammonia: values.total_ammonia,
                no2: values.no2,
                no3: values.no3,
                salinity: values.salinity,
                secchi_disk: values.secchi_disk,
            })

            if (error) throw error

            toast({
                title: "Success",
                description: "Water quality data recorded.",
            })
            form.reset({
                date: new Date().toISOString().split("T")[0],
                system_id: values.system_id,
            })
        } catch (error) {
            console.error(error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to record water quality data.",
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
                                                <SelectItem key={s.system_id} value={s.system_id}>
                                                    {s.system_id}
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

                    <Button type="submit">Submit Entry</Button>
                </form>
            </Form>
        </div>
    )
}
