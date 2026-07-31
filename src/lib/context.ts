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
