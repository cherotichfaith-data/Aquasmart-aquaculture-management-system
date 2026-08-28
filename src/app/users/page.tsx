import { dehydrate } from "@tanstack/react-query"
import { redirect } from "next/navigation"
import UsersPageClient from "./page.client"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { getSettingsUsersPageInitialData } from "@/features/settings/queries.server"
import { QueryHydration } from "@/components/providers/query-hydration"
import { queryKeys } from "@/lib/cache/query-keys"
import { createQueryClient } from "@/lib/react-query/query-client"
import { requireUser, requireUserContext } from "@/lib/supabase/require-user"
import { normalizeRole, resolveAppEntryPath } from "@/lib/app-entry"

export const metadata = { title: "Users | Samaki360" }

type SearchParams = Record<string, string | string[] | undefined>

export default async function UsersPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requireUser("/users")
  const { user } = await requireUserContext("/users")
  const resolvedSearchParams = (await searchParams) ?? {}
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)
  const initialData = await getSettingsUsersPageInitialData({ farmId })

  if (initialData.farmRole !== "admin") {
    redirect(resolveAppEntryPath(normalizeRole(initialData.farmRole)))
  }

  const queryClient = createQueryClient()

  queryClient.setQueryData(queryKeys.farmUserRole(farmId, user.id), initialData.farmRole)
  queryClient.setQueryData(queryKeys.settings.members(farmId), initialData.members)
  queryClient.setQueryData(queryKeys.settings.pendingInvites(farmId), initialData.pendingInvites)

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <UsersPageClient initialFarmId={farmId} initialFarmName={farmName} />
    </QueryHydration>
  )
}
