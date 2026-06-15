export type RpcSystemId = number | null
export type RpcDate = string | null

const DATE_ONLY_RE = /^(\d{4}-\d{2}-\d{2})/

export function toRpcSystemId(value: unknown): RpcSystemId {
  const rawValue = Array.isArray(value) ? (value.length === 1 ? value[0] : null) : value
  if (rawValue == null) return null

  if (typeof rawValue === "number") {
    return Number.isInteger(rawValue) && rawValue > 0 ? rawValue : null
  }

  if (typeof rawValue !== "string") return null
  const trimmed = rawValue.trim()
  if (!trimmed || trimmed.toLowerCase() === "all" || trimmed.toLowerCase() === "all cages") return null

  const parsed = Number(trimmed)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function toRpcDate(value: unknown): RpcDate {
  if (value == null) return null

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return value.toISOString().slice(0, 10)
  }

  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null

  return DATE_ONLY_RE.exec(trimmed)?.[1] ?? null
}

export function toRpcDateOrUndefined(value: unknown): string | undefined {
  return toRpcDate(value) ?? undefined
}
