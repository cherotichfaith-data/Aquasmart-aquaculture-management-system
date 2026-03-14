import { Suspense } from "react"
import PageClient from "./page.client"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { getFeedPageInitialData, parseFeedPageFilters } from "@/features/feed/queries.server"

type SearchParams = Record<string, string | string[] | undefined>

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const initialFilters = parseFeedPageFilters(resolvedSearchParams)
  const { farmId } = await resolveInitialFarmId(searchFarmId)
  const initialData = await getFeedPageInitialData({
    farmId,
    filters: initialFilters,
  })

  return (
    <Suspense fallback={null}>
      <PageClient initialFarmId={farmId} initialFilters={initialFilters} initialData={initialData} />
    </Suspense>
  )
}
