"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
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
import { toast } from "@/lib/hooks/app/use-toast"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useCreateSystem } from "@/lib/hooks/use-system"
import { BIOLOGICAL_GROWTH_STAGE_VALUES, formatGrowthStage } from "@/lib/stage-filter"
import { FORM_SYSTEM_TYPES } from "@/lib/system-types"
import type { Database } from "@/lib/types/database"

type SystemInsertWithUnit = Database["public"]["Tables"]["system"]["Insert"] & {
    unit?: string | null
}

const getTodayDateValue = () => new Date().toISOString().slice(0, 10)

const formSchema = z.object({
    commissioned_at: z.string().min(1, "Date is required"),
    unit: z.string().trim().min(1, "Cage Unit is required"),
    name: z.string().min(1, "Name is required"),
    type: z.enum(FORM_SYSTEM_TYPES),
    growth_stage: z.enum(BIOLOGICAL_GROWTH_STAGE_VALUES),
    volume: z.coerce.number().min(0).optional(),
    depth: z.coerce.number().min(0).optional(),
})

export function SystemForm({ farmId: initialFarmId }: { farmId?: string | null }) {
    const { farmId: activeFarmId, loading: activeFarmLoading } = useActiveFarm()
    const farmId = initialFarmId ?? activeFarmId
    const createSystem = useCreateSystem()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            commissioned_at: getTodayDateValue(),
            unit: "",
            name: "",
            type: "rectangular_cage",
            growth_stage: "fingerling",
            volume: 0,
            depth: 0,
        },
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (!farmId) {
            toast({
                variant: "destructive",
                title: "No active farm",
                description: activeFarmLoading
                    ? "The workspace is still loading. Try again in a moment."
                    : "Select a workspace before recording a system.",
            })
            return
        }

        const payload: SystemInsertWithUnit = {
            commissioned_at: values.commissioned_at,
            unit: values.unit,
            name: values.name,
            type: values.type,
            growth_stage: values.growth_stage,
            ...(values.volume !== undefined ? { volume: values.volume } : {}),
            ...(values.depth !== undefined ? { depth: values.depth } : {}),
            is_active: true,
            cage_status: "available",
            farm_id: farmId,
        }

        createSystem.mutate(payload, {
            onSuccess: () => {
                form.reset({
                    commissioned_at: getTodayDateValue(),
                    unit: "",
                    name: "",
                    type: "rectangular_cage",
                    growth_stage: "fingerling",
                    volume: 0,
                    depth: 0,
                })
            },
        })
    }

    return (
        <div>
            <div className="data-entry-form-intro">
                <h2 className="text-xl font-semibold tracking-tight">Add New System</h2>
                <p className="text-sm text-muted-foreground">Register a new cage, pond, or tank.</p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="commissioned_at"
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
                                    <FormControl>
                                        <Input placeholder="e.g. Unit A" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cage/System</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Cage 101" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="rectangular_cage">Rectangular Cage</SelectItem>
                                            <SelectItem value="circular_cage">Circular Cage</SelectItem>
                                            <SelectItem value="pond">Pond</SelectItem>
                                            <SelectItem value="tank">Tank</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="growth_stage"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Growth Stage</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select stage" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {BIOLOGICAL_GROWTH_STAGE_VALUES.map((stage) => (
                                                <SelectItem key={stage} value={stage}>
                                                    {formatGrowthStage(stage)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="depth"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Depth (m)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="volume"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Volume (m3)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button type="submit" className="data-entry-action" disabled={createSystem.isPending || (!farmId && activeFarmLoading)}>
                        {createSystem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Record System
                    </Button>
                </form>
            </Form>
        </div>
    )
}



