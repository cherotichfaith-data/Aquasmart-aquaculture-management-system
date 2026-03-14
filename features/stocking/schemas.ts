import { z } from "zod"

export const listStockingRecordsInputSchema = z.object({
  systemIds: z.array(z.number().int().positive()).optional(),
  batchId: z.number().int().positive().nullable().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  limit: z.number().int().positive().max(500).default(100),
})

export const recordStockingInputSchema = z.object({
  farmId: z.string().uuid(),
  system_id: z.number().int().positive(),
  batch_id: z.number().int().positive(),
  date: z.string().date(),
  number_of_fish_stocking: z.number().int().positive(),
  total_weight_stocking: z.number().nonnegative(),
  abw: z.number().nonnegative(),
  type_of_stocking: z.enum(["empty", "already_stocked"]),
})

export type ListStockingRecordsInput = z.infer<typeof listStockingRecordsInputSchema>
export type RecordStockingInput = z.infer<typeof recordStockingInputSchema>
