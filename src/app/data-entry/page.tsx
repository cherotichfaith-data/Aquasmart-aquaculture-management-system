import { Suspense } from "react"
import { dehydrate } from "@tanstack/react-query"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import DataEntryPageClient from "./page.client"
import { QueryHydration } from "@/components/providers/query-hydration"
import { getDataEntryPrefetch } from "@/features/data-entry/queries.server"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { WORKSPACE_SELECT_PATH, canAccessDataEntry } from "@/lib/app-entry"
import { queryKeys } from "@/lib/cache/query-keys"
import { createQueryClient } from "@/lib/react-query/query-client"
import { logSbError } from "@/lib/supabase/log"
import { requireUserContext } from "@/lib/supabase/require-user"
import { createAccessTokenClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Data Capture - AquaSmart",
  description: "Record daily farm events",
}

type SearchParams = Record<string, string | string[] | undefined>

export default async function DataEntryPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const routeSearchParams = new URLSearchParams()

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (typeof value === "string") {
      routeSearchParams.set(key, value)
    }
  })

  const currentPath = `/data-entry${routeSearchParams.size > 0 ? `?${routeSearchParams.toString()}` : ""}`

  const { user, accessToken } = await requireUserContext(currentPath)
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)

  if (!farmId) {
    redirect(`${WORKSPACE_SELECT_PATH}?next=${encodeURIComponent(currentPath)}`)
  }

  const supabase = createAccessTokenClient(accessToken)
  const { data: membership, error } = await supabase
    .from("farm_user")
    .select("role")
    .eq("farm_id", farmId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    logSbError("data-entry:page:getFarmRole", error)
  }

  const role = (membership?.role ?? null) as Parameters<typeof canAccessDataEntry>[0]
  if (!canAccessDataEntry(role)) {
    redirect("/unauthorized")
  }

  const prefetch = await getDataEntryPrefetch(farmId)
  const queryClient = createQueryClient()

  queryClient.setQueryData(queryKeys.farmUserRole(farmId, user.id), role)
  queryClient.setQueryData(queryKeys.options.systems({ farmId }), prefetch.systems)
  queryClient.setQueryData(queryKeys.options.batches({ farmId }), prefetch.batches)
  queryClient.setQueryData(queryKeys.options.feeds(farmId, user.id), prefetch.feedTypes)
  queryClient.setQueryData(queryKeys.reports.recentEntries(farmId), prefetch.recentEntries)

  return (
    <Suspense fallback={null}>
      <QueryHydration state={dehydrate(queryClient)}>
        <DataEntryPageClient initialFarmId={farmId} initialFarmName={farmName} />
      </QueryHydration>
    </Suspense>
  )
}
