type ReadingSummary = { date: string; metadata?: Record<string, string | number | boolean | null | undefined> }
export const measurementFields = { temperature: "temperature", dissolved_oxygen: "dissolved_oxygen", pH: "pH", ammonia: "total_ammonia", nitrite: "no2", nitrate: "no3" } as const

/** Match the server's system/date/time/depth/parameter identity, including offline rows. */
export function findWaterQualityDuplicate<T extends ReadingSummary>(entries: T[], values: Record<string, unknown>) {
  return entries.find((entry) => {
    const parameter = entry.metadata?.parameterName as keyof typeof measurementFields
    const field = measurementFields[parameter]
    const value = field ? values[field] : undefined
    return entry.date === values.date && entry.metadata?.waterDepth === Number(values.water_depth) &&
      entry.metadata?.time === values.time && value != null && String(value).trim() !== ""
  })
}
