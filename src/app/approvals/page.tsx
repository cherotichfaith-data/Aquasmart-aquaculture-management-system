import Link from "next/link"
import { redirect } from "next/navigation"
import { requireUserContext } from "@/lib/supabase/require-user"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { canAccessDataEntry, DATA_ENTRY_PATH, normalizeRole, WORKSPACE_SELECT_PATH } from "@/lib/app-entry"
import ApprovalsClient from "./approvals-client"

export const metadata = { title: "Approvals - SUSTAIN Aquasmart" }

const dataEntryTabs = [
  ["feeding", "Feeding"],
  ["feed_inventory", "Feed Inventory"],
  ["mortality", "Mortality"],
  ["sampling", "Sampling"],
  ["water_quality", "Water Quality"],
  ["transfer", "Transfer"],
  ["harvest", "Harvest"],
  ["stocking", "Stocking"],
  ["system", "System Setup"],
] as const

export default async function ApprovalsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {}
  const { user, accessToken } = await requireUserContext("/approvals")
  const { farmId } = await resolveInitialFarmId(typeof params.farmId === "string" ? params.farmId : null)
  if (!farmId) redirect(`${WORKSPACE_SELECT_PATH}?next=%2Fapprovals`)
  const client = createAccessTokenClient(accessToken)
  const { data: membership } = await client.from("farm_user").select("role").eq("farm_id", farmId).eq("user_id", user.id).maybeSingle()
  const role = normalizeRole(membership?.role)
  if (!canAccessDataEntry(role)) redirect("/unauthorized")
  const canReview = role === "admin" || role === "farm_manager"

  const [systemsRes, batchesRes, feedTypesRes, memberRows] = await Promise.all([
    client.from("system").select("id,name").eq("farm_id", farmId),
    client.from("fingerling_batch").select("id,name").eq("farm_id", farmId),
    client.rpc("api_feed_type_options_rpc", { p_farm_id: farmId }),
    client.from("farm_user").select("user_id").eq("farm_id", farmId),
  ])
  const memberIds = (memberRows.data ?? []).map((row) => row.user_id)
  const { data: profiles } = memberIds.length
    ? await client.from("user_profile").select("user_id,full_name").in("user_id", memberIds)
    : { data: [] as { user_id: string; full_name: string | null }[] }

  const systems = (systemsRes.data ?? []).map((row) => ({ id: row.id, name: row.name ?? `Cage #${row.id}` }))
  const batches = (batchesRes.data ?? []).map((row) => ({ id: row.id, name: row.name ?? `Batch #${row.id}` }))
  const feedTypes = (feedTypesRes.data ?? []).map((row) => ({ id: row.id, name: row.label }))
  const members = (profiles ?? []).map((row) => ({ id: row.user_id, name: row.full_name ?? "" }))

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <h1 className="text-xl font-semibold leading-tight tracking-tight">Data Entry</h1>

        <div className="data-entry-tabs-shell">
          <div className="data-entry-tabs-list" role="tablist" aria-label="Data entry forms and approvals">
            {dataEntryTabs.map(([id, label]) => (
              <Link key={id} href={`${DATA_ENTRY_PATH}?type=${id}`} className="data-entry-tab data-entry-tab-idle" role="tab" aria-selected="false">
                <span>{label}</span>
              </Link>
            ))}
            <span className="mx-1 self-stretch border-l border-border" aria-hidden />
            <span className="data-entry-tab data-entry-tab-active" role="tab" aria-selected="true">
              {canReview ? "Approval" : "My submissions"}
            </span>
          </div>
        </div>

        <ApprovalsClient
          farmId={farmId}
          canReview={canReview}
          currentUserId={user.id}
          systems={systems}
          batches={batches}
          feedTypes={feedTypes}
          members={members}
        />
      </div>
    </main>
  )
}
