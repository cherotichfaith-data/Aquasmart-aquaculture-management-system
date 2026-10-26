import { fetchRpc } from "@/lib/supabase/query-transport"
import { EMPTY_FEED_DASHBOARD_PAYLOAD, type FeedDashboardPayload } from "@/features/feed/types"

export type FeedDashboardResult =
  | { status: "success"; data: FeedDashboardPayload }
  | { status: "error"; error: string }

function buildScopedArgs(params?: {
  farmId?: string | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
}) {
  return {
    p_farm_id: params?.farmId ?? null,
    p_system_ids:
      params?.systemIds && params.systemIds.length > 0
        ? params.systemIds.filter((id) => Number.isFinite(id))
        : null,
    p_start_date: params?.dateFrom ?? null,
    p_end_date: params?.dateTo ?? null,
  }
}

/**
 * Every /feed section in one call. Replaces the 8 per-section feed RPCs this
 * page used to fan out to. `api_feed_dashboard` returns a single JSONB object;
 * the /api/rpc proxy forwards it verbatim.
 */
export async function getFeedDashboard(params?: {
  farmId?: string | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<FeedDashboardResult> {
  if (!params?.farmId) return { status: "success", data: EMPTY_FEED_DASHBOARD_PAYLOAD }

  const res = await fetchRpc<unknown>(
    "feed-management:api_feed_dashboard",
    "api_feed_dashboard",
    buildScopedArgs(params),
    params.signal,
  )
  if (res.status === "error") return { status: "error", error: res.error }

  // Scalar-jsonb RPC: the object may arrive directly or (defensively) wrapped
  // in a one-element array by the transport's array-shaped QueryResult.
  const raw: unknown = Array.isArray(res.data) ? res.data[0] : res.data
  const payload = raw && typeof raw === "object" ? (raw as Partial<FeedDashboardPayload>) : null

  return {
    status: "success",
    data: payload ? { ...EMPTY_FEED_DASHBOARD_PAYLOAD, ...payload } : EMPTY_FEED_DASHBOARD_PAYLOAD,
  }
}
