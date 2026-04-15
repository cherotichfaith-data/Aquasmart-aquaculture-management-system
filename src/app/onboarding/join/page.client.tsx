"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, MailCheck, Building2, ArrowLeft } from "lucide-react"
import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { createClient } from "@/lib/supabase/client"

export default function JoinFarmPageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const invitedFarm = searchParams.get("farm")
  const invitedRole = searchParams.get("role")
  const inviteToken = searchParams.get("token")

  const [isClaiming, setIsClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claimSuccess, setClaimSuccess] = useState(false)

  const formatRole = (r: string | null) => {
    if (!r) return "Team Member"
    return r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const handleClaim = async () => {
    setClaimError(null)
    setIsClaiming(true)
    try {
      const { error } = await supabase.rpc("claim_my_farm_user_invitations")
      if (error) throw error
      setClaimSuccess(true)
      // Full reload clears React Query cache so FarmOnboardingGate
      // re-fetches farm membership and routes correctly
      setTimeout(() => { window.location.assign("/") }, 1500)
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Failed to accept invitation. Try again.")
    } finally {
      setIsClaiming(false)
    }
  }

  // Invitation found via URL params
  if (invitedFarm || inviteToken) {
    return (
      <OnboardingShell
        title="You've been invited"
        description="Review the details below and accept to join your farm."
      >
        <div className="mx-auto max-w-md">
          <div className="rounded-[1.75rem] border border-border/70 bg-card/95 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>

            <div className="mt-5 space-y-3">
              {invitedFarm && (
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <span className="text-sm text-muted-foreground">Farm</span>
                  <span className="text-sm font-semibold text-foreground">{invitedFarm}</span>
                </div>
              )}
              {invitedRole && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <span className="text-sm font-semibold text-foreground">{formatRole(invitedRole)}</span>
                </div>
              )}
            </div>

            {invitedRole && (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {invitedRole === "farm_technician"
                  ? "You can record daily operational data for the assigned systems."
                  : invitedRole === "farm_manager"
                    ? "You can manage farm operations, view reports, and configure systems."
                    : invitedRole === "analyst_planner"
                      ? "You have read-only access to production analytics and reports."
                      : "You have been assigned access to this farm workspace."}
              </p>
            )}

            {claimError && (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                {claimError}
              </div>
            )}

            {claimSuccess ? (
              <div className="mt-6 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
                Invitation accepted! Redirecting to your dashboard…
              </div>
            ) : (
              <div className="mt-8 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => void handleClaim()}
                  disabled={isClaiming}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-70"
                >
                  {isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isClaiming ? "Accepting…" : "Accept Invitation"}
                </button>
                <Link
                  href="/onboarding"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-border/70 px-5 py-3 text-sm font-medium text-muted-foreground transition hover:bg-accent"
                >
                  Cancel
                </Link>
              </div>
            )}
          </div>
        </div>
      </OnboardingShell>
    )
  }

  // No invite params — show instructions
  return (
    <OnboardingShell
      title="Join a farm workspace"
      description="Join an existing AquaSmart farm using an invitation link from your farm admin."
    >
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[1.75rem] border border-border/70 bg-card/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.10)] sm:p-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MailCheck className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
            Waiting for an invite?
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Your farm admin needs to send you an invitation from AquaSmart Settings → Users. Open the invite link on this device and you will be brought back here to confirm.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm leading-6 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">1</span>
              Ask your farm admin to invite you from Settings → Users.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">2</span>
              Use the same email address your admin used for the invitation.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">3</span>
              Click the invite link in your email and sign in if prompted.
            </li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>
            <Link
              href="/onboarding/create"
              className="inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Create a farm instead
            </Link>
          </div>
        </section>

        <aside className="flex flex-col gap-4 rounded-[1.75rem] border border-border/70 bg-card/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.10)] sm:p-8">
          <h3 className="text-base font-semibold text-foreground">Already have an invite?</h3>
          <p className="text-sm leading-6 text-muted-foreground">
            If you clicked your invite link and were redirected here, click below to claim your access.
          </p>
          {claimError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              {claimError}
            </div>
          )}
          <button
            type="button"
            onClick={() => void handleClaim()}
            disabled={isClaiming}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-primary/60 bg-primary/8 px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/15 disabled:opacity-70"
          >
            {isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Claim my invitation
          </button>
        </aside>
      </div>
    </OnboardingShell>
  )
}
