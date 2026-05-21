"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { Building2, CheckCircle2, UserRound } from "lucide-react"
import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { useAuth } from "@/components/providers/auth-provider"
import { completeOnboardingProfileAction } from "@/features/onboarding/mutations.server"
import type { OnboardingPageInitialData } from "@/features/onboarding/queries.server"
import {
  AQUASMART_ROLE_OPTIONS,
  ONBOARDING_CREATE_WORKSPACE_PATH,
  normalizeRole,
  resolveAppEntryPath,
  sanitizeNextPath,
  type AquaSmartRole,
} from "@/lib/app-entry"
import { queryKeys } from "@/lib/cache/query-keys"

const inputCls =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"

type MembershipState = {
  farmId: string | null
  role: AquaSmartRole
  source: "active" | "invite" | "none"
}

export default function OnboardingPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { user, refreshProfile } = useAuth()
  const linkedFarmId =
    typeof searchParams.get("farmId") === "string" && (searchParams.get("farmId") ?? "").trim().length > 0
      ? searchParams.get("farmId")
      : null
  const onboardingState = queryClient.getQueryData<OnboardingPageInitialData>(
    queryKeys.onboarding.state(user?.id ?? null, linkedFarmId),
  )

  const [fullName, setFullName] = useState(() => onboardingState?.fullName ?? "")
  const [role, setRole] = useState<Exclude<AquaSmartRole, null>>(() => {
    const seededRole = normalizeRole(onboardingState?.membership.role)
    return seededRole && seededRole !== "admin" ? seededRole : "system_operator"
  })
  const [membership, setMembership] = useState<MembershipState>(() => ({
    farmId: onboardingState?.membership.farmId ?? linkedFarmId,
    role: normalizeRole(onboardingState?.membership.role),
    source: onboardingState?.membership.source ?? "none",
  }))
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)
  const assignedRole = membership.role
  const effectiveRole = (assignedRole ?? role) as Exclude<AquaSmartRole, null>
  const canChooseRole = !assignedRole
  const nextPath = sanitizeNextPath(searchParams.get("next"), resolveAppEntryPath(effectiveRole))
  const createWorkspaceHref = `${ONBOARDING_CREATE_WORKSPACE_PATH}?next=${encodeURIComponent(nextPath)}`

  useEffect(() => {
    if (!onboardingState) {
      return
    }

    setFullName((current) => current || onboardingState.fullName)
    setMembership({
      farmId: onboardingState.membership.farmId,
      role: normalizeRole(onboardingState.membership.role),
      source: onboardingState.membership.source,
    })

    const normalizedMembershipRole = normalizeRole(onboardingState.membership.role)
    if (normalizedMembershipRole && normalizedMembershipRole !== "admin") {
      setRole(normalizedMembershipRole)
    }
  }, [onboardingState])

  const displayEmail = user?.email?.trim() || onboardingState?.displayEmail || ""
  const effectiveNoticeMessage = noticeMessage ?? onboardingState?.notice ?? null

  const handleSubmit = async () => {
    const trimmedFullName = fullName.trim()
    if (trimmedFullName.length < 2) {
      setErrorMessage("Enter your full name to continue.")
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      const selectedRole = (assignedRole ?? role) as Exclude<AquaSmartRole, null>

      const result = await completeOnboardingProfileAction({
        fullName: trimmedFullName,
        role: selectedRole,
      })

      const currentUserId = user?.id ?? null
      const farmId = result?.farmId ?? membership.farmId ?? null

      await refreshProfile()

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("profile-updated"))
        window.dispatchEvent(new Event("farm-memberships-updated"))
        if (farmId && currentUserId) {
          window.localStorage.setItem(`aquasmart:${currentUserId}:activeFarmId`, farmId)
          window.dispatchEvent(new CustomEvent("farm-updated", { detail: { farmId } }))
        }
      }

      if (!result?.membershipAssigned || !farmId) {
        setNoticeMessage(
          result?.notice ?? "Profile saved. Create a workspace or ask your farm admin for an invite before continuing.",
        )
        setIsSaving(false)
        return
      }

      router.replace(resolveAppEntryPath(result.role))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to complete onboarding.")
      setIsSaving(false)
      return
    }

    setIsSaving(false)
  }

  return (
    <OnboardingShell
      title="Welcome to AquaSmart"
      description="Use onboarding as the single place to confirm your profile, accept assigned access, or create a new farm workspace."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[1.75rem] border border-border/70 bg-card/95 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Your account details</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{displayEmail || "Unknown user"}</span>
            </p>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {effectiveNoticeMessage ? (
            <div className="mt-5 rounded-xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
              {effectiveNoticeMessage}
            </div>
          ) : null}

          <div className="mt-8 space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Full name</span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter your full name"
                className={inputCls}
                autoComplete="name"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Role</span>
              <select
                value={effectiveRole}
                onChange={(event) => setRole(event.target.value as Exclude<AquaSmartRole, null>)}
                disabled={!canChooseRole}
                className={inputCls}
              >
                {assignedRole === "admin" ? <option value="admin">Admin</option> : null}
                {AQUASMART_ROLE_OPTIONS.filter((option) => option.value !== "admin").map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-70"
            >
              {isSaving ? "Saving profile..." : membership.source === "invite" ? "Accept role and continue" : "Continue"}
            </button>

            {membership.source === "none" ? (
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <p className="text-sm font-medium text-foreground">Need a farm workspace?</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Join an existing farm with an admin invite, or create a new workspace if you are setting one up for the first time.
                </p>
                <Link
                  href={createWorkspaceHref}
                  className="mt-4 inline-flex items-center justify-center rounded-xl border border-border/70 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
                >
                  Create new workspace
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[1.75rem] border border-border/70 bg-card/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.10)]">
            <h3 className="text-base font-semibold text-foreground">Your onboarding state</h3>
            <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 h-4 w-4 text-primary" />
                <span>Profile collection always starts here with your name and role.</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                <span>
                  {membership.source === "invite"
                    ? "Your role was assigned by invitation and will be applied when you continue."
                    : membership.source === "active"
                      ? "You already have farm access. This step just confirms your profile."
                      : "You do not have farm membership yet, so you can create a workspace or wait for an invite."}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 text-primary" />
                <span>Multi-farm users continue through workspace selection after onboarding when needed.</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </OnboardingShell>
  )
}
