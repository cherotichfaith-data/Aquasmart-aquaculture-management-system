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
    stocking_date: z.string().min(1, "Date is required"),
    number_of_fish: z.coerce.number().min(1, "Quantity must be positive"),
    total_weight_kg: z.coerce.number().min(0, "Weight must be positive"),
    average_body_weight_g: z.coerce.number().min(0).optional(),
    source: z.string().optional(),
})

interface StockingFormProps {
    systems: Tables<"systems">[]
}

export function StockingForm({ systems }: StockingFormProps) {
    const { toast } = useToast()
    const supabase = createClient()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            stocking_date: new Date().toISOString().split("T")[0],
            number_of_fish: 0,
            total_weight_kg: 0,
            average_body_weight_g: 0,
        },
    })

    // Auto-calculate ABW calculation
    const numberOfFish = form.watch("number_of_fish")
    const totalWeight = form.watch("total_weight_kg")

    if (numberOfFish > 0 && totalWeight > 0) {
        const calculatedAbw = (totalWeight * 1000) / numberOfFish
        // Only set if drastically different to avoid loops or user overwrite?
        // Better to just display it or set it on blur.
        // For now, let's just let user input or keep simple.
        // Actually, let's sync it.
        // form.setValue("average_body_weight_g", parseFloat(calculatedAbw.toFixed(2)))
    }


    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            // Calculate ABW if not provided or just use the one provided
            const abw = values.average_body_weight_g || (values.total_weight_kg * 1000) / values.number_of_fish

            const { error } = await supabase.from("stocking_events").insert({
                system_id: values.system_id,
                stocking_date: values.stocking_date,
                number_of_fish: values.number_of_fish,
                total_weight_kg: values.total_weight_kg,
                average_body_weight_g: abw,
                source: values.source,
            })

            if (error) throw error

            toast({
                title: "Success",
                description: "Stocking event recorded.",
            })
            form.reset({
                stocking_date: new Date().toISOString().split("T")[0],
                number_of_fish: 0,
                total_weight_kg: 0,
                average_body_weight_g: 0,
                source: "",
                system_id: values.system_id,
            })
        } catch (error) {
            console.error(error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to record stocking event.",
            })
        }
    }

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">Record Stocking</h2>
                <p className="text-sm text-muted-foreground">Log new fish stocking into a system.</p>
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
                            name="stocking_date"
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

                    <div className="grid grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="number_of_fish"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Quantity (pcs)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
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
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="average_body_weight_g"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ABW (g) (Auto)</FormLabel>
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
                        name="source"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Source (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Hatchery A" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit">Submit Entry</Button>
                </form>
            </Form>
        </div>
    )
}
