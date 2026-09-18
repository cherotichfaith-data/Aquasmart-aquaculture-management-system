import DashboardLayout from "@/components/layout/dashboard-layout"
import { DataEntryNavigation } from "@/features/data-entry/components/data-entry-navigation"
import { redirect } from "next/navigation"
import { requireUserContext } from "@/lib/supabase/require-user"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { canAccessDataEntry, normalizeRole, WORKSPACE_SELECT_PATH } from "@/lib/app-entry"
import ApprovalsClient from "./approvals-client"

export const metadata = { title: "Data Entry Approvals - SUSTAIN Aquasmart" }

export default async function ApprovalsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {}
  const { user, accessToken } = await requireUserContext("/approvals")
  const { farmId, farmName } = await resolveInitialFarmId(typeof params.farmId === "string" ? params.farmId : null)
  if (!farmId) redirect(`${WORKSPACE_SELECT_PATH}?next=%2Fapprovals`)
  const client = createAccessTokenClient(accessToken)
  const { data: membership } = await client.from("farm_user").select("role").eq("farm_id", farmId).eq("user_id", user.id).maybeSingle()
  const role = normalizeRole(membership?.role)
  if (!canAccessDataEntry(role)) redirect("/unauthorized")
  const canReview = role === "admin" || role === "farm_manager"

  const [systemsRes, batchesRes, feedTypesRes, memberRows] = await Promise.all([
    client.from("system").select("id,name,is_active").eq("farm_id", farmId),
    client.from("fingerling_batch").select("id,name").eq("farm_id", farmId),
    client.rpc("api_feed_type_options_rpc", { p_farm_id: farmId }),
    client.from("farm_user").select("user_id").eq("farm_id", farmId),
  ])
  if (systemsRes.error || batchesRes.error || feedTypesRes.error || memberRows.error) throw new Error("Unable to load approval reference data. Please retry.")
  const memberIds = (memberRows.data ?? []).map((row) => row.user_id)
  const { data: profiles } = memberIds.length
    ? await client.from("user_profile").select("user_id,full_name").in("user_id", memberIds)
    : { data: [] as { user_id: string; full_name: string | null }[] }

  const systemRows = systemsRes.data ?? []
  const systems = systemRows.map((row) => ({ id: row.id, name: row.name ?? `Cage #${row.id}` }))
  // Only active cages are selectable when editing; the full list above still resolves
  // names for historical entries on retired cages.
  const activeSystems = systemRows
    .filter((row) => row.is_active !== false)
    .map((row) => ({ id: row.id, name: row.name ?? `Cage #${row.id}` }))
  const batches = (batchesRes.data ?? []).map((row) => ({ id: row.id, name: row.name ?? `Batch #${row.id}` }))
  const feedTypes = (feedTypesRes.data ?? []).map((row) => ({ id: row.id, name: row.label }))
  const members = (profiles ?? []).map((row) => ({ id: row.user_id, name: row.full_name ?? "" }))

  return (
    <DashboardLayout hideHeader initialFarmId={farmId} initialFarmName={farmName} headerDataOverrides={{ role }}>
      <div className="data-entry-layout data-entry-board">
        <div className="data-entry-header">
          <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">Data Entry</h1>
        </div>

        <DataEntryNavigation active="approvals" farmId={farmId} role={role} systemId={Number(params.system) || null} batchId={Number(params.batch) || null} />

        <div className="data-entry-workspace">
          <section className="data-entry-canvas min-w-0" aria-label="Approvals">
            <ApprovalsClient
              farmId={farmId}
              canReview={canReview}
              currentUserId={user.id}
              systems={systems}
              activeSystems={activeSystems}
              batches={batches}
              feedTypes={feedTypes}
              members={members}
            />
          </section>
        </div>
      </div>
    </DashboardLayout>
  )
}
