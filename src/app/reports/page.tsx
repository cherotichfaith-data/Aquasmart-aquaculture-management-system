import { Suspense } from "react"
import PageClient from "./page.client"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { getServerFarmRole } from "@/features/farm/role.server"
import { requireUserContext } from "@/lib/supabase/require-user"

type SearchParams = Record<string, string | string[] | undefined>

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const { user, accessToken } = await requireUserContext("/reports")
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)
  const role = await getServerFarmRole({ farmId, userId: user.id, accessToken })

  return (
    <Suspense fallback={null}>
      <PageClient initialFarmId={farmId} initialFarmName={farmName} initialFarmRole={role} />
    </Suspense>
  )
}
