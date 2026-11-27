import { redirect } from "next/navigation"
import { Suspense } from "react"
import PageClient from "./page.client"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { getServerFarmRole } from "@/features/farm/role.server"
import { getAnalyticsReportData, parseAnalyticsPeriod, parseAnalyticsView, parseForwardPlanInputs } from "@/features/analytics/queries.server"
import { requireUserContext } from "@/lib/supabase/require-user"

type SearchParams = Record<string, string | string[] | undefined>

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = (await searchParams) ?? {}
  if (resolvedSearchParams.report === "harvests") {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(resolvedSearchParams)) if (key !== "report" && typeof value === "string") query.set(key, value)
    redirect(`/production/harvests${query.size ? `?${query}` : ""}`)
  }
  const { user, accessToken } = await requireUserContext("/analytics")
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)
  const role = await getServerFarmRole({ farmId, userId: user.id, accessToken })
  const period = parseAnalyticsPeriod(resolvedSearchParams)
  const forwardPlanInputs = parseForwardPlanInputs({ ...resolvedSearchParams })
  if (parseAnalyticsView(resolvedSearchParams.report) === "planning") forwardPlanInputs.scenario = "main"
  const data = await getAnalyticsReportData({
    farmId,
    period,
    accessToken,
    forwardPlanInputs,
    planningParams: resolvedSearchParams,
    view: parseAnalyticsView(resolvedSearchParams.report),
  })

  return (
    <Suspense fallback={null}>
      <PageClient initialFarmId={farmId} initialFarmName={farmName} initialFarmRole={role} data={data} />
    </Suspense>
  )
}
