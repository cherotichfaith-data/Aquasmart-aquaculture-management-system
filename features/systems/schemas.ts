import { z } from "zod"

export const listSystemsInputSchema = z.object({
  farmId: z.string().uuid(),
  stage: z.enum(["all", "nursing", "grow_out"]).default("all"),
  activeOnly: z.boolean().default(true),
})

export const createSystemInputSchema = z.object({
  farm_id: z.string().uuid(),
  name: z.string().min(1, "System name is required"),
  type: z.enum(["rectangular_cage", "circular_cage", "pond", "tank"]),
  growth_stage: z.enum(["nursing", "grow_out"]),
  is_active: z.boolean().default(true),
  volume: z.number().min(0).nullable().optional(),
  depth: z.number().min(0).nullable().optional(),
  length: z.number().min(0).nullable().optional(),
  width: z.number().min(0).nullable().optional(),
  diameter: z.number().min(0).nullable().optional(),
})

export type ListSystemsInput = z.infer<typeof listSystemsInputSchema>
export type CreateSystemInput = z.infer<typeof createSystemInputSchema>
