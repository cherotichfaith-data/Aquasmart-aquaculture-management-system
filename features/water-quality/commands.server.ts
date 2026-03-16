"use server"

import { revalidateTag } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { requireUser } from "@/utils/supabase/require-user"
import { logSbError } from "@/utils/supabase/log"
import { cacheTags } from "@/lib/cache/tags"
import { recordWaterQualityInputSchema, type RecordWaterQualityInput } from "./schemas"
import type { WaterQualityRow } from "./types"

export async function recordWaterQualityCommand(
  input: RecordWaterQualityInput,
): Promise<WaterQualityRow[]> {
  await requireUser()
  const parsed = recordWaterQualityInputSchema.parse(input)
  const supabase = await createClient()

  const payload = parsed.measurements.map((measurement) => ({
    system_id: parsed.system_id,
    date: parsed.date,
    time: parsed.time,
    measured_at: parsed.measured_at,
    water_depth: parsed.water_depth,
    parameter_name: measurement.parameter_name,
    parameter_value: measurement.parameter_value,
  }))

  const { data, error } = await supabase.from("water_quality_measurement").insert(payload).select("*")

  if (error) {
    logSbError("features:water-quality:recordWaterQualityCommand", error)
    throw new Error(error.message)
  }

  revalidateTag(cacheTags.farm(parsed.farmId), "max")
  revalidateTag(cacheTags.inventory(parsed.farmId), "max")
  revalidateTag(cacheTags.waterQuality(parsed.farmId, parsed.system_id), "max")
  revalidateTag(cacheTags.reports(parsed.farmId, "water-quality"), "max")
  revalidateTag(cacheTags.dataEntry(parsed.farmId), "max")

  return (data ?? []) as WaterQualityRow[]
}
