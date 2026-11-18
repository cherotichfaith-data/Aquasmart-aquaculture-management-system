import { Suspense } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import ProductionNavigation from "@/features/production/components/production-navigation"
import AnalyticsReport from "@/features/analytics/components/analytics-report"
import { getAnalyticsReportData, parseAnalyticsPeriod, parseForwardPlanInputs } from "@/features/analytics/queries.server"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { getServerFarmRole } from "@/features/farm/role.server"
import { requireUserContext } from "@/lib/supabase/require-user"

export const metadata = { title: "Harvests | SUSTAIN Aquasmart" }

export default async function HarvestsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams ?? {}
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (typeof value === "string") query.set(key, value)
  const { user, accessToken } = await requireUserContext(`/production/harvests${query.size ? `?${query}` : ""}`)
  const { farmId, farmName } = await resolveInitialFarmId(typeof params.farmId === "string" ? params.farmId : null)
  const role = await getServerFarmRole({ farmId, userId: user.id, accessToken })
  const data = await getAnalyticsReportData({ farmId, accessToken, period: parseAnalyticsPeriod(params), view: "harvests", forwardPlanInputs: parseForwardPlanInputs(params) })
  return <DashboardLayout hideHeader initialFarmId={farmId} initialFarmName={farmName} headerDataOverrides={{ role,
    timeBounds: { start: data.periodStart, end: data.periodEnd },
    timeWindowSummary: `${data.periodMode === "cycle" ? "Cycle to date · " : ""}${new Date(`${data.month}T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}`,
  }}><Suspense fallback={null}><div className="page-shell !space-y-3">
    <ProductionNavigation active="harvests" />
    <AnalyticsReport data={data} harvestsOnly />
  </div></Suspense></DashboardLayout>
}
