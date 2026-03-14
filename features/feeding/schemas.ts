import { z } from "zod"

export const listFeedingRecordsInputSchema = z.object({
  systemIds: z.array(z.number().int().positive()).optional(),
  batchId: z.number().int().positive().nullable().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  limit: z.number().int().positive().max(500).default(100),
})

export const recordFeedingInputSchema = z.object({
  farmId: z.string().uuid(),
  system_id: z.number().int().positive(),
  batch_id: z.number().int().positive().nullable().optional(),
  date: z.string().date(),
  feed_type_id: z.number().int().positive(),
  feeding_amount: z.number().positive(),
  feeding_response: z.enum(["very_good", "good", "bad"]),
})

export type ListFeedingRecordsInput = z.infer<typeof listFeedingRecordsInputSchema>
export type RecordFeedingInput = z.infer<typeof recordFeedingInputSchema>
