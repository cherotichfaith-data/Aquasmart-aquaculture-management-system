"use client"

import { useEffect, useState } from "react"
import { Loader2, MailPlus, ShieldCheck, UserPlus, Users } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import {
  grantFarmAccessAction,
  listFarmMembersAction,
  listPendingFarmInvitesAction,
  removeFarmMemberAction,
  revokePendingFarmInviteAction,
  updateFarmMemberRoleAction,
} from "@/features/settings/mutations.server"
import type { PendingFarmInvitation, SettingsFarmMember } from "@/features/settings/users.server"
import { queryKeys } from "@/lib/cache/query-keys"
import {
  AQUASMART_ROLE_OPTIONS,
  formatRoleLabel,
  normalizeRole,
  resolveAppEntryPath,
  type AquaSmartRole,
} from "@/lib/app-entry"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useActiveFarmRole } from "@/lib/hooks/use-active-farm-role"

type GrantAccessRole = NonNullable<AquaSmartRole>

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border/70 px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-60"

const ROLE_HELP: Array<{ role: GrantAccessRole; description: string }> = [
  { role: "admin", description: "Full workspace control, including settings, users, and role management." },
  { role: "farm_manager", description: "Manages farm operations and records, but not user administration." },
  { role: "system_operator", description: "Captures day-to-day operational data such as feed, sampling, and water quality." },
  { role: "data_analyst", description: "Reviews production and reporting data without changing farm operations." },
  { role: "viewer", description: "Read-only access for oversight, audits, or leadership visibility." },
]

