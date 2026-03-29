export const toIsoDate = (date: Date) => date.toISOString().split("T")[0]

export const parseNumericId = (value: number | string | null | undefined): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}
