"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, UserPlus, X, RefreshCw, Mail } from "lucide-react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { createClient } from "@/lib/supabase/client"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useActiveFarmRole } from "@/lib/hooks/use-active-farm-role"
import { resolveAppEntryPath } from "@/lib/app-entry"
import { useRouter } from "next/navigation"
import type { AquaSmartRole } from "@/lib/app-entry"

type Invitation = {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  accepted_at: string | null
  revoked_at: string | null
}

type FarmMember = {
  user_id: string
  role: string
  created_at: string
  email?: string | null
  full_name?: string | null
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  farm_manager: "Farm Manager",
  farm_technician: "Farm Technician",
  inventory_storekeeper: "Inventory Storekeeper",
  analyst_planner: "Analyst / Planner",
  viewer_auditor: "Viewer / Auditor",
}

const inputCls = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
const btnPrimary = "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
const btnGhost = "inline-flex items-center gap-2 rounded-xl border border-border/70 px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-60"

export default function UsersPageClient() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const { farmId } = useActiveFarm()
  const farmRoleQuery = useActiveFarmRole(farmId)
  const farmRole = (farmRoleQuery.data ?? null) as AquaSmartRole

  const [members, setMembers] = useState<FarmMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("farm_technician")
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const canManage = farmRole === "admin" || farmRole === "farm_manager"

  // Gate: only admin/manager can access
  useEffect(() => {
    if (farmRole && !canManage) {
      router.replace(resolveAppEntryPath(farmRole))
    }
  }, [farmRole, canManage, router])

  const loadData = async () => {
    if (!farmId) return
    setLoading(true)
    try {
      // Load current members
      const { data: membersData } = await supabase
        .from("farm_user")
        .select("user_id, role, created_at")
        .eq("farm_id", farmId)
        .order("created_at")

      // Load profiles for display names
      const userIds = (membersData ?? []).map(m => m.user_id)
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("user_profile").select("user_id, full_name").in("user_id", userIds)
        : { data: [] }

      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p.full_name]))

      setMembers((membersData ?? []).map(m => ({
        user_id: m.user_id,
        role: m.role,
        created_at: m.created_at ?? new Date().toISOString(),
        full_name: profileMap[m.user_id] ?? null,
      })))

      // Load invitations
      const { data: invData } = await supabase.rpc("api_farm_user_invitations", { p_farm_id: farmId })
      setInvitations((invData ?? []) as Invitation[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [farmId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !farmId) return
    setInviteError(null)
    setInviting(true)
    try {
      const res = await fetch("/api/settings/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId, email: inviteEmail.trim(), role: inviteRole }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to send invitation.")
      setInviteEmail("")
      setInviteSuccess(true)
      setTimeout(() => setInviteSuccess(false), 3000)
      loadData()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Invitation failed.")
    } finally {
      setInviting(false)
    }
  }

  const handleRevoke = async (invitationId: string) => {
    setRevoking(invitationId)
    try {
      await supabase.rpc("revoke_farm_user_invitation", { p_invitation_id: invitationId })
      loadData()
    } finally {
      setRevoking(null)
    }
  }

  const pendingInvitations = invitations.filter(i => !i.accepted_at && !i.revoked_at)
  const acceptedInvitations = invitations.filter(i => i.accepted_at)

  if (farmRole && !canManage) return null

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-8 px-1 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage who has access to this farm workspace.</p>
        </div>

        {/* Invite new user */}
        <div className="rounded-[1.5rem] border border-border/70 bg-card/95 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Invite a team member</h2>
          </div>

          {inviteError && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">{inviteError}</div>
          )}
          {inviteSuccess && (
            <div className="mb-4 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">Invitation sent successfully.</div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className={inputCls}
                onKeyDown={e => e.key === "Enter" && handleInvite()}
              />
            </div>
            <div className="w-full sm:w-52 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className={inputCls}>
                {Object.entries(ROLE_LABELS).filter(([k]) => k !== "admin").map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className={btnPrimary}>
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send invite
            </button>
          </div>
        </div>

        {/* Current members */}
        <div className="rounded-[1.5rem] border border-border/70 bg-card/95 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
            <h2 className="text-base font-semibold">Current members</h2>
            <button onClick={loadData} className={btnGhost} title="Refresh">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">No members found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3">Name / Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.user_id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-foreground">{m.full_name ?? "—"}</p>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pending invitations */}
        {pendingInvitations.length > 0 && (
          <div className="rounded-[1.5rem] border border-border/70 bg-card/95 shadow-sm overflow-hidden">
            <div className="border-b border-border/60 px-6 py-4">
              <h2 className="text-base font-semibold">Pending invitations</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">These users have been invited but haven't accepted yet.</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Invited</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {pendingInvitations.map(inv => (
                  <tr key={inv.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3.5 text-muted-foreground">{inv.email}</td>
                    <td className="px-6 py-3.5">
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                        {ROLE_LABELS[inv.role] ?? inv.role}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-muted-foreground text-xs">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        disabled={revoking === inv.id}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                        title="Revoke invitation"
                      >
                        {revoking === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
