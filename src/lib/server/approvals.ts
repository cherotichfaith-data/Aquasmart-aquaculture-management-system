import "server-only"
import { NextResponse } from "next/server"
import type { createClient } from "@/lib/supabase/server"
import type { ApprovalEntry, ApprovalType } from "@/lib/approvals"
import type { Json } from "@/lib/types/database"

type Client = Awaited<ReturnType<typeof createClient>>

export async function submitApproval(client: Client, type: ApprovalType, farmId: string, payload: Record<string, unknown> | Record<string, unknown>[]) {
  const rows = Array.isArray(payload) ? payload : [payload]
  const { data, error } = await client.rpc("submit_production_entries", {
    p_type: type, p_farm_id: farmId, p_payloads: rows as Json,
  })
  if (error) throw new Error(error.code === "42501" ? "You do not have permission to submit these entries." : error.message)
  return data as unknown as ApprovalEntry[]
}

export async function submitApprovalResponse(client: Client, type: ApprovalType, farmId: string, payload: Record<string, unknown> | Record<string, unknown>[]) {
  try {
    const entries = await submitApproval(client, type, farmId, payload)
    const records = entries.map((entry) => ({ ...entry.payload, id: entry.id, approval_status: entry.status }))
    return NextResponse.json({
      data: Array.isArray(payload) ? records : records[0],
      meta: { farmId, systemId: entries[0]?.system_id ?? null, date: entries[0]?.event_date,
        pendingApproval: true, approvalIds: entries.map((entry) => entry.id) },
    }, { status: 202 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to submit for approval." }, { status: 400 })
  }
}
