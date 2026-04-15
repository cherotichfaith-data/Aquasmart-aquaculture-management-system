export type OfflineAwareMeta = {
  pendingSync?: boolean
  localIds?: string[]
}

export function hasPendingSyncMeta(value: unknown): value is { meta: OfflineAwareMeta } {
  if (!value || typeof value !== "object") return false
  if (!("meta" in value)) return false
  const meta = (value as { meta?: unknown }).meta
  return Boolean(meta && typeof meta === "object" && "pendingSync" in (meta as Record<string, unknown>))
}
