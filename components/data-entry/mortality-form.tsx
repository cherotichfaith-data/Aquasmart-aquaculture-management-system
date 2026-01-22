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
import { createClient } from "@/utils/supabase/client" // Adjust import path
import { useToast } from "@/hooks/use-toast"
import { Tables } from "@/lib/types/database"

// Schema
const formSchema = z.object({
    system_id: z.string().min(1, "System is required"),
    date: z.string().min(1, "Date is required"),
    number_of_fish: z.coerce.number().min(0, "Must be positive"),
    total_weight: z.coerce.number().min(0).optional(),
    average_body_weight: z.coerce.number().min(0).optional(),
})

interface MortalityFormProps {
    systems: Tables<"systems">[]
}

export function MortalityForm({ systems }: MortalityFormProps) {
    const { toast } = useToast()
    const supabase = createClient()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date().toISOString().split("T")[0],
            number_of_fish: 0,
            total_weight: 0,
            average_body_weight: 0,
            system_id: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const { error } = await supabase.from("mortality_events").insert({
                system_id: values.system_id === "all_active_cages" ? null : values.system_id, // Handle special case/type mismatch if needed? system_id is string.
                date: values.date,
                number_of_fish: values.number_of_fish,
                total_weight: values.total_weight,
                average_body_weight: values.average_body_weight,
            })

            if (error) throw error

            toast({
                title: "Success",
                description: "Mortality event recorded.",
            })
            form.reset({
                date: new Date().toISOString().split("T")[0],
                number_of_fish: 0,
                system_id: values.system_id, // Keep system selected
            })
        } catch (error) {
            console.error(error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to record mortality event.",
            })
        }
    }

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">Record Mortality</h2>
                <p className="text-sm text-muted-foreground">Log daily fish mortality for a system.</p>
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
                                                    {s.system_id} {/* Assuming ID is display name or add Name if available */}
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

                    <FormField
                        control={form.control}
                        name="number_of_fish"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Number of Fish</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="total_weight"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Total Weight (kg) (Optional)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="average_body_weight"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Avg Body Weight (g) (Optional)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
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
