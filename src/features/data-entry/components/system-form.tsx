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
import { toast } from "@/lib/hooks/app/use-toast"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useCreateSystem } from "@/lib/hooks/use-system"
import { GROWTH_STAGE_VALUES, formatGrowthStage } from "@/lib/stage-filter"
import { buildPersistedSystemName, formatSystemOptionLabel } from "@/lib/system-options"
import { FORM_SYSTEM_TYPES, FORM_SYSTEM_TYPE_OPTIONS } from "@/lib/system-types"
import type { Database } from "@/lib/types/database"
import { toIsoDate } from "./form-utils"
import { EntryDraft } from "./entry-draft"
import { FieldGrid, FormActions, FormSection } from "./form-layout"

type SystemInsertWithUnit = Database["public"]["Tables"]["system"]["Insert"] & {
    unit?: string | null
}
type SystemFormValues = z.infer<typeof formSchema>
const DEFAULT_GROWTH_STAGE = GROWTH_STAGE_VALUES[0]

const getTodayDateValue = () => toIsoDate(new Date())

const formSchema = z.object({
    commissioned_at: z.string().min(1, "Date is required"),
    unit: z.string().trim().min(1, "Cage Unit is required"),
    name: z.string().min(1, "Name is required"),
    type: z.enum(FORM_SYSTEM_TYPES),
    growth_stage: z.enum(GROWTH_STAGE_VALUES),
    volume: z.preprocess((value) => value === "" || value == null ? undefined : value, z.coerce.number().min(0).optional()),
    depth: z.preprocess((value) => value === "" || value == null ? undefined : value, z.coerce.number().min(0).optional()),
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
            volume: undefined,
            depth: undefined,
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
                    commissioned_at: values.commissioned_at,
                    unit: "",
                    name: "",
                    type: "rectangular_cage",
                    growth_stage: DEFAULT_GROWTH_STAGE,
                    volume: undefined,
                    depth: undefined,
                })
            },
        })
    }

    return (
        <div className="space-y-4">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <EntryDraft farmId={farmId ?? null} kind="system" savedResult={createSystem.data} />
                    <FormSection title="Add new system" description="Register a new cage, pond, or tank.">
                        <FieldGrid>
                            <FormField
                                control={form.control}
                                name="commissioned_at"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date <span aria-hidden="true">*</span></FormLabel>
                                        <FormControl>
                                            <Input aria-required={true} type="date" {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormDescription>Commissioning date for this system.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cage Unit <span aria-hidden="true">*</span></FormLabel>
                                        <FormControl>
                                            <Input aria-required={true} placeholder="G1" {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormDescription>Appears first in the cage name, e.g. `G1` in `G1A`.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cage Number <span aria-hidden="true">*</span></FormLabel>
                                        <FormControl>
                                            <Input aria-required={true} placeholder="A" {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormDescription>Appears after the unit, e.g. `A` in `G1A`.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormItem className="data-entry-field-wide">
                                <FormLabel>Displayed cage name</FormLabel>
                                <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm font-medium text-foreground">
                                    {cageNamePreview}
                                </div>
                            </FormItem>

                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type <span aria-hidden="true">*</span></FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                                            <FormControl>
                                                <SelectTrigger aria-required={true} ref={field.ref} onBlur={field.onBlur} name={field.name}>
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
                                        <FormLabel>Growth Stage <span aria-hidden="true">*</span></FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                                            <FormControl>
                                                <SelectTrigger aria-required={true} ref={field.ref} onBlur={field.onBlur} name={field.name}>
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

                            <FormField
                                control={form.control}
                                name="depth"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Depth (m, optional)</FormLabel>
                                        <FormControl>
                                            <Input aria-required={false} type="number" step="0.1" inputMode="decimal" {...field} value={field.value ?? ""} />
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
                                        <FormLabel>Volume (m³, optional)</FormLabel>
                                        <FormControl>
                                            <Input aria-required={false} type="number" step="0.1" inputMode="decimal" {...field} value={field.value ?? ""} />
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
                            disabled={createSystem.isPending || (!farmId && activeFarmLoading)}
                        >
                            {createSystem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Record System
                        </Button>
                    </FormActions>
                </form>
            </Form>
        </div>
    )
}