function formatInviteDate(value: string | null) {
  if (!value) return "Not sent yet"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Not sent yet"
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export default function UsersPageClient({
  initialFarmId,
  initialFarmName,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
}) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { farmId } = useActiveFarm({ initialFarmId, initialFarmName })
  const farmRoleQuery = useActiveFarmRole(farmId)
  const farmRole = (farmRoleQuery.data ?? null) as AquaSmartRole

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<GrantAccessRole>("system_operator")
  const [inviting, setInviting] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [pageSuccess, setPageSuccess] = useState<string | null>(null)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<GrantAccessRole>("viewer")
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null)

  const canManage = farmRole === "admin"

  useEffect(() => {
    if (farmRole && !canManage) {
      router.replace(resolveAppEntryPath(farmRole))
    }
  }, [canManage, farmRole, router])

  const membersQuery = useQuery({
    queryKey: queryKeys.settings.members(farmId),
    enabled: Boolean(farmId),
    staleTime: 60_000,
    queryFn: async (): Promise<SettingsFarmMember[]> => {
      if (!farmId) return []
      return listFarmMembersAction({ farmId })
    },
  })

  const pendingInvitesQuery = useQuery({
    queryKey: queryKeys.settings.pendingInvites(farmId),
    enabled: Boolean(farmId),
    staleTime: 60_000,
    queryFn: async (): Promise<PendingFarmInvitation[]> => {
      if (!farmId) return []
      return listPendingFarmInvitesAction({ farmId })
    },
  })

  const members = membersQuery.data ?? []
  const pendingInvites = pendingInvitesQuery.data ?? []
  const loadingMembers = membersQuery.isLoading
  const loadingInvites = pendingInvitesQuery.isLoading

  const setMembers = (nextMembers: SettingsFarmMember[]) => {
    queryClient.setQueryData(queryKeys.settings.members(farmId), nextMembers)
  }

  const setPendingInvites = (nextInvites: PendingFarmInvitation[]) => {
    queryClient.setQueryData(queryKeys.settings.pendingInvites(farmId), nextInvites)
  }

  const showSuccess = (message: string) => {
    setPageSuccess(message)
    window.setTimeout(() => setPageSuccess(null), 5000)
  }

  const handleGrantAccess = async () => {
    if (!inviteEmail.trim() || !farmId) return

    setPageError(null)
    setPageSuccess(null)
    setInviting(true)

    try {
      const result = await grantFarmAccessAction({ farmId, email: inviteEmail.trim(), role: inviteRole })

      const nextPendingInvites = await listPendingFarmInvitesAction({ farmId })
      setPendingInvites(nextPendingInvites)
      showSuccess(
        result.delivery === "sent"
          ? "Invitation email sent. The teammate should open that email and set their password from the invite link."
          : result.delivery === "existing_account"
            ? "Setup email sent. The teammate should open that email and create their password."
            : "Invitation saved, but Supabase could not send the email. Ask the teammate to sign in if they already started account setup, or retry later.",
      )

      setInviteEmail("")
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to invite the team member.")
    } finally {
      setInviting(false)
    }
  }

  const handleStartEdit = (member: SettingsFarmMember) => {
    setEditingUserId(member.user_id)
    setEditingRole((normalizeRole(member.role) ?? "viewer") as GrantAccessRole)
  }

  const handleSaveEdit = async (member: SettingsFarmMember) => {
    if (!farmId) return

    setPageError(null)
    setPageSuccess(null)
    setSavingUserId(member.user_id)

    try {
      const nextMembers = await updateFarmMemberRoleAction({
        farmId,
        userId: member.user_id,
        role: editingRole,
      })
      setMembers(nextMembers)
      window.dispatchEvent(new Event("profile-updated"))
      window.dispatchEvent(new Event("farm-memberships-updated"))
      setEditingUserId(null)
      showSuccess("Member role updated.")
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to update the member role.")
    } finally {
      setSavingUserId(null)
    }
  }

  const handleRemove = async (member: SettingsFarmMember) => {
    if (!farmId) return

    const subject = member.email ?? member.full_name ?? "this member"
    if (!window.confirm(`Remove ${subject} from this farm workspace?`)) return

    setPageError(null)
    setPageSuccess(null)
    setRemovingUserId(member.user_id)

    try {
      const nextMembers = await removeFarmMemberAction({
        farmId,
        userId: member.user_id,
      })
      setMembers(nextMembers)
      window.dispatchEvent(new Event("profile-updated"))
      window.dispatchEvent(new Event("farm-memberships-updated"))
      showSuccess("Member removed.")
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to remove the member.")
    } finally {
      setRemovingUserId(null)
    }
  }

  const handleRevokeInvite = async (invite: PendingFarmInvitation) => {
    if (!farmId) return
    if (!window.confirm(`Cancel the pending invite for ${invite.email}?`)) return

    setPageError(null)
    setPageSuccess(null)
    setRevokingInviteId(invite.id)

    try {
      const nextInvites = await revokePendingFarmInviteAction({
        farmId,
        invitationId: invite.id,
      })
      setPendingInvites(nextInvites)
      showSuccess("Pending invite removed.")
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to revoke the pending invite.")
    } finally {
      setRevokingInviteId(null)
    }
  }

  if (farmRole && !canManage) return null

  return (
    <DashboardLayout initialFarmId={initialFarmId} initialFarmName={initialFarmName} showHeaderToolbar={false}>
      <div className="mx-auto max-w-6xl space-y-8 px-1 py-6">
        <div className="rounded-4xl border border-border/70 bg-card px-6 py-6 shadow-sm sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Users className="h-3.5 w-3.5" />
                Users
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">Team management</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Invite teammates, adjust roles, and keep farm access in one canonical workspace.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-80">
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                <p className="text-muted-foreground">Current members</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{members.length}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                <p className="text-muted-foreground">Pending invites</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{pendingInvites.length}</p>
              </div>
            </div>
          </div>
        </div>

        {pageError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {pageError}
          </div>
        ) : null}

        {pageSuccess ? (
          <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
            {pageSuccess}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Invite a Team Member</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Invite by email and assign the right role up front. New users must open the invite email; existing users should sign in with the invited email.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-foreground/80">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="colleague@example.com"
                  className={inputCls}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void handleGrantAccess()
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-foreground/80">Role</label>
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as GrantAccessRole)}
                  className={inputCls}
                  title={ROLE_HELP.find((item) => item.role === inviteRole)?.description}
                >
                  {AQUASMART_ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => void handleGrantAccess()}
                disabled={inviting || !inviteEmail.trim()}
                className={`${btnPrimary} min-w-44`}
              >
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}
                Send invite
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Role descriptions</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Use these definitions to keep permissions predictable across the team.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {ROLE_HELP.map((item) => (
                <div key={item.role} className="rounded-2xl border border-border/60 bg-background px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{formatRoleLabel(item.role)}</p>
                    <span
                      className="text-xs font-medium text-muted-foreground"
                      title={item.description}
                    >
                      Details
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Current Members</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Active workspace members with access to this farm.
              </p>
            </div>
          </div>

          {loadingMembers ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/70 px-6 py-8 text-sm text-muted-foreground">
              No members found yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border/70">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20 text-left text-xs font-semibold uppercase tracking-wide text-foreground/70">
                    <th className="px-6 py-4">User</th>
                    <th className="hidden px-6 py-4 md:table-cell">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.user_id} className="border-b border-border/40 last:border-0">
                      <td className="px-6 py-5">
                        <p className="font-medium text-foreground">{member.full_name ?? "Unnamed user"}</p>
                        <p className="mt-0.5 text-xs text-foreground/70 md:hidden">{member.email ?? "No email found"}</p>
                      </td>
                      <td className="hidden px-6 py-5 text-foreground/80 md:table-cell">{member.email ?? "No email found"}</td>
                      <td className="px-6 py-5">
                        {editingUserId === member.user_id ? (
                          <select
                            value={editingRole}
                            onChange={(event) => setEditingRole(event.target.value as GrantAccessRole)}
                            className={inputCls}
                          >
                            {AQUASMART_ROLE_OPTIONS.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-foreground" title={ROLE_HELP.find((item) => item.role === normalizeRole(member.role))?.description}>
                            {formatRoleLabel(member.role)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap items-center gap-3">
                          {editingUserId === member.user_id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleSaveEdit(member)}
                                disabled={savingUserId === member.user_id}
                                className={btnPrimary}
                              >
                                {savingUserId === member.user_id ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingUserId(null)}
                                disabled={savingUserId === member.user_id}
                                className={btnGhost}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button type="button" onClick={() => handleStartEdit(member)} className={btnGhost}>
                              Edit role
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleRemove(member)}
                            disabled={removingUserId === member.user_id}
                            className="inline-flex items-center justify-center rounded-xl border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
                          >
                            {removingUserId === member.user_id ? "Removing..." : "Remove"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Pending Invites</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Invitations waiting for a teammate to open the invite link or sign in with the invited email.
            </p>
          </div>

          {loadingInvites ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : pendingInvites.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/70 px-6 py-8 text-sm text-muted-foreground">
              No pending invites.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background px-5 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{invite.email}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>Role: {formatRoleLabel(invite.role)}</span>
                      <span>Created: {formatInviteDate(invite.created_at)}</span>
                      <span>Last sent: {formatInviteDate(invite.last_sent_at)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRevokeInvite(invite)}
                    disabled={revokingInviteId === invite.id}
                    className="inline-flex items-center justify-center rounded-xl border border-border/70 px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-60"
                  >
                    {revokingInviteId === invite.id ? "Revoking..." : "Revoke invite"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}
