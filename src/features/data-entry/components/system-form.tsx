"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/app-ui/button"
import { Loader2 } from "lucide-react"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/app-ui/form"
import { Input } from "@/components/app-ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/app-ui/select"
import { OfflineSaveBadge } from "@/components/offline/offline-save-badge"
import { toast } from "@/lib/hooks/app/use-toast"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useCreateSystem } from "@/lib/hooks/use-system"
import { GROWTH_STAGE_VALUES, formatGrowthStage } from "@/lib/stage-filter"
import { buildPersistedSystemName, formatSystemOptionLabel } from "@/lib/system-options"
import { FORM_SYSTEM_TYPES, FORM_SYSTEM_TYPE_OPTIONS } from "@/lib/system-types"
import type { Database } from "@/lib/types/database"

type SystemInsertWithUnit = Database["public"]["Tables"]["system"]["Insert"] & {
    unit?: string | null
}
type SystemFormValues = z.infer<typeof formSchema>
const DEFAULT_GROWTH_STAGE = GROWTH_STAGE_VALUES[0]

const getTodayDateValue = () => new Date().toISOString().slice(0, 10)

const formSchema = z.object({
    commissioned_at: z.string().min(1, "Date is required"),
    unit: z.string().trim().min(1, "Cage Unit is required"),
    name: z.string().min(1, "Name is required"),
    type: z.enum(FORM_SYSTEM_TYPES),
    growth_stage: z.enum(GROWTH_STAGE_VALUES),
    volume: z.coerce.number().min(0).optional(),
    depth: z.coerce.number().min(0).optional(),
})

export function SystemForm({ farmId: initialFarmId }: { farmId?: string | null }) {
    const { farmId: activeFarmId, loading: activeFarmLoading } = useActiveFarm()
    const farmId = initialFarmId ?? activeFarmId
    const createSystem = useCreateSystem()

    const form = useForm<SystemFormValues>({
        resolver: zodResolver(formSchema),
        mode: "onBlur",
        defaultValues: {
            commissioned_at: getTodayDateValue(),
            unit: "",
            name: "",
            type: "rectangular_cage",
            growth_stage: DEFAULT_GROWTH_STAGE,
            volume: 0,
            depth: 0,
        },
    })
    const unitValue = useWatch({ control: form.control, name: "unit" })
    const nameValue = useWatch({ control: form.control, name: "name" })
    const cageNamePreview = formatSystemOptionLabel({
        id: 0,
        unit: unitValue,
        name: nameValue,
    })

    function onSubmit(values: SystemFormValues) {
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
            name: buildPersistedSystemName(values.unit, values.name),
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
                    growth_stage: DEFAULT_GROWTH_STAGE,
                    volume: 0,
                    depth: 0,
                })
            },
        })
    }

    return (
        <div>
            <div className="data-entry-status">
                <OfflineSaveBadge result={createSystem.data} />
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5 max-w-2xl">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="commissioned_at"
                            render={({ field }) => (
                                <FormItem className="flex h-full flex-col">
                                    <FormLabel>Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" className="max-w-xs" {...field} />
                                    </FormControl>
                                    <FormDescription className="min-h-[2rem]">
                                        Commissioning date for this system.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="unit"
                            render={({ field }) => (
                                <FormItem className="flex h-full flex-col">
                                    <FormLabel>Cage Unit</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. A" className="max-w-xs" {...field} />
                                    </FormControl>
                                    <FormDescription className="min-h-[2rem]">
                                        This appears first in the cage name, for example `A` in `A.3`.
                                    </FormDescription>
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
                                <FormLabel>Cage Number</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. 3" className="max-w-xs" {...field} />
                                </FormControl>
                                <FormDescription>This appears after the unit, for example `3` in `A.3`.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Displayed cage name: </span>
                        <span className="font-medium text-foreground">{cageNamePreview}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="max-w-xs">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {FORM_SYSTEM_TYPE_OPTIONS.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
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
                            name="growth_stage"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Growth Stage</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="max-w-xs">
                                                <SelectValue placeholder="Select stage" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {GROWTH_STAGE_VALUES.map((stage) => (
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

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="depth"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Depth (m)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.1" className="max-w-xs" {...field} />
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
                                        <Input type="number" step="0.1" className="max-w-xs" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex justify-end pt-1">
                        <Button
                            type="submit"
                            className="min-h-11 rounded-lg px-5"
                            disabled={createSystem.isPending || (!farmId && activeFarmLoading)}
                        >
                            {createSystem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Record System
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}



