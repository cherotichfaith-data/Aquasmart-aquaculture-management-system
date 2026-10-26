"use server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireActionUser } from "@/lib/server/auth"
import { workbookClient } from "@/features/analytics/workbook-client.server"
import { calculateFeed, MODEL_VERSION, planDays, validDate } from "@/features/analytics/feed-model"
const date=z.string().refine(validDate)
const schema=z.object({farm_id:z.string().uuid(), starts_on:date, ends_on:date, source_as_of:date,
 rows:z.array(z.object({system_id:z.number().int().positive(),batch_id:z.number().int().positive(),stock_no:z.number().int().min(0).max(10_000_000),abw_g:z.number().min(.3).max(1000),sampled_on:date})).min(1).max(500)})
export async function saveFeedPlan(input:unknown) {
 const {accessToken}=await requireActionUser("feed-plan:save")
 const parsed=schema.safeParse(input)
 if (!parsed.success) return {error:"Check all fish counts, ABWs and sampling dates before saving."}
 const p=parsed.data
 try {planDays(p.starts_on,p.ends_on)} catch {return {error:"Choose a planning period of 1–62 days."}}
 if(p.source_as_of>p.starts_on || p.rows.some(r=>r.sampled_on>p.source_as_of)) return {error:"Sampling and stock source dates must be on or before the plan starts."}
 const db=workbookClient(accessToken)
 const source=await db.rpc("api_cage_feed_plan_sources",{p_farm_id:p.farm_id,p_as_of:p.source_as_of})
 if(source.error) return {error:"Could not verify the source records. Reload and try again."}
 const keys=new Set<string>()
 const rows=[]
 for(const r of p.rows){
  const key=`${r.system_id}:${r.batch_id}`
  const s=source.data?.find(x=>x.system_id===r.system_id && x.batch_id===r.batch_id)
  if(!s || keys.has(key)) return {error:"A cage/batch is duplicated or no longer matches the source records. Reload the inputs."}
  keys.add(key)
  rows.push({...s,...r,source_stock_no:s.stock_no,source_abw_g:s.abw_g,source_sampled_on:s.sampled_on,result:calculateFeed(r.stock_no,r.abw_g,p.starts_on,p.ends_on)})
 }
 const saved=await db.from("cage_feed_plan").insert({farm_id:p.farm_id,starts_on:p.starts_on,ends_on:p.ends_on,source_as_of:p.source_as_of,model_version:MODEL_VERSION,rows}).select("id").single()
 if(saved.error) return {error:"Could not save. Only a farm manager or administrator can save feed plans."}
 revalidatePath("/analytics/inputs/feed-planning")
 return {error:null,id:saved.data.id}
}
