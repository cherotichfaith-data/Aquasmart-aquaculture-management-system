"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { useAuth } from "@/components/auth-provider"
import { useActiveFarm } from "@/hooks/use-active-farm"

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, isLoading } = useAuth()
  const { farm, loading: farmLoading } = useActiveFarm()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth")
    }
  }, [isLoading, router, user])

  const loading = isLoading || farmLoading

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading profile...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground mt-1">View your account details</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Profile Details</h2>
              <p className="text-sm text-muted-foreground">This page is read-only.</p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Edit in Settings
            </button>
          </div>

          <div className="border-t border-border/60 pt-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Account</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Full name</label>
                <input
                  type="text"
                  value={profile?.owner ?? ""}
                  readOnly
                  className="w-full px-3 py-2 border border-input rounded-md bg-muted/40 text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email ?? profile?.email ?? ""}
                  readOnly
                  className="w-full px-3 py-2 border border-input rounded-md bg-muted/40 text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <input
                  type="text"
                  value={profile?.role ?? ""}
                  readOnly
                  className="w-full px-3 py-2 border border-input rounded-md bg-muted/40 text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <input
                  type="tel"
                  value={profile?.phone ?? ""}
                  readOnly
                  className="w-full px-3 py-2 border border-input rounded-md bg-muted/40 text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Farm</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Farm name</label>
                <input
                  type="text"
                  value={farm?.name ?? profile?.farm_name ?? ""}
                  readOnly
                  className="w-full px-3 py-2 border border-input rounded-md bg-muted/40 text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  value={farm?.location ?? profile?.location ?? ""}
                  readOnly
                  className="w-full px-3 py-2 border border-input rounded-md bg-muted/40 text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Owner</label>
                <input
                  type="text"
                  value={farm?.owner ?? profile?.owner ?? ""}
                  readOnly
                  className="w-full px-3 py-2 border border-input rounded-md bg-muted/40 text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Farm email</label>
                <input
                  type="email"
                  value={farm?.email ?? profile?.email ?? ""}
                  readOnly
                  className="w-full px-3 py-2 border border-input rounded-md bg-muted/40 text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Farm phone</label>
                <input
                  type="tel"
                  value={farm?.phone ?? profile?.phone ?? ""}
                  readOnly
                  className="w-full px-3 py-2 border border-input rounded-md bg-muted/40 text-muted-foreground"
                />
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
