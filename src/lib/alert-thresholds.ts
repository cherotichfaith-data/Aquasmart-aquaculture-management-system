import type { Json, Tables } from "@/lib/types/database"

/**
 * Alert threshold row — includes all columns: base fields plus
 * low_sgr_threshold, low_survival_pct, critical_survival_pct
 * added in migration 20260426000001.
 */
export type AlertThresholdRow = Tables<"alert_threshold">

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const toNullableString = (value: unknown) => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

const toNullableNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const toNullableSystemId = (value: unknown) => {
  const parsed = toNullableNumber(value)
  return typeof parsed === "number" ? parsed : null
}

const hasThresholdValues = (value: Record<string, unknown>) =>
  toNullableNumber(value.low_do_threshold) != null ||
  toNullableNumber(value.high_ammonia_threshold) != null ||
  toNullableNumber(value.high_mortality_threshold) != null ||
  toNullableNumber(value.low_sgr_threshold) != null ||
  toNullableNumber(value.low_survival_pct) != null ||
  toNullableNumber(value.critical_survival_pct) != null

function normalizeThresholdRow(
  value: Record<string, unknown>,
  index: number,
  farmId?: string | null,
  forcedSystemId?: number | null,
): AlertThresholdRow | null {
  if (!hasThresholdValues(value)) return null

  const systemId = forcedSystemId ?? toNullableSystemId(value.system_id)
  const scope = toNullableString(value.scope) ?? (systemId != null ? "system" : "farm")

  return {
    id: toNullableString(value.id) ?? `settings-threshold-${index}`,
    created_at: toNullableString(value.created_at),
    updated_at: toNullableString(value.updated_at),
    farm_id: toNullableString(value.farm_id) ?? farmId ?? null,
    system_id: systemId,
    scope,
    low_do_threshold: toNullableNumber(value.low_do_threshold),
    high_ammonia_threshold: toNullableNumber(value.high_ammonia_threshold),
    high_mortality_threshold: toNullableNumber(value.high_mortality_threshold),
    low_sgr_threshold: toNullableNumber(value.low_sgr_threshold),
    low_survival_pct: toNullableNumber(value.low_survival_pct),
    critical_survival_pct: toNullableNumber(value.critical_survival_pct),
  }
}

function extractThresholdCandidates(value: Json | null | undefined): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return (value as unknown[]).filter(isRecord)
  }

  if (!isRecord(value)) {
    return []
  }

  if (Array.isArray(value.thresholds)) {
    return (value.thresholds as unknown[]).filter(isRecord)
  }

  if (Array.isArray(value.rows)) {
    return (value.rows as unknown[]).filter(isRecord)
  }

  if (Array.isArray(value.alert_thresholds)) {
    return (value.alert_thresholds as unknown[]).filter(isRecord)
  }

  const extracted: Array<Record<string, unknown>> = []

  if (isRecord(value.global)) {
    extracted.push(value.global)
  }

  if (Array.isArray(value.systems)) {
    extracted.push(...(value.systems as unknown[]).filter(isRecord))
  } else if (isRecord(value.systems)) {
    Object.entries(value.systems).forEach(([systemId, config]) => {
      if (!isRecord(config)) return
      extracted.push({ ...config, system_id: config.system_id ?? systemId })
    })
  }

  if (extracted.length > 0) {
    return extracted
  }

  return hasThresholdValues(value) ? [value] : []
}

export function parseAlertThresholdSettings(value: Json | null | undefined, farmId?: string | null) {
  return extractThresholdCandidates(value)
    .map((candidate, index) => normalizeThresholdRow(candidate, index, farmId))
    .filter((row): row is AlertThresholdRow => row !== null)
}
