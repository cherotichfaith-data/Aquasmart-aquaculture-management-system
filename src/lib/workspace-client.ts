/**
 * Client-side workspace data helpers.
 * All queries run in the browser using the user's session cookie — no server
 * proxy needed. This sidesteps the ECONNABORTED issue where the Node.js
 * server process cannot reach Supabase's edge network.
 */
import { supabaseBrowser } from "@/lib/supabase/client"
import type { OrganizationSummary, FarmSummary } from "@/lib/context"

// ── Organization list ────────────────────────────────────────────────────────

export async function fetchOrganizationsForUser(): Promise<OrganizationSummary[]> {
  const supabase = supabaseBrowser()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated.")

  const [{ data: ownedOrgs }, { data: memberships }, { data: profile }] = await Promise.all([
    supabase.from("organization").select("id, name, slug").eq("owner_id", user.id).order("name"),
    supabase.from("farm_user").select("farm_id").eq("user_id", user.id),
    supabase
      .from("user_profile")
      .select("organization_id, farm_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ])

  // Collect all farm IDs the user has access to
  const farmIds = Array.from(
    new Set([
      ...(memberships ?? []).map((r) => r.farm_id).filter((v): v is string => Boolean(v)),
      ...(profile?.farm_id ? [profile.farm_id] : []),
    ]),
  )

  // Look up which organizations those farms belong to
  let farmOrgIds: string[] = []
  if (farmIds.length > 0) {
    const { data: farms } = await supabase
      .from("farm")
      .select("organization_id")
      .in("id", farmIds)
    farmOrgIds = (farms ?? [])
      .map((f) => f.organization_id)
      .filter((v): v is string => Boolean(v))
  }

  // Merge all known org IDs
  const allOrgIds = Array.from(
    new Set([
      ...(ownedOrgs ?? []).map((o) => o.id),
      ...(profile?.organization_id ? [profile.organization_id] : []),
      ...farmOrgIds,
    ]),
  )

  if (allOrgIds.length === 0) {
    return (ownedOrgs ?? []).map((o) => ({ id: o.id, name: o.name, slug: o.slug ?? null }))
  }

  const { data: orgs } = await supabase
    .from("organization")
    .select("id, name, slug")
    .in("id", allOrgIds)
    .order("name")

  const merged = [...(orgs ?? []), ...(ownedOrgs ?? [])]
  const unique = Array.from(new Map(merged.map((o) => [o.id, o])).values())
  return unique.map((o) => ({ id: o.id, name: o.name, slug: o.slug ?? null }))
}

// ── Farm list for an organization ────────────────────────────────────────────

export async function fetchFarmsForOrganization(organizationId: string): Promise<FarmSummary[]> {
  const supabase = supabaseBrowser()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated.")

  // Fetch all farms in this org (RLS filters to accessible ones)
  const { data: farms, error } = await supabase
    .from("farm")
    .select("id, name, location, organization_id")
    .eq("organization_id", organizationId)
    .order("name")

  if (error) throw new Error(error.message)

  // Also include farms the user has an explicit membership for in this org
  const { data: memberRows } = await supabase
    .from("farm_user")
    .select("farm_id, farm!inner(id, name, location, organization_id)")
    .eq("user_id", user.id)
    .eq("farm.organization_id", organizationId)

  const direct: FarmSummary[] = (farms ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    location: f.location ?? null,
    organizationId: f.organization_id ?? null,
  }))

  const member: FarmSummary[] = (memberRows ?? []).flatMap((r) => {
    const f = Array.isArray(r.farm)
      ? (r.farm[0] as { id: string; name: string; location: string | null; organization_id: string | null } | undefined)
      : (r.farm as { id: string; name: string; location: string | null; organization_id: string | null } | null)
    if (!f) return []
    return [{ id: f.id, name: f.name, location: f.location ?? null, organizationId: f.organization_id ?? null }]
  })

  const all = [...direct, ...member]
  return Array.from(new Map(all.map((f) => [f.id, f])).values())
}

// ── Create a new workspace (org + farm) ──────────────────────────────────────

export async function createWorkspaceClientSide(params: {
  organizationName: string
  farmName: string
  location: string
}): Promise<{ organizationId: string; farmId: string }> {
  const supabase = supabaseBrowser()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated.")

  function slugify(value: string) {
    return (
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "organization"
    )
  }

  // 1. Create organization
  const { data: org, error: orgError } = await supabase
    .from("organization")
    .insert({
      name: params.organizationName.trim(),
      slug: slugify(params.organizationName),
      owner_id: user.id,
    })
    .select("id")
    .single()

  if (orgError || !org) {
    throw new Error(orgError?.message ?? "Failed to create organization.")
  }

  // 2. Create farm
  const { data: farm, error: farmError } = await supabase
    .from("farm")
    .insert({
      name: params.farmName.trim(),
      location: params.location.trim(),
      organization_id: org.id,
    })
    .select("id")
    .single()

  if (farmError || !farm) {
    throw new Error(farmError?.message ?? "Failed to create farm.")
  }

  // 3. Link user to farm
  const { error: memberError } = await supabase.from("farm_user").insert({
    farm_id: farm.id,
    user_id: user.id,
    role: "admin",
  })

  if (memberError) {
    throw new Error(memberError.message ?? "Failed to create farm membership.")
  }

  // 4. Update user profile
  await supabase.from("user_profile").upsert(
    {
      user_id: user.id,
      email: user.email ?? null,
      organization_id: org.id,
      farm_id: farm.id,
      role: "admin",
    },
    { onConflict: "user_id" },
  )

  return { organizationId: org.id, farmId: farm.id }
}
