# Frontend Endpoint Calling Cheat Sheet

Use this guide for all frontend data access patterns.

## Enforced wrappers

To enforce the pattern at compile time, use helpers from `lib/api/_utils.ts`:

```ts
import { queryKpiRpc, queryOptionsView } from "@/lib/api/_utils"
```

- `queryKpiRpc(...)` only accepts allowed KPI RPC names.
- `queryOptionsView(...)` only accepts allowed options/reference view names.

## KPI endpoints (materialized-view backed): RPC only

Rule:
- Always: `supabase.rpc('<function>', args)`
- Never: `supabase.from('api_*')` for these names

### 1) `api_dashboard`
```ts
const { data, error } = await supabase.rpc("api_dashboard", {
  p_farm_id: farmId,
  p_system_id: systemId ?? null,
  p_growth_stage: growthStage ?? null,
  p_start_date: dateFrom ?? null,
  p_end_date: dateTo ?? null,
  p_time_period: timePeriod ?? null,
  p_limit: 1,
  p_order_desc: true,
})
```

### 2) `api_dashboard_consolidated`
```ts
const { data, error } = await supabase.rpc("api_dashboard_consolidated", {
  p_farm_id: farmId,
  p_system_id: systemId ?? null,
  p_start_date: dateFrom ?? null,
  p_end_date: dateTo ?? null,
  p_time_period: timePeriod ?? null,
  p_limit: 1,
  p_order_desc: true,
})
```

### 3) `api_daily_fish_inventory`
```ts
const { data, error } = await supabase.rpc("api_daily_fish_inventory", {
  p_farm_id: farmId,
  p_system_id: systemId ?? null,
  p_start_date: dateFrom ?? null,
  p_end_date: dateTo ?? null,
})
// sort/limit in JS OR add p_limit/p_order_desc to function
```

### 4) `api_daily_fish_inventory_consolidated`
```ts
const { data, error } = await supabase.rpc("api_daily_fish_inventory_consolidated", {
  p_farm_id: farmId,
  p_system_id: systemId ?? null,
  p_start_date: dateFrom ?? null,
  p_end_date: dateTo ?? null,
})
```

### 5) `api_efcr_trend`
```ts
const { data, error } = await supabase.rpc("api_efcr_trend", {
  p_farm_id: farmId,
  p_system_id: systemId ?? null,
  p_start_date: dateFrom ?? null,
  p_end_date: dateTo ?? null,
})
```

### 6) `api_production_summary`
```ts
const { data, error } = await supabase.rpc("api_production_summary", {
  p_farm_id: farmId,
  p_system_id: systemId ?? null,
  p_start_date: dateFrom ?? null,
  p_end_date: dateTo ?? null,
})
```

Important:
- For RPC calls, do not chain `.order()` / `.limit()` unless explicitly verified for that RPC.
- Prefer ordering/limit inside the function, or sort/limit in JS.

## Options/reference endpoints (small): Views only

Rule:
- Always: `supabase.from('<view>').select(...)`
- Never: `supabase.rpc(...)` for these

### 1) `api_farm_options`
```ts
const { data, error } = await supabase
  .from("api_farm_options")
  .select("id,label,location")
  .order("label", { ascending: true })
```

### 2) `api_system_options`
```ts
const { data, error } = await supabase
  .from("api_system_options")
  .select("id,label,type,growth_stage,is_active,farm_id,farm_name")
  .eq("is_active", true)
  .order("label", { ascending: true })
```

### 3) `api_feed_type_options`
```ts
const { data, error } = await supabase
  .from("api_feed_type_options")
  .select("id,label,feed_line,feed_category,feed_pellet_size,crude_protein_percentage,crude_fat_percentage")
  .order("label", { ascending: true })
```

### 4) `api_fingerling_batch_options`
```ts
const { data, error } = await supabase
  .from("api_fingerling_batch_options")
  .select("id,label,farm_id,date_of_delivery,abw,number_of_fish,supplier_id")
  .eq("farm_id", farmId)
  .order("date_of_delivery", { ascending: false })
```

### 5) `api_alert_thresholds`
```ts
const { data, error } = await supabase
  .from("api_alert_thresholds")
  .select("*")
  .eq("farm_id", farmId)
```

Write via base table `alert_threshold` where permitted.

### 6) `api_water_quality_measurements`
```ts
const { data, error } = await supabase
  .from("api_water_quality_measurements")
  .select("*")
  .eq("farm_id", farmId)
  .eq("system_id", systemId)
  .gte("date", dateFrom)
  .lte("date", dateTo)
  .order("date", { ascending: true })
  .order("time", { ascending: true })
```

### 7) `api_latest_water_quality_rating`
```ts
const { data, error } = await supabase
  .from("api_latest_water_quality_rating")
  .select("*")
  .eq("farm_id", farmId)
```

### 8) `api_daily_water_quality_rating`
```ts
const { data, error } = await supabase
  .from("api_daily_water_quality_rating")
  .select("*")
  .eq("farm_id", farmId)
  .eq("system_id", systemId)
  .gte("rating_date", dateFrom)
  .lte("rating_date", dateTo)
  .order("rating_date", { ascending: true })
```
