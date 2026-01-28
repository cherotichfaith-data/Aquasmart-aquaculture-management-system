"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "farm_manager", label: "Farm Manager" },
  { value: "system_operator", label: "System Operator" },
  { value: "data_analyst", label: "Data Analyst" },
  { value: "viewer", label: "Viewer" },
]

export default function OnboardingScreen() {
  const router = useRouter()
  const supabase = createClient()
  const { user, isLoading } = useAuth()
  const [fullName, setFullName] = useState("")
  const [farmName, setFarmName] = useState("")
  const [location, setLocation] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState("farm_manager")
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth")
    }
  }, [isLoading, router, user])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return
    if (!user.email) {
      setStatus("We could not read your email from the session. Please sign in again.")
      return
    }

    if (!fullName.trim() || !farmName.trim()) {
      setStatus("Please provide your full name and farm name to continue.")
      return
    }

    setSaving(true)
    setStatus(null)
    try {
      const payload = {
        id: user.id,
        email: user.email,
        role,
        owner: fullName.trim(),
        farm_name: farmName.trim(),
        location: location.trim() || null,
        phone: phone.trim() || null,
      }

      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" })
      if (error) {
        setStatus(error.message || "Could not save your profile. Please try again.")
        return
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("profile-updated"))
      }

      router.replace("/")
    } catch (err: any) {
      setStatus(err?.message ?? "Unexpected error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Complete your AquaSmart profile</CardTitle>
          <CardDescription>
            Add your farm details so we can personalize your dashboard and alerts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="fullName">
                  Full name
                </label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="farmName">
                  Farm name
                </label>
                <Input
                  id="farmName"
                  value={farmName}
                  onChange={(event) => setFarmName(event.target.value)}
                  placeholder="Blue Reef Farms"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  Email
                </label>
                <Input id="email" value={user?.email ?? ""} readOnly />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="location">
                  Location
                </label>
                <Input
                  id="location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Lagos, Nigeria"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="phone">
                  Phone
                </label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+234 800 000 0000"
                />
              </div>
            </div>

            {status && <p className="text-sm text-destructive">{status}</p>}

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Continue to dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
