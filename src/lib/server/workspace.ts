import { createAdminClient } from "@/lib/supabase/admin"
import { createAccessTokenClient } from "@/lib/supabase/access-token-client"
import {
  normalizeContextValue,
  type FarmSummary,
  type OrganizationSummary,
  type WorkspaceContext,
} from "@/lib/context"

type MembershipRow = {
  farm_id: string | null
  organization_id: string | null
  role: string | null
}

type MembershipQueryRow = {
  farm_id: string | null
  role: string | null
}

type FarmOrganizationRow = {
  id: string
  organization_id: string | null
}

function createWorkspaceClient(accessToken?: string | null) {
  return accessToken ? createAccessTokenClient(accessToken) : createAdminClient()
}

function isFetchLikeWorkspaceError(error: unknown) {
  if (!error) return false
  if (error instanceof TypeError) {
    return error.message.toLowerCase().includes("fetch failed")
  }
  if (error instanceof Error) {
    return error.message.toLowerCase().includes("fetch failed")
  }
  return false
}

async function loadWorkspaceMembershipRows(userId: string, accessToken?: string | null) {
  const admin = createWorkspaceClient(accessToken)
  const { data: memberships, error: membershipError } = await admin.from("farm_user").select("farm_id, role").eq("user_id", userId)

  if (membershipError) {
    throw new Error(membershipError.message)
  }

  const baseRows = (memberships ?? []) as MembershipQueryRow[]
  const membershipFarmIds = Array.from(
    new Set(
      baseRows
        .map((row) => normalizeContextValue(row.farm_id))
        .filter((value): value is string => Boolean(value)),
    ),
  )
  const { data: membershipFarmRows, error: membershipFarmError } =
    membershipFarmIds.length > 0
      ? await admin.from("farm").select("id, organization_id").in("id", membershipFarmIds)
      : { data: [], error: null }

  if (membershipFarmError) {
    throw new Error(membershipFarmError.message)
  }

  const membershipFarmOrganizationMap = new Map(
    ((membershipFarmRows ?? []) as FarmOrganizationRow[]).map((row) => [row.id, normalizeContextValue(row.organization_id)]),
  )
  const rows: MembershipRow[] = baseRows.map((row) => ({
    farm_id: normalizeContextValue(row.farm_id),
    organization_id: normalizeContextValue(
      row.farm_id ? membershipFarmOrganizationMap.get(row.farm_id) ?? null : null,
    ),
    role: row.role ?? null,
  }))

  return { admin, memberships: rows }
}

async function loadWorkspaceAssets(userId: string, accessToken?: string | null) {
  const { admin, memberships } = await loadWorkspaceMembershipRows(userId, accessToken)
  const directOrganizationIds = memberships
    .map((row) => normalizeContextValue(row.organization_id))
    .filter((value): value is string => Boolean(value))
  const farmIds = memberships
    .map((row) => normalizeContextValue(row.farm_id))
    .filter((value): value is string => Boolean(value))

  const [{ data: farmRows, error: farmError }, { data: ownedOrganizations, error: ownedOrganizationsError }] =
    await Promise.all([
      farmIds.length > 0
        ? admin.from("farm").select("id, name, location, organization_id").in("id", farmIds).order("name")
        : Promise.resolve({ data: [], error: null }),
      admin.from("organization").select("id, name, slug").eq("owner_id", userId).order("name"),
    ])

  if (farmError) {
    throw new Error(farmError.message)
  }

  if (ownedOrganizationsError) {
    throw new Error(ownedOrganizationsError.message)
  }

  const farms: FarmSummary[] = (farmRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    location: row.location ?? null,
    organizationId: row.organization_id ?? null,
  }))

  const farmOrganizationIds = farms
    .map((row) => normalizeContextValue(row.organizationId))
    .filter((value): value is string => Boolean(value))
  const ownedOrganizationIds = (ownedOrganizations ?? []).map((row) => row.id)
  const organizationIds = Array.from(new Set([...directOrganizationIds, ...farmOrganizationIds, ...ownedOrganizationIds]))

  const { data: organizationRows, error: organizationError } =
    organizationIds.length > 0
      ? await admin.from("organization").select("id, name, slug").in("id", organizationIds).order("name")
      : { data: [], error: null }

  if (organizationError) {
    throw new Error(organizationError.message)
  }

  const mergedOrganizations = [...(organizationRows ?? []), ...(ownedOrganizations ?? [])]
  const organizations: OrganizationSummary[] = Array.from(
    new Map(mergedOrganizations.map((row) => [row.id, row])).values(),
  ).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug ?? null,
  }))

  return {
    memberships,
    organizations,
    farms,
  }
}

