import { createAccessTokenClient } from "@/lib/supabase/access-token-client"

export const ACTIVE_ORGANIZATION_COOKIE = "aquasmart-active-organization"
export const ACTIVE_FARM_COOKIE = "aquasmart-active-farm"

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

type CookieReader = {
  get: (name: string) => { value?: string } | undefined
}

export type OrganizationSummary = {
  id: string
  name: string
  slug: string | null
}

export type FarmSummary = {
  id: string
  name: string
  location: string | null
  organizationId: string | null
}

export type WorkspaceContext = {
  organizations: OrganizationSummary[]
  farms: FarmSummary[]
  organization: OrganizationSummary | null
  farm: FarmSummary | null
  role: string | null
}

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

export function normalizeContextValue(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : ""
  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    return null
  }
  return trimmed
}

export function getWorkspaceCookieValues(cookieStore: CookieReader) {
  return {
    organizationId: normalizeContextValue(cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value),
    farmId: normalizeContextValue(cookieStore.get(ACTIVE_FARM_COOKIE)?.value),
  }
}

export function setWorkspaceContextCookies(
  response: {
    cookies: {
      set: (
        name: string,
        value: string,
        options?: {
          path?: string
          maxAge?: number
          sameSite?: "lax" | "strict" | "none"
        },
      ) => void
    }
  },
  values: {
    organizationId?: string | null
    farmId?: string | null
  },
) {
  const organizationId = normalizeContextValue(values.organizationId)
  const farmId = normalizeContextValue(values.farmId)

  if (organizationId) {
    response.cookies.set(ACTIVE_ORGANIZATION_COOKIE, organizationId, {
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
      sameSite: "lax",
    })
  }

  if (farmId) {
    response.cookies.set(ACTIVE_FARM_COOKIE, farmId, {
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
      sameSite: "lax",
    })
  }
}

export function clearWorkspaceContextCookies(
  response: {
    cookies: {
      set: (
        name: string,
        value: string,
        options?: {
          path?: string
          maxAge?: number
        },
      ) => void
    }
  },
) {
  response.cookies.set(ACTIVE_ORGANIZATION_COOKIE, "", {
    path: "/",
    maxAge: 0,
  })
  response.cookies.set(ACTIVE_FARM_COOKIE, "", {
    path: "/",
    maxAge: 0,
  })
}

export function setBrowserWorkspaceContext(values: {
  organizationId?: string | null
  farmId?: string | null
}) {
  if (typeof document === "undefined") return

  const organizationId = normalizeContextValue(values.organizationId)
  const farmId = normalizeContextValue(values.farmId)

  if (organizationId) {
    document.cookie = `${ACTIVE_ORGANIZATION_COOKIE}=${organizationId}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`
  }

  if (farmId) {
    document.cookie = `${ACTIVE_FARM_COOKIE}=${farmId}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`
  }
}

export function clearBrowserWorkspaceContext() {
  if (typeof document === "undefined") return

  document.cookie = `${ACTIVE_ORGANIZATION_COOKIE}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
  document.cookie = `${ACTIVE_FARM_COOKIE}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
}

async function loadWorkspaceMembershipRows(params: {
  userId: string
  accessToken: string
}) {
  const supabase = createAccessTokenClient(params.accessToken)
  const { data: memberships, error: membershipError } = await supabase
    .from("farm_user")
    .select("farm_id, role")
    .eq("user_id", params.userId)

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
      ? await supabase.from("farm").select("id, organization_id").in("id", membershipFarmIds)
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

  return {
    supabase,
    memberships: rows,
  }
}

