import { z } from "zod"

const waterQualityParameterSchema = z.enum([
  "pH",
  "temperature",
  "dissolved_oxygen",
  "secchi_disk_depth",
  "nitrite",
  "nitrate",
  "ammonia",
  "salinity",
])

export const listWaterQualityMeasurementsInputSchema = z.object({
  systemId: z.number().int().positive().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  parameterName: waterQualityParameterSchema.optional(),
  limit: z.number().int().positive().max(500).default(100),
})

export const waterQualityMeasurementInputSchema = z.object({
  parameter_name: waterQualityParameterSchema,
  parameter_value: z.number(),
})

export const recordWaterQualityInputSchema = z.object({
  farmId: z.string().uuid(),
  system_id: z.number().int().positive(),
  date: z.string().date(),
  time: z.string().min(1),
  measured_at: z.string().min(1),
  water_depth: z.number().nonnegative(),
  measurements: z.array(waterQualityMeasurementInputSchema).min(1),
})

export type ListWaterQualityMeasurementsInput = z.infer<typeof listWaterQualityMeasurementsInputSchema>
export type RecordWaterQualityInput = z.infer<typeof recordWaterQualityInputSchema>
