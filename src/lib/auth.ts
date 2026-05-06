import {
  ONBOARDING_CREATE_WORKSPACE_PATH,
  ONBOARDING_PATH,
  sanitizeNextPath,
  WORKSPACE_SELECT_PATH,
} from "@/lib/app-entry"

export const SIGN_OUT_REDIRECT_PATH = "/auth"

export function buildWorkspaceSelectHref(nextPath: string | null | undefined) {
  const safeNextPath = sanitizeNextPath(nextPath, "/dashboard")
  return `${WORKSPACE_SELECT_PATH}?next=${encodeURIComponent(safeNextPath)}`
}

export function buildWorkspaceSetupHref(nextPath: string | null | undefined) {
  const safeNextPath = sanitizeNextPath(nextPath, "/dashboard")
  return `${ONBOARDING_PATH}?next=${encodeURIComponent(safeNextPath)}`
}

export function buildCreateWorkspaceHref(nextPath: string | null | undefined) {
  const safeNextPath = sanitizeNextPath(nextPath, "/dashboard")
  return `${ONBOARDING_CREATE_WORKSPACE_PATH}?next=${encodeURIComponent(safeNextPath)}`
}

export function redirectBrowserAfterSignOut(redirectTo = SIGN_OUT_REDIRECT_PATH) {
  if (typeof window === "undefined") return

  const safeRedirect = sanitizeNextPath(redirectTo, SIGN_OUT_REDIRECT_PATH)
  window.location.replace(safeRedirect)
}
