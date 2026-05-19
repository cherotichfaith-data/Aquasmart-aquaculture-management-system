import { runServerReadThrough } from "@/lib/cache/server"
import { cacheTags } from "@/lib/cache/tags"
import { toQuerySuccess } from "@/lib/api/_utils"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import { getScopedSystemOptions } from "@/features/shared/scoped-analytics.server"
import { listBatchOptionRows, listFeedTypeOptionRows } from "@/features/shared/query-seed.server"
import { listRecentEntries } from "@/lib/server/report-reads"

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

export async function getDataEntryPrefetch(farmId: string) {
  const { user, accessToken } = await requireUserContext()

  return runServerReadThrough({
    keyParts: ["data-entry-page", user.id, farmId],
    tags: [
      cacheTags.farm(farmId),
      cacheTags.systems(farmId),
      cacheTags.feedTypes(),
      cacheTags.reports(farmId, "recent-entries"),
    ],
    loader: async () => {
      const supabase = createAccessTokenClient(accessToken)
      const [systems, batches, feedTypes, recentEntries] = await Promise.all([
        getSystems(supabase, farmId),
        getBatches(supabase, farmId),
        getFeedTypes(supabase, farmId),
        listRecentEntries(supabase, farmId),
      ])

      return { systems, batches, feedTypes, recentEntries }
    },
  })
}
