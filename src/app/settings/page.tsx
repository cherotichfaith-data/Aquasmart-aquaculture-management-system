import { Suspense } from "react"
import { dehydrate } from "@tanstack/react-query"
import PageClient from "./page.client"
import { QueryHydration } from "@/components/providers/query-hydration"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { getSettingsPageInitialData } from "@/features/settings/queries.server"
import { normalizeRole } from "@/lib/app-entry"
import { queryKeys } from "@/lib/cache/query-keys"
import { createQueryClient } from "@/lib/react-query/query-client"
import { requireUser } from "@/lib/supabase/require-user"
import { requireUserContext } from "@/lib/supabase/require-user"

type SearchParams = Record<string, string | string[] | undefined>

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requireUser("/settings")
  const { user } = await requireUserContext("/settings")
  const resolvedSearchParams = (await searchParams) ?? {}
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)
  const initialData = await getSettingsPageInitialData({ farmId })
  const queryClient = createQueryClient()

  queryClient.setQueryData(queryKeys.farmUserRole(farmId, user.id), initialData.farmRole)
  queryClient.setQueryData(queryKeys.settings.load(user.id, farmId, false), initialData.settingsLoad)

  return (
    <Suspense fallback={null}>
      <QueryHydration state={dehydrate(queryClient)}>
        <PageClient
          initialFarmId={farmId}
          initialFarmName={farmName}
          initialUserId={user.id}
          initialFarmRole={normalizeRole(initialData.farmRole)}
          initialSettingsLoad={initialData.settingsLoad}
        />
      </QueryHydration>
    </Suspense>
  )
}
