import { runServerReadThrough } from "@/lib/cache/server"
import { cacheTags } from "@/lib/cache/tags"
import { toQuerySuccess } from "@/lib/api/_utils"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { getScopedSystemOptions } from "@/features/shared/scoped-analytics.server"
import { listBatchOptionRows, listFeedTypeOptionRows } from "@/features/shared/query-seed.server"
import { emptyRecentEntries, listRecentEntries } from "@/lib/server/report-reads"
import { logSbError } from "@/lib/supabase/log"

type DataEntrySupabaseClient = ReturnType<typeof createAccessTokenClient>

async function getSystems(supabase: DataEntrySupabaseClient, farmId: string) {
  const systems = await getScopedSystemOptions(supabase, farmId, "all")
  return toQuerySuccess(systems.filter((row) => row.is_active !== false))
}

async function getBatches(supabase: DataEntrySupabaseClient, farmId: string) {
  return toQuerySuccess(await listBatchOptionRows(supabase, { farmId }))
}

async function getFeedTypes(supabase: DataEntrySupabaseClient, farmId: string) {
  return toQuerySuccess(await listFeedTypeOptionRows(supabase, { farmId }))
}

async function safePrefetch<T>(tag: string, fallback: T, loader: () => Promise<T>) {
  try {
    return await loader()
  } catch (error) {
    logSbError(tag, error)
    return fallback
  }
}

export async function getDataEntryPrefetch({
  farmId,
  userId,
  accessToken,
}: {
  farmId: string
  userId: string
  accessToken: string
}) {
  return runServerReadThrough({
    keyParts: ["data-entry-page", userId, farmId],
    tags: [
      cacheTags.farm(farmId),
      cacheTags.systems(farmId),
      cacheTags.feedTypes(),
      cacheTags.reports(farmId, "recent-entries"),
    ],
    loader: async () => {
      const supabase = createAccessTokenClient(accessToken)
      const [systems, batches, feedTypes, recentEntries] = await Promise.all([
        safePrefetch("data-entry:prefetch:systems", toQuerySuccess([]), () => getSystems(supabase, farmId)),
        safePrefetch("data-entry:prefetch:batches", toQuerySuccess([]), () => getBatches(supabase, farmId)),
        safePrefetch("data-entry:prefetch:feedTypes", toQuerySuccess([]), () => getFeedTypes(supabase, farmId)),
        safePrefetch("data-entry:prefetch:recentEntries", emptyRecentEntries(), () =>
          listRecentEntries(supabase, farmId),
        ),
      ])

      return { systems, batches, feedTypes, recentEntries }
    },
  })
}
