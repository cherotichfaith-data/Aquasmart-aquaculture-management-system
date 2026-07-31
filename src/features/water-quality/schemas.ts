import { z } from "zod"
import { Constants } from "@/lib/types/database"

const waterQualityParameterSchema = z.enum(Constants.public.Enums.water_quality_parameters)

export const waterQualityRecordRowInputSchema = z.object({
  farm_id: z.string().uuid().nullable().optional(),
  system_id: z.number().int().positive(),
  date: z.string().date(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  measured_at: z.string().min(1),
  water_depth: z.number().nonnegative(),
  parameter_name: waterQualityParameterSchema,
  parameter_value: z.number(),
  location_reference: z.string().max(200).nullable().optional(),
  local_id: z.string().max(128).optional(),
})

export const recordWaterQualityRowsInputSchema = z.array(waterQualityRecordRowInputSchema).min(1)

export type RecordWaterQualityRowsInput = z.infer<typeof recordWaterQualityRowsInputSchema>
