export type FeedingResponseLevel = 1 | 2 | 3 | 4 | 5

export type FeedingResponseLabel =
  | "No Response"
  | "Low Appetite"
  | "Ideal Appetite"
  | "Good Appetite"
  | "Aggressive Appetite"

export const FEEDING_RESPONSE_LEVELS = [
  {
    level: 1,
    label: "No Response",
    immediateResponse: "No fish eating",
    after10Min: "No feed was eaten (cage is full of feed)",
    after3Hours: "No feed was eaten (cage is full of feed)",
    actionGuideline: "Stop feeding for the rest of the day and inform production manager",
  },
  {
    level: 2,
    label: "Low Appetite",
    immediateResponse: "Some fish eating",
    after10Min: "Some feed was eaten (a lot of feed left in cage)",
    after3Hours: "Most feed was eaten (a little feed left in cage)",
    actionGuideline:
      "Discuss decrease of feeding amounts with production manager if appetite is on Level 2 for several days",
  },
  {
    level: 3,
    label: "Ideal Appetite",
    immediateResponse: "All fish eating",
    after10Min: "Most feed was eaten (a little feed left in cage)",
    after3Hours: "All feed was eaten (no feed left in cage)",
    actionGuideline: "Ideal appetite (Level 3 and 4) - no action required",
  },
  {
    level: 4,
    label: "Good Appetite",
    immediateResponse: "All fish eating",
    after10Min: "All feed was eaten (no feed left in cage)",
    after3Hours: null,
    actionGuideline: "Ideal appetite (Level 3 and 4) - no action required",
  },
  {
    level: 5,
    label: "Aggressive Appetite",
    immediateResponse: "All fish eating aggressively (no feed left after 2 min)",
    after10Min: null,
    after3Hours: null,
    actionGuideline:
      "Discuss increase of feeding amounts with production manager if appetite is on Level 5 for several days",
  },
] as const satisfies ReadonlyArray<{
  level: FeedingResponseLevel
  label: FeedingResponseLabel
  immediateResponse: string
  after10Min: string | null
  after3Hours: string | null
  actionGuideline: string
}>

export const FEEDING_RESPONSE_LEVEL_COLORS: Record<FeedingResponseLabel, string> = {
  "No Response": "#dc2626",
  "Low Appetite": "#f97316",
  "Ideal Appetite": "#22c55e",
  "Good Appetite": "#16a34a",
  "Aggressive Appetite": "#2563eb",
}

const LEGACY_RESPONSE_TO_LEVEL: Record<string, FeedingResponseLevel> = {
  excellent: 5,
  very_good: 4,
  "very good": 4,
  good: 3,
  ok: 3,
  okay: 3,
  fair: 2,
  poor: 2,
  bad: 1,
  "not responding": 1,
  not_responding: 1,
  "no response": 1,
  nr: 1,
}

export function parseFeedingResponseLevel(value: unknown): FeedingResponseLevel | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5) {
    return value as FeedingResponseLevel
  }

  const normalized = String(value ?? "").trim().toLowerCase()
  if (!normalized) return null

  const numeric = Number(normalized)
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 5) {
    return numeric as FeedingResponseLevel
  }

  return LEGACY_RESPONSE_TO_LEVEL[normalized] ?? null
}

export function formatFeedingResponseLevel(value: unknown, fallback = "Response N/A") {
  const level = parseFeedingResponseLevel(value)
  if (level == null) return fallback
  return `Level ${level} - ${FEEDING_RESPONSE_LEVELS[level - 1].label}`
}

export function isLowFeedingResponse(value: unknown) {
  const level = parseFeedingResponseLevel(value)
  return level != null && level <= 2
}

export function isNoFeedingResponse(value: unknown) {
  return parseFeedingResponseLevel(value) === 1
}

export function isAggressiveFeedingResponse(value: unknown) {
  return parseFeedingResponseLevel(value) === 5
}
