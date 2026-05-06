import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { apiRateLimits } from "@/lib/server/rate-limit"

/**
 * POST /api/reports/export
 *
 * Stub for scheduled/on-demand report export.
 * Returns 501 until the export pipeline (PDF/CSV generation, storage upload,
 * and optional email dispatch) is implemented.
 *
 * When implemented this route will:
 *  1. Accept a report specification (type, date range, farm/system scope, format)
 *  2. Generate the report file (CSV or PDF via a background job or edge function)
 *  3. Upload to Supabase Storage and return a signed download URL
 *  4. Optionally enqueue an email delivery via the notification queue
 *
 * Cache invalidation tags that must be added once live:
 *   cacheTags.reports(farmId), cacheTags.farm(farmId)
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "reports:export", apiRateLimits.reportQuery)
  if ("response" in auth) return auth.response

  return NextResponse.json(
    { error: "Report export is not yet implemented." },
    { status: 501 },
  )
}
