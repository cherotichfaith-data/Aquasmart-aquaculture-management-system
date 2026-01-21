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
    number_of_fish: z.coerce.number().min(0, "Count must be positive"),
    amount_kg: z.coerce.number().min(0, "Weight must be positive"),
    type_of_harvest: z.enum(["partial", "final"]).default("partial"),
})

interface HarvestFormProps {
    systems: Tables<"systems">[]
}

export function HarvestForm({ systems }: HarvestFormProps) {
    const { toast } = useToast()
    const supabase = createClient()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date().toISOString().split("T")[0],
            number_of_fish: 0,
            amount_kg: 0,
            type_of_harvest: "partial",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const { error } = await supabase.from("harvest_events").insert({
                system_id: values.system_id,
                date: values.date,
                number_of_fish: values.number_of_fish,
                amount_kg: values.amount_kg,
                type_of_harvest: values.type_of_harvest as any,
            })

            if (error) throw error

            toast({
                title: "Success",
                description: "Harvest recorded.",
            })
            form.reset({
                date: new Date().toISOString().split("T")[0],
                number_of_fish: 0,
                amount_kg: 0,
                type_of_harvest: "partial",
                system_id: values.system_id,
            })
        } catch (error) {
            console.error(error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to record harvest.",
            })
        }
    }

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">Record Harvest</h2>
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

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="number_of_fish"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Count (pcs)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
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
                                    <FormLabel>Weight (kg)</FormLabel>
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
                        name="type_of_harvest"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Harvest Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                    <Button type="submit">Submit Entry</Button>
                </form>
            </Form>
        </div>
    )
}
