import Link from "next/link"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { requireUserContext } from "@/lib/supabase/require-user"
import { getServerFarmRole } from "@/features/farm/role.server"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { workbookClient } from "@/features/analytics/workbook-client.server"
import { loadAutomaticFeedPlan } from "@/features/analytics/automatic-feed-plan.server"
import { nairobiToday } from "@/features/analytics/automatic-feed-plan"
import FeedPlanner from "./planner"
import AutomaticPlanner from "./automatic-planner"

export default async function FeedPlanningPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams ?? {}
  const { user, accessToken } = await requireUserContext("/analytics/inputs/feed-planning")
  const { farmId, farmName } = await resolveInitialFarmId(typeof params.farmId === "string" ? params.farmId : null)
  if (!farmId) return <p>Select a farm to plan feed.</p>
  let content
  if (typeof params.plan === "string") {
    const saved = /^[0-9a-f-]{36}$/i.test(params.plan) ? await workbookClient(accessToken).from("cage_feed_plan").select("*").eq("farm_id", farmId).eq("id", params.plan).maybeSingle() : null
    const role = await getServerFarmRole({ farmId, userId: user.id, accessToken })
    content = saved?.data ? <><p className="text-sm">Saved snapshot · recorded inputs and results remain as they were when saved. <Link className="underline" href={`?farmId=${farmId}`}>Open the live plan</Link></p><FeedPlanner farmId={farmId} start={saved.data.starts_on} end={saved.data.ends_on} asOf={saved.data.source_as_of} today={nairobiToday()} sources={[]} saved={saved.data} canSave={role === "admin" || role === "farm_manager"}/></> : <p role="alert">This saved plan could not be loaded for this farm.</p>
  } else {
    let data: Awaited<ReturnType<typeof loadAutomaticFeedPlan>> | null = null
    let message = ""
    try { data = await loadAutomaticFeedPlan(farmId, accessToken, params) }
    catch (error) { message = error instanceof Error ? error.message : "The feed plan could not be loaded." }
    content = data ? <AutomaticPlanner farmId={farmId} data={data}/> : <div role="alert" className="rounded-xl border p-5"><p>{message}</p><Link className="underline" href={`?farmId=${farmId}`}>Reset planning filters</Link></div>
  }
  return <DashboardLayout hideHeader initialFarmId={farmId} initialFarmName={farmName}>
    <div className="page-shell space-y-5">
      <div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-semibold">Feed planning</h1><p className="text-sm text-muted-foreground">Live production records → future assumptions → feed requirements.</p></div><Link className="text-sm underline" href={`/analytics?farmId=${farmId}&report=planning`}>Production outlook</Link></div>
      {content}
    </div>
  </DashboardLayout>
}
