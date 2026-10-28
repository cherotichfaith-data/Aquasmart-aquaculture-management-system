import { NextResponse } from "next/server"
import { z } from "zod"
import { requireApiUser } from "@/lib/server/auth"
import { logSbError } from "@/lib/supabase/log"
import { toQueryError, toQuerySuccess } from "@/lib/supabase/query-transport"
import { loadBatchOptionRows } from "@/features/shared/batch-options-source"
import { getScopedSystemOptions } from "@/features/shared/scoped-analytics.server"

export const dynamic = "force-dynamic"

const stageSchema = z.enum(["all", "nursing", "grow_out"])

const querySchema = z.object({
  kind: z.enum(["systems", "batches"]),
  farmId: z.string().uuid(),
  activeOnly: z.enum(["true", "false"]).optional(),
  stage: stageSchema.optional(),
})

/**
 * Cage and batch option lists for the shared filters, read from the database on the server with the
 * signed-in cookie session, so the lists never depend on the browser's own auth state being ready.
 */
export async function GET(request: Request) {
  const auth = await requireApiUser("api:options")
  if ("response" in auth) return auth.response

  const url = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 })

  const { kind, farmId, activeOnly, stage } = parsed.data
  const headers = { "Cache-Control": "no-store" }
  const tag = `api:options:${kind}`

  try {
    if (kind === "systems") {
      const rows = await getScopedSystemOptions(auth.supabase, farmId, stage ?? "all", activeOnly !== "false")
      return NextResponse.json(toQuerySuccess(rows), { headers })
    }

    const rows = await loadBatchOptionRows(auth.supabase, { farmId, activeOnly: activeOnly !== "false" })
    return NextResponse.json(toQuerySuccess(rows), { headers })
  } catch (error) {
    logSbError(tag, error)
    return NextResponse.json(toQueryError(tag, error), { status: 500, headers })
  }
}
