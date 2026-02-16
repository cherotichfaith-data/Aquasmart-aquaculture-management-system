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
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useCreateSystem } from "@/lib/hooks/use-system"

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["rectangular_cage", "circular_cage", "pond", "tank"]),
    growth_stage: z.enum(["nursing", "grow_out"]),
    volume: z.coerce.number().min(0).optional(),
    depth: z.coerce.number().min(0).optional(),
    length: z.coerce.number().min(0).optional(),
    width: z.coerce.number().min(0).optional(),
    diameter: z.coerce.number().min(0).optional(),
})

export function SystemForm() {
    const { farmId } = useActiveFarm()
    const createSystem = useCreateSystem()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            type: "rectangular_cage",
            growth_stage: "grow_out",
            volume: 0,
            depth: 0,
            length: 0,
            width: 0,
            diameter: 0,
        },
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (!farmId) {
            return
        }

        const payload = {
            name: values.name,
            type: values.type,
            growth_stage: values.growth_stage,
            ...(values.volume !== undefined ? { volume: values.volume } : {}),
            ...(values.depth !== undefined ? { depth: values.depth } : {}),
            ...(values.length !== undefined ? { length: values.length } : {}),
            ...(values.width !== undefined ? { width: values.width } : {}),
            ...(values.diameter !== undefined ? { diameter: values.diameter } : {}),
            is_active: true,
            farm_id: farmId,
        }

        createSystem.mutate(payload, {
            onSuccess: () => {
                form.reset({
                    name: "",
                    type: "rectangular_cage",
                    growth_stage: "grow_out",
                    volume: 0,
                    depth: 0,
                    length: 0,
                    width: 0,
                    diameter: 0,
                })
            },
        })
    }

    const type = form.watch("type")

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">Add New System</h2>
                <p className="text-sm text-muted-foreground">Register a new cage, pond, or tank.</p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>System Name/ID</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Cage 101" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
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
                                            <SelectItem value="nursing">Nursing</SelectItem>
                                            <SelectItem value="grow_out">Grow Out</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                                    <FormLabel>Volume (m³)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {(type === "rectangular_cage" || type === "pond" || type === "tank") && (
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="length"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Length (m)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="width"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Width (m)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    {(type === "circular_cage" || type === "tank") && (
                        <FormField
                            control={form.control}
                            name="diameter"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Diameter (m)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <Button type="submit" disabled={createSystem.isPending}>
                        {createSystem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create System
                    </Button>
                </form>
            </Form>
        </div>
    )
}