async function loadWorkspaceAssets(params: {
  supabase: ReturnType<typeof createAccessTokenClient>
  memberships: MembershipRow[]
}) {
  const directOrganizationIds = Array.from(
    new Set(
      params.memberships
        .map((row) => normalizeContextValue(row.organization_id))
        .filter((value): value is string => Boolean(value)),
    ),
  )
  const farmIds = Array.from(
    new Set(
      params.memberships
        .map((row) => normalizeContextValue(row.farm_id))
        .filter((value): value is string => Boolean(value)),
    ),
  )

  const { data: farmRows, error: farmError } =
    farmIds.length > 0
      ? await params.supabase.from("farm").select("id, name, location, organization_id").in("id", farmIds).order("name")
      : { data: [], error: null }

  if (farmError) {
    throw new Error(farmError.message)
  }

  const farms: FarmSummary[] = (farmRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    location: row.location ?? null,
    organizationId: row.organization_id ?? null,
  }))

  const derivedOrganizationIds = Array.from(
    new Set(
      farms
        .map((row) => normalizeContextValue(row.organizationId))
        .filter((value): value is string => Boolean(value)),
    ),
  )
  const organizationIds = Array.from(new Set([...directOrganizationIds, ...derivedOrganizationIds]))

  const { data: organizationRows, error: organizationError } =
    organizationIds.length > 0
      ? await params.supabase.from("organization").select("id, name, slug").in("id", organizationIds).order("name")
      : { data: [], error: null }

  if (organizationError) {
    throw new Error(organizationError.message)
  }

  const organizations: OrganizationSummary[] = (organizationRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug ?? null,
  }))

  return {
    organizations,
    farms,
  }
}

export async function loadWorkspaceContext(params: {
  userId: string
  accessToken: string
  requestedOrganizationId?: string | null
  requestedFarmId?: string | null
  cookieOrganizationId?: string | null
  cookieFarmId?: string | null
}): Promise<WorkspaceContext> {
  const { supabase, memberships } = await loadWorkspaceMembershipRows({
    userId: params.userId,
    accessToken: params.accessToken,
  })
  const { organizations, farms } = await loadWorkspaceAssets({
    supabase,
    memberships,
  })

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

export async function loadWorkspaceFarmsForOrganization(params: {
  userId: string
  accessToken: string
  organizationId: string
}): Promise<FarmSummary[]> {
  const { supabase, memberships } = await loadWorkspaceMembershipRows({
    userId: params.userId,
    accessToken: params.accessToken,
  })
  const { farms } = await loadWorkspaceAssets({
    supabase,
    memberships,
  })

  return farms.filter((farm) => farm.organizationId === params.organizationId)
}

export async function loadWorkspaceOrganizations(params: {
  userId: string
  accessToken: string
}): Promise<OrganizationSummary[]> {
  const { supabase, memberships } = await loadWorkspaceMembershipRows({
    userId: params.userId,
    accessToken: params.accessToken,
  })
  const organizationIds = memberships
    .map((row) => normalizeContextValue(row.organization_id))
    .filter((value): value is string => Boolean(value))

  const { data: ownedOrganizations, error: ownedOrganizationsError } = await supabase
    .from("organization")
    .select("id, name, slug")
    .eq("owner_id", params.userId)
    .order("name")

  if (ownedOrganizationsError) {
    throw new Error(ownedOrganizationsError.message)
  }

  const ownedOrganizationIds = (ownedOrganizations ?? []).map((row) => row.id)
  const resolvedOrganizationIds = Array.from(new Set([...organizationIds, ...ownedOrganizationIds]))

  if (resolvedOrganizationIds.length === 0) {
    return []
  }

  const { data: organizations, error } =
    resolvedOrganizationIds.length > 0
      ? await supabase.from("organization").select("id, name, slug").in("id", resolvedOrganizationIds).order("name")
      : { data: [], error: null }

  if (error) {
    throw new Error(error.message)
  }

  const merged = [...(organizations ?? []), ...(ownedOrganizations ?? [])]
  const uniqueOrganizations = Array.from(new Map(merged.map((row) => [row.id, row])).values())

  return uniqueOrganizations.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug ?? null,
  }))
}
