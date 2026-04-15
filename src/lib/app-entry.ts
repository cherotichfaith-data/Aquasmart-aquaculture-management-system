export type AquaSmartRole =
  | "admin"
  | "farm_manager"
  | "farm_technician"
  | "inventory_storekeeper"
  | "analyst_planner"
  | "viewer_auditor"
  | null

export function resolveAppEntryPath(role: AquaSmartRole) {
  if (role === "admin" || role === "farm_manager") return "/"
  if (role === "farm_technician") return "/data-entry?type=feeding"
  if (role === "analyst_planner") return "/production"
  if (role === "inventory_storekeeper") return "/data-entry?type=incoming_feed"
  if (role === "viewer_auditor") return "/"
  return "/"
}

export function canAccessDataEntry(role: AquaSmartRole) {
  return (
    role === "admin" ||
    role === "farm_manager" ||
    role === "farm_technician" ||
    role === "inventory_storekeeper"
  )
}

export function isAuthRoute(pathname: string) {
  return pathname === "/auth" || pathname.startsWith("/auth/")
}

export function isOnboardingRoute(pathname: string) {
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/")
}

export function isPublicRoute(pathname: string) {
  return pathname === "/" || isAuthRoute(pathname)
}
