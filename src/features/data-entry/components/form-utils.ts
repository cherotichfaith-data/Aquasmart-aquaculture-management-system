import { toast } from "@/lib/hooks/app/use-toast"

export const toIsoDate = (date: Date) => date.toISOString().split("T")[0]

export const parseNumericId = (value: number | string | null | undefined): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export const parseRequiredNumericId = (value: number | string | null | undefined, label: string): number => {
  const parsed = parseNumericId(value)
  if (parsed == null) {
    throw new Error(`${label} is required.`)
  }
  return parsed
}

export const parseOptionalNumericId = (value: number | string | null | undefined): number | null => {
  if (value === "none") return null
  return parseNumericId(value)
}

export const requireActiveFarmId = (farmId: string | null | undefined): string => {
  if (!farmId) {
    throw new Error("No active farm selected.")
  }
  return farmId
}

export const reportDataEntrySubmitError = (error: unknown, fallback = "Unable to save this record.") => {
  toast({
    variant: "destructive",
    title: "Unable to save",
    description: error instanceof Error ? error.message : fallback,
  })
}
