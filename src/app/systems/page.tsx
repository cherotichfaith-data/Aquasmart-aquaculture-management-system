import PageClient from "./page.client"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { getSystemsPageInitialData, parseSystemsPageFilters } from "@/features/systems/queries.server"
import { logSbError } from "@/lib/supabase/log"
import { requireUserContext } from "@/lib/supabase/require-user"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { sanitizeNextPath } from "@/lib/app-entry"

type SearchParams = Record<string, string | string[] | undefined>

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const routeSearchParams = new URLSearchParams()

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (typeof value === "string") {
      routeSearchParams.set(key, value)
    }
  })

  const currentPath = sanitizeNextPath(
    `/systems${routeSearchParams.size > 0 ? `?${routeSearchParams.toString()}` : ""}`,
    "/systems",
  )

  const { user, accessToken } = await requireUserContext(currentPath)
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const initialFilters = parseSystemsPageFilters(resolvedSearchParams)
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)

  // Resolved server-side so the sidebar can render the real nav immediately
  // (via DashboardLayout's headerDataOverrides) instead of showing a loading
  // skeleton while it cold-fetches the role client-side on first visit.
  let role: string | null = null
  if (farmId) {
    const supabase = createAccessTokenClient(accessToken)
    const { data: membership, error } = await supabase
      .from("farm_user")
      .select("role")
      .eq("farm_id", farmId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) {
      logSbError("systems:page:getFarmRole", error)
    }

    role = membership?.role ?? null
  }

  const initialData = await getSystemsPageInitialData({ farmId, filters: initialFilters, accessToken })

  return (
    <PageClient
      initialFarmId={farmId}
      initialFarmName={farmName}
      initialFarmRole={role}
      initialFilters={initialFilters}
      initialData={initialData}
    />
  )
}