async function loadWorkspaceAssetsWithFallback(userId: string, accessToken?: string | null) {
  try {
    return await loadWorkspaceAssets(userId, accessToken)
  } catch (error) {
    if (!accessToken || !isFetchLikeWorkspaceError(error)) {
      throw error
    }
    return loadWorkspaceAssets(userId, null)
  }
}

export async function loadWorkspaceOrganizationsForUser(
  userId: string,
  accessToken?: string | null,
): Promise<OrganizationSummary[]> {
  const { organizations } = await loadWorkspaceAssetsWithFallback(userId, accessToken)
  return organizations
}

export async function loadWorkspaceFarmsForUser(
  userId: string,
  organizationId: string,
  accessToken?: string | null,
): Promise<FarmSummary[]> {
  const { farms } = await loadWorkspaceAssetsWithFallback(userId, accessToken)
  return farms.filter((farm) => farm.organizationId === organizationId)
}

export async function loadWorkspaceContextForUser(params: {
  userId: string
  accessToken?: string | null
  requestedOrganizationId?: string | null
  requestedFarmId?: string | null
  cookieOrganizationId?: string | null
  cookieFarmId?: string | null
}): Promise<WorkspaceContext> {
  const { memberships, organizations, farms } = await loadWorkspaceAssetsWithFallback(
    params.userId,
    params.accessToken,
  )
  const organizationIdSet = new Set(organizations.map((row) => row.id))
  const farmMap = new Map(farms.map((row) => [row.id, row]))

  const requestedFarmId = normalizeContextValue(params.requestedFarmId)
  const cookieFarmId = normalizeContextValue(params.cookieFarmId)
  const requestedOrganizationId = normalizeContextValue(params.requestedOrganizationId)
  const cookieOrganizationId = normalizeContextValue(params.cookieOrganizationId)

  const organizationFromFarm = (farmId: string | null) => {
    if (!farmId) return null
    return farmMap.get(farmId)?.organizationId ?? null
  }

  let resolvedOrganizationId =
    (requestedOrganizationId && organizationIdSet.has(requestedOrganizationId) ? requestedOrganizationId : null) ??
    organizationFromFarm(requestedFarmId) ??
    (cookieOrganizationId && organizationIdSet.has(cookieOrganizationId) ? cookieOrganizationId : null) ??
    organizationFromFarm(cookieFarmId) ??
    (organizations.length === 1 ? organizations[0]?.id ?? null : null)

  const farmsInOrganization = resolvedOrganizationId
    ? farms.filter((farm) => farm.organizationId === resolvedOrganizationId)
    : farms
  const farmIdSet = new Set(farmsInOrganization.map((row) => row.id))

  const resolvedFarmId =
    (requestedFarmId && farmIdSet.has(requestedFarmId) ? requestedFarmId : null) ??
    (cookieFarmId && farmIdSet.has(cookieFarmId) ? cookieFarmId : null) ??
    (farmsInOrganization.length === 1 ? farmsInOrganization[0]?.id ?? null : null)

  if (!resolvedOrganizationId && resolvedFarmId) {
    resolvedOrganizationId = organizationFromFarm(resolvedFarmId)
  }

  const organization = organizations.find((row) => row.id === resolvedOrganizationId) ?? null
  const farm = farms.find((row) => row.id === resolvedFarmId) ?? null
  const role =
    memberships.find((row) => row.farm_id === resolvedFarmId)?.role ??
    memberships.find((row) => row.organization_id === resolvedOrganizationId)?.role ??
    null

  return {
    organizations,
    farms,
    organization,
    farm,
    role,
  }
}
