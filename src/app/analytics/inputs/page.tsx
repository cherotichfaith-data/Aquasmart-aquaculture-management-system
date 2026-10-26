import Link from "next/link"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { requireUserContext } from "@/lib/supabase/require-user"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { getServerFarmRole } from "@/features/farm/role.server"
import { workbookClient } from "@/features/analytics/workbook-client.server"
import PlanningForm from "../workbook/planning-form"

export default async function InputsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
 const params = await searchParams ?? {}
 const farmParam = typeof params.farmId === "string" ? params.farmId : null
 if (params.view !== "planning") redirect(`/analytics/inputs/feed-planning${farmParam ? `?farmId=${encodeURIComponent(farmParam)}` : ""}`)
 const { user, accessToken } = await requireUserContext("/analytics/inputs")
 const { farmId, farmName } = await resolveInitialFarmId(farmParam)
 if (!farmId) return <p>Select a farm to set planning defaults.</p>
 const [role, settings] = await Promise.all([
  getServerFarmRole({ farmId, userId: user.id, accessToken }),
  workbookClient(accessToken).from("production_planning_settings").select("*").eq("farm_id", farmId).maybeSingle(),
 ])
 const canPlan = role === "admin" || role === "farm_manager"
 return <DashboardLayout hideHeader initialFarmId={farmId} initialFarmName={farmName} headerDataOverrides={{role:role??null}}>
  <div className="page-shell space-y-5">
   <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Farm defaults</h1><Link className="text-sm underline" href={`/analytics?farmId=${farmId}`}>Analytics</Link></div>
   <nav aria-label="Planning" className="flex flex-wrap gap-2"><Link className="rounded-full border px-4 py-2 text-sm" href={`/analytics/inputs/feed-planning?farmId=${farmId}`}>Feed planning</Link><Link aria-current="page" className="rounded-full border bg-primary text-primary-foreground px-4 py-2 text-sm" href={`/analytics/inputs?farmId=${farmId}&view=planning`}>Farm defaults</Link></nav>
   {settings.error?<p role="alert">Planning defaults could not be loaded. Please reload.</p>:<section className="rounded-xl border bg-card p-5 space-y-4">
    <h2 className="text-lg font-semibold">Stocking and growth model</h2>
    {canPlan?<PlanningForm key={farmId} farmId={farmId} fish={settings.data?.planned_fish??100000} abw={settings.data?.planned_abw_g??2} scenario={settings.data?.scenario??"main"}/>:<dl className="grid gap-3 sm:grid-cols-3"><div><dt>Monthly stocking</dt><dd>{(settings.data?.planned_fish??100000).toLocaleString()} fish</dd></div><div><dt>Stocking ABW</dt><dd>{settings.data?.planned_abw_g??2} g</dd></div><div><dt>Growth scenario</dt><dd>{settings.data?.scenario??"main"}</dd></div></dl>}
    {!canPlan?<p className="text-sm text-muted-foreground">A farm manager or administrator can change these defaults.</p>:null}
   </section>}
  </div>
 </DashboardLayout>
}
