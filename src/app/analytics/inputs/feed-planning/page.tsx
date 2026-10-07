import Link from "next/link"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { requireUserContext } from "@/lib/supabase/require-user"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { getServerFarmRole } from "@/features/farm/role.server"
import { workbookClient } from "@/features/analytics/workbook-client.server"
import { validDate, planDays } from "@/features/analytics/feed-model"
import FeedPlanner from "./planner"
export default async function FeedPlanningPage({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams??{}
 const {user,accessToken}=await requireUserContext("/analytics/inputs/feed-planning")
 const {farmId,farmName}=await resolveInitialFarmId(typeof params.farmId==="string"?params.farmId:null)
 if(!farmId)return <p>Select a farm to plan feed.</p>
 const parts=new Intl.DateTimeFormat("en",{timeZone:"Africa/Nairobi",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date())
 const part=(type:string)=>parts.find(p=>p.type===type)!.value
 const today=`${part("year")}-${part("month")}-${part("day")}`
 let start=typeof params.start==="string"&&validDate(params.start)?params.start:`${today.slice(0,7)}-01`
 let end=typeof params.end==="string"&&validDate(params.end)?params.end:new Date(Date.UTC(Number(start.slice(0,4)),Number(start.slice(5,7)),0)).toISOString().slice(0,10)
 try{planDays(start,end)}catch{start=`${today.slice(0,7)}-01`;end=new Date(Date.UTC(Number(start.slice(0,4)),Number(start.slice(5,7)),0)).toISOString().slice(0,10)}
 const previous=new Date(Date.parse(start)-86400000).toISOString().slice(0,10)
 const asOf=typeof params.asOf==="string"&&validDate(params.asOf)&&params.asOf<=today&&params.asOf<=start?params.asOf:previous<today?previous:today
 const db=workbookClient(accessToken)
 const [role,sources,saved]=await Promise.all([
  getServerFarmRole({farmId,userId:user.id,accessToken}),
  db.rpc("api_cage_feed_plan_sources",{p_farm_id:farmId,p_as_of:asOf}),
  typeof params.plan==="string"&&/^[0-9a-f-]{36}$/i.test(params.plan)?db.from("cage_feed_plan").select("*").eq("farm_id",farmId).eq("id",params.plan).maybeSingle():Promise.resolve(null),
 ])
 return <DashboardLayout hideHeader initialFarmId={farmId} initialFarmName={farmName} headerDataOverrides={{role:role??null}}>
  <div className="page-shell space-y-5">
   <div className="flex flex-wrap justify-between gap-3"><h1 className="text-2xl font-semibold">Feed planning</h1><Link className="text-sm underline" href={`/analytics?farmId=${farmId}`}>Analytics</Link></div>
   <nav aria-label="Input sheets" className="flex flex-wrap gap-2"><Link aria-current="page" className="rounded-full border bg-primary text-primary-foreground px-4 py-2 text-sm" href={`/analytics/inputs/feed-planning?farmId=${farmId}`}>Feed planning</Link><Link className="rounded-full border px-4 py-2 text-sm" href={`/analytics/inputs?farmId=${farmId}&view=planning`}>Farm defaults</Link></nav>
   {sources.error||saved?.error?<p role="alert">Feed planning could not be loaded. Please reload.</p>:params.plan&&!saved?.data?<p role="alert">This saved plan was not found for this farm.</p>:<FeedPlanner key={`${farmId}:${start}:${end}:${asOf}:${saved?.data?.id??"new"}`} farmId={farmId} start={start} end={end} asOf={asOf} today={today} sources={sources.data??[]} saved={saved?.data??null} canSave={role==="admin"||role==="farm_manager"}/>}
  </div>
 </DashboardLayout>
}
