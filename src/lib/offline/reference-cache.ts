import { offlineDB, type ReferenceCacheKind } from "@/lib/offline/db"

function buildKey(kind: ReferenceCacheKind, farmId: string) {
  return `${kind}:${farmId}`
}

/**
 * Opportunistically snapshots dropdown/reference data (systems, batches, feed types) to
 * IndexedDB whenever live data is available, so data-entry forms have something to fall
 * back on after extended offline use. Best-effort: storage failures (private browsing,
 * quota, SSR) are swallowed rather than surfaced, since this is a resilience layer, not
 * a source of truth.
 */
export async function saveReferenceData<T>(
  kind: ReferenceCacheKind,
  farmId: string | null | undefined,
  data: readonly T[],
): Promise<void> {
  if (typeof window === "undefined" || !farmId || data.length === 0) return
  try {
    await offlineDB.referenceCache.put({
      key: buildKey(kind, farmId),
      kind,
      farmId,
      data: data as unknown[],
      cachedAt: Date.now(),
    })
  } catch {
    // Ignore -- caller keeps using whatever live data it already has.
  }
}

export async function loadReferenceData<T>(
  kind: ReferenceCacheKind,
  farmId: string | null | undefined,
): Promise<T[]> {
  if (typeof window === "undefined" || !farmId) return []
  try {
    const entry = await offlineDB.referenceCache.get(buildKey(kind, farmId))
    return (entry?.data as T[] | undefined) ?? []
  } catch {
    return []
  }
}
