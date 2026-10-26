import type { calculateFeed } from "./feed-model"
export type FeedSource = { system_id:number; batch_id:number; cage_name:string; batch_name:string; stock_no:number; stock_date:string; abw_g:number|null; sampled_on:string|null }
export type FeedRow = FeedSource & { source_stock_no:number; source_abw_g:number|null; source_sampled_on:string|null; result:ReturnType<typeof calculateFeed> }
export type FeedPlan = { id:string; farm_id:string; starts_on:string; ends_on:string; source_as_of:string; model_version:string; rows:FeedRow[]; created_at:string; created_by:string }
export type FeedTables = { cage_feed_plan:{ Row:FeedPlan; Insert:Omit<FeedPlan,"id"|"created_at"|"created_by"> & { id?:string }; Update:never; Relationships:[] } }
export type FeedFunctions = { api_cage_feed_plan_sources:{ Args:{p_farm_id:string;p_as_of:string}; Returns:FeedSource[] } }
