import { Suspense } from "react"
import PageClient from "./page.client"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { getServerFarmRole } from "@/features/farm/role.server"
import { getAnalyticsReportData, parseAnalyticsPeriod, parseAnalyticsView, parseForwardPlanInputs } from "@/features/analytics/queries.server"
import { requireUserContext } from "@/lib/supabase/require-user"
import { workbookClient } from "@/features/analytics/workbook-client.server"

type SearchParams = Record<string, string | string[] | undefined>

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const { user, accessToken } = await requireUserContext("/analytics")
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)
  const role = await getServerFarmRole({ farmId, userId: user.id, accessToken })
  const period = parseAnalyticsPeriod(resolvedSearchParams)
  const savedPlan = farmId ? await workbookClient(accessToken).from("production_planning_settings").select("*").eq("farm_id", farmId).maybeSingle() : null
  const forwardPlanInputs = parseForwardPlanInputs({
    ...(savedPlan?.data ? { stocking: String(savedPlan.data.planned_fish), stockingAbw: String(savedPlan.data.planned_abw_g), scenario: savedPlan.data.scenario } : {}),
    ...resolvedSearchParams,
  })
  const data = await getAnalyticsReportData({
    farmId,
    period,
    accessToken,
    forwardPlanInputs,
    view: parseAnalyticsView(resolvedSearchParams.report),
  })

  return (
    <Suspense fallback={null}>
      <PageClient initialFarmId={farmId} initialFarmName={farmName} initialFarmRole={role} data={data} />
    </Suspense>
  )
}
