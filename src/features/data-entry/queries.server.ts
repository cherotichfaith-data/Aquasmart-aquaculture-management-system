import { runServerReadThrough } from "@/lib/cache/server"
import { cacheTags } from "@/lib/cache/tags"
import { toQuerySuccess } from "@/lib/api/_utils"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import { getScopedSystemOptions } from "@/features/shared/scoped-analytics.server"
import { listRecentEntries } from "@/lib/server/report-reads"

type DataEntrySupabaseClient = ReturnType<typeof createAccessTokenClient>

async function getSystems(supabase: DataEntrySupabaseClient, farmId: string) {
  const systems = await getScopedSystemOptions(supabase, farmId, "all")
  return toQuerySuccess(systems.filter((row) => row.is_active !== false))
}

async function getBatches(supabase: DataEntrySupabaseClient, farmId: string) {
  const { data } = await supabase.rpc("api_fingerling_batch_options_rpc", { p_farm_id: farmId })

  const batches = ((data ?? []) as Array<{ date_of_delivery?: string | null }>).slice().sort((a, b) =>
    String(b.date_of_delivery ?? "").localeCompare(String(a.date_of_delivery ?? "")),
  )

  return toQuerySuccess(batches as never[])
}

async function getFeedTypes(supabase: DataEntrySupabaseClient) {
  const { data } = await supabase.rpc("api_feed_type_options_rpc")

  const feedTypes = ((data ?? []) as Array<{ label?: string | null }>).slice().sort((a, b) =>
    String(a.label ?? "").localeCompare(String(b.label ?? "")),
  )

  return toQuerySuccess(feedTypes as never[])
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
        getFeedTypes(supabase),
        listRecentEntries(supabase, farmId),
      ])

      return { systems, batches, feedTypes, recentEntries }
    },
  })
}
