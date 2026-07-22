import { Suspense } from "react"
import FeedPageClient from "./page.client"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { parseFeedDashboardFilters } from "@/features/feed/queries.server"
import { requireUserContext } from "@/lib/supabase/require-user"

type SearchParams = Record<string, string | string[] | undefined>

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = (await searchParams) ?? {}
  await requireUserContext("/feed")
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const initialFilters = parseFeedDashboardFilters(resolvedSearchParams)
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)

  return (
    <Suspense fallback={null}>
      <FeedPageClient initialFarmId={farmId} initialFarmName={farmName} initialFilters={initialFilters} />
    </Suspense>
  )
}
