export type AquasmartRole =
  | "admin"
  | "farm_manager"
  | "system_operator"
  | "data_analyst"
  | "viewer"
  | null

export const AQUASMART_ROLES = [
  "admin",
  "farm_manager",
  "system_operator",
  "data_analyst",
  "viewer",
] as const

export type CanonicalAquasmartRole = (typeof AQUASMART_ROLES)[number]

export const AQUASMART_ROLE_OPTIONS: Array<{ value: CanonicalAquasmartRole; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "farm_manager", label: "Farm Manager" },
  { value: "system_operator", label: "System Operator" },
  { value: "data_analyst", label: "Data Analyst" },
  { value: "viewer", label: "Viewer" },
]

export const DASHBOARD_ROOT = "/dashboard"
export const DATA_ENTRY_PATH = "/data-entry"
export const ONBOARDING_PATH = "/onboarding"
export const ONBOARDING_CREATE_WORKSPACE_PATH = "/onboarding/create-workspace"
export const WORKSPACE_SELECT_PATH = "/onboarding/select-workspace"

const STANDALONE_FEATURE_PREFIXES = [
  "/feed",
  "/production",
  "/reports",
  "/settings",
  "/actions",
  "/users",
  "/systems",
  "/batches",
] as const

function matchesStandaloneFeaturePath(pathname: string) {
  return STANDALONE_FEATURE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function toDashboardPath(path: string) {
  if (!path || path === "/") return DASHBOARD_ROOT
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  if (normalizedPath === DATA_ENTRY_PATH || normalizedPath.startsWith(`${DATA_ENTRY_PATH}/`)) return normalizedPath
  if (matchesStandaloneFeaturePath(normalizedPath)) return normalizedPath
  if (
    normalizedPath === `${DASHBOARD_ROOT}${DATA_ENTRY_PATH}` ||
    normalizedPath.startsWith(`${DASHBOARD_ROOT}${DATA_ENTRY_PATH}/`)
  ) {
    return normalizedPath.slice(DASHBOARD_ROOT.length)
  }
  if (normalizedPath.startsWith(DASHBOARD_ROOT)) return normalizedPath
  return `${DASHBOARD_ROOT}${normalizedPath}`
}

export function stripDashboardPath(pathname: string) {
  if (pathname === DASHBOARD_ROOT) return "/"
  if (pathname.startsWith(`${DASHBOARD_ROOT}/`)) {
    return pathname.slice(DASHBOARD_ROOT.length)
  }
  return pathname
}

export function normalizeRole(role: string | null | undefined): AquasmartRole {
  if (!role) return null
  if (
    role === "admin" ||
    role === "farm_manager" ||
    role === "system_operator" ||
    role === "data_analyst" ||
    role === "viewer"
  ) {
    return role
  }
  // Temporary compatibility for pre-normalization metadata or stale session payloads.
  if (role === "farm_technician" || role === "inventory_storekeeper") return "system_operator"
  if (role === "analyst_planner") return "data_analyst"
  if (role === "viewer_auditor") return "viewer"
  return null
}

export function formatRoleLabel(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role)
  return AQUASMART_ROLE_OPTIONS.find((option) => option.value === normalizedRole)?.label ?? role ?? "-"
}

export function resolveAppEntryPath(role: AquasmartRole) {
  if (role === "admin" || role === "farm_manager") return DASHBOARD_ROOT
  if (role === "system_operator") return `${DATA_ENTRY_PATH}?type=feeding`
  if (role === "data_analyst") return toDashboardPath("/production")
  if (role === "viewer") return toDashboardPath("/reports")
  return DASHBOARD_ROOT
}

export function sanitizeNextPath(nextPath: string | null | undefined, fallback = DASHBOARD_ROOT) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return fallback
  }

  try {
    const url = new URL(nextPath, "http://localhost")
    const params = new URLSearchParams(url.search)
    params.delete("farmId")

    const query = params.toString()
    return `${url.pathname}${query ? `?${query}` : ""}${url.hash}`
  } catch {
    return fallback
  }
}

export function canAccessDataEntry(role: AquasmartRole) {
  return (
    role === "admin" ||
    role === "farm_manager" ||
    role === "system_operator"
  )
}

const CONTEXT_CARRY_KEYS = ["farmId", "system", "cage", "date", "batch", "stage"] as const

/**
 * Appends the current farm/system/cage/date/batch/stage query params (when
 * present and not already set on `href`) onto a navigation target. Without
 * this, jumping to another section -- or into quick data entry -- drops the
 * user's working context and falls back to defaults (e.g. the lowest
 * system ID) instead of the cage they were just looking at.
 */
export function withCurrentSearchContext(href: string, searchParams: Pick<URLSearchParams, "get">) {
  const [basePath, query = ""] = href.split("?", 2)
  const nextParams = new URLSearchParams(query)
  for (const key of CONTEXT_CARRY_KEYS) {
    const value = searchParams.get(key)
    if (value != null && !nextParams.has(key)) nextParams.set(key, value)
  }
  const nextQuery = nextParams.toString()
  return nextQuery ? `${basePath}?${nextQuery}` : basePath
}

export function isAuthRoute(pathname: string) {
  return (
    pathname === "/forgot-password" ||
    pathname.startsWith("/forgot-password/") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/")
  )
}

export function isOnboardingRoute(pathname: string) {
  return (
    pathname === ONBOARDING_PATH ||
    pathname.startsWith(`${ONBOARDING_PATH}/`)
  )
}

export function isWorkspaceSelectionRoute(pathname: string) {
  return (
    pathname === WORKSPACE_SELECT_PATH ||
    pathname.startsWith(`${WORKSPACE_SELECT_PATH}/`)
  )
}

export function isPublicRoute(pathname: string) {
  return pathname === "/" || isAuthRoute(pathname)
}

export function mapDashboardPathToStandalone(pathname: string) {
  if (pathname === `${DASHBOARD_ROOT}${DATA_ENTRY_PATH}` || pathname.startsWith(`${DASHBOARD_ROOT}${DATA_ENTRY_PATH}/`)) {
    return pathname.slice(DASHBOARD_ROOT.length)
  }

  const matchedPrefix = STANDALONE_FEATURE_PREFIXES.find(
    (prefix) => pathname === `${DASHBOARD_ROOT}${prefix}` || pathname.startsWith(`${DASHBOARD_ROOT}${prefix}/`),
  )

  if (!matchedPrefix) return null
  return pathname.slice(DASHBOARD_ROOT.length)
}
