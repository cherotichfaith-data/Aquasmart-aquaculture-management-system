import { z } from "zod"
import { Constants } from "@/lib/types/database"

const waterQualityParameterSchema = z.enum(Constants.public.Enums.water_quality_parameters)

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
export type WaterQualityRecordRowInput = z.infer<typeof waterQualityRecordRowInputSchema>
export type RecordWaterQualityRowsInput = z.infer<typeof recordWaterQualityRowsInputSchema>
