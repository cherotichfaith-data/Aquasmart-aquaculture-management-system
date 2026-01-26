"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Save, AlertCircle, Check } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { createClient } from "@/utils/supabase/client"

export default function SettingsPage() {
  const formatError = (err: unknown) => {
    if (!err) return "Unknown error"
    if (typeof err === "string") return err
    if (err instanceof Error) return err.message
    const maybe = err as { message?: string; details?: string; hint?: string }
    if (maybe.message) {
      const details = maybe.details ? ` (${maybe.details})` : ""
      const hint = maybe.hint ? ` Hint: ${maybe.hint}` : ""
      return `${maybe.message}${details}${hint}`
    }
    try {
      return JSON.stringify(err)
    } catch {
      return String(err)
    }
  }
  const [settings, setSettings] = useState({
    farmName: "AquaSmart Farm 1",
    location: "Lake Zone - Kimbwela",
    owner: "John Doe",
    email: "john@aquafarm.com",
    phone: "+255 123 456 789",
    lowDoThreshold: 4.0,
    highAmmoniaThreshold: 0.05,
    highMortalityThreshold: 2.0,
    dataBackupFrequency: "daily",
    theme: "light",
  })

  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false)
  const [thresholdId, setThresholdId] = useState<string | null>(null)
  const { user, profile } = useAuth()
  const { farm, farmId, loading: farmLoading } = useActiveFarm()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) return
      if (farmLoading) return
      if (hasLoadedSettings) return

      setLoading(true)
      try {
        const farmRow = farm ?? null

        let thresholdRow: any = null
        if (farmId) {
          const { data } = await supabase
            .from("alert_threshold")
            .select("*")
            .eq("scope", "farm")
            .eq("farm_id", farmId)
            .maybeSingle()
          thresholdRow = data ?? null
        }

        const { data: userProfileRow } = await supabase
          .from("user_profile")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()

        setThresholdId(thresholdRow?.id ?? null)

        setSettings((prev) => ({
          ...prev,
          farmName: farmRow?.name ?? profile?.farm_name ?? prev.farmName,
          location: farmRow?.location ?? profile?.location ?? prev.location,
          owner: farmRow?.owner ?? profile?.owner ?? prev.owner,
          email: farmRow?.email ?? profile?.email ?? prev.email,
          phone: farmRow?.phone ?? profile?.phone ?? prev.phone,
          lowDoThreshold: thresholdRow?.low_do_threshold ?? prev.lowDoThreshold,
          highAmmoniaThreshold: thresholdRow?.high_ammonia_threshold ?? prev.highAmmoniaThreshold,
          highMortalityThreshold: thresholdRow?.high_mortality_threshold ?? prev.highMortalityThreshold,
          theme: userProfileRow?.theme ?? prev.theme,
        }))
        setHasLoadedSettings(true)
      } catch (err) {
        console.error("[settings] Error loading settings:", err)
      } finally {
        setLoading(false)
      }
    }

    void loadSettings()
  }, [farm, farmId, farmLoading, hasLoadedSettings, profile, supabase, user?.id])

  useEffect(() => {
    if (user?.id) return
    const savedSettings = localStorage.getItem("aqua_settings")
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (err) {
        console.error("[v0] Error loading settings:", err)
      }
    }
    setLoading(false)
  }, [user?.id])

  const handleChange = (field: string, value: string | number) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    const save = async () => {
      setIsSaving(true)
      setErrorMsg(null)
      try {
        if (user?.id) {
          let resolvedFarmId = farmId
          if (!resolvedFarmId) {
            const { data: newFarm, error: farmCreateError } = await supabase
              .from("farm")
              .insert({
                name: settings.farmName,
                location: settings.location,
                owner: settings.owner,
                email: settings.email,
                phone: settings.phone,
              })
              .select("id")
              .single()

            if (farmCreateError) {
              throw farmCreateError
            }

            resolvedFarmId = newFarm?.id ?? null
            if (resolvedFarmId) {
              const role = profile?.role ?? "admin"
              const { error: membershipError } = await supabase
                .from("farm_user")
                .insert({ farm_id: resolvedFarmId, user_id: user.id, role })
              if (membershipError) {
                throw membershipError
              }
            }
          }

          if (!resolvedFarmId) {
            setErrorMsg("No farm selected for this account.")
            setIsSaving(false)
            return
          }

          const farmPayload = {
            name: settings.farmName,
            location: settings.location,
            owner: settings.owner,
            email: settings.email,
            phone: settings.phone,
          }

          const { error: farmError } = await supabase
            .from("farm")
            .update(farmPayload)
            .eq("id", resolvedFarmId)

          if (farmError) {
            throw farmError
          }

          const thresholdPayload = {
            scope: "farm",
            farm_id: resolvedFarmId,
            low_do_threshold: settings.lowDoThreshold,
            high_ammonia_threshold: settings.highAmmoniaThreshold,
            high_mortality_threshold: settings.highMortalityThreshold,
          }

          if (thresholdId) {
            const { error: thresholdError } = await supabase
              .from("alert_threshold")
              .update(thresholdPayload)
              .eq("id", thresholdId)
            if (thresholdError) throw thresholdError
          } else {
            const { data: insertedThreshold, error: thresholdError } = await supabase
              .from("alert_threshold")
              .insert(thresholdPayload)
              .select("id")
              .single()
            if (thresholdError) throw thresholdError
            setThresholdId(insertedThreshold?.id ?? null)
          }

          const userProfilePayload = {
            user_id: user.id,
            theme: settings.theme,
          }

          const { error: profileError } = await supabase
            .from("user_profile")
            .upsert(userProfilePayload)

          if (profileError) {
            throw profileError
          }

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("farm-updated", { detail: { farmId: resolvedFarmId } }))
          }

          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
          router.replace("/")
          if (typeof window !== "undefined") {
            window.location.href = "/"
          }
        } else {
          localStorage.setItem("aqua_settings", JSON.stringify(settings))
          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
        }
      } catch (err) {
        console.error("Error saving settings:", err)
        setErrorMsg(formatError(err))
      } finally {
        setIsSaving(false)
      }
    }

    void save()
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading settings...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage system configuration and preferences</p>
        </div>

        {/* Notification */}
        {saved && (
          <div className="bg-green-500/10 border border-green-500 rounded-lg p-4 flex items-center gap-3">
            <Check className="text-green-600" size={20} />
            <p className="text-green-700 font-medium">Settings saved successfully</p>
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-red-700 font-medium">{errorMsg}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Farm Information */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Farm Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Farm Name</label>
                <input
                  type="text"
                  value={settings.farmName}
                  onChange={(e) => handleChange("farmName", e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  value={settings.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Owner Name</label>
                <input
                  type="text"
                  value={settings.owner}
                  onChange={(e) => handleChange("owner", e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Alert Thresholds */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={20} className="text-primary" />
              <h2 className="text-xl font-semibold">Alert Thresholds</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Configure when alerts should trigger</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Low DO Alert (mg/L)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.lowDoThreshold ?? ""}
                  onChange={(e) => handleChange("lowDoThreshold", e.target.value === "" ? "" : Number.parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">High Ammonia Alert (mg/L)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.highAmmoniaThreshold ?? ""}
                  onChange={(e) => handleChange("highAmmoniaThreshold", e.target.value === "" ? "" : Number.parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">High Mortality Alert (%/day)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.highMortalityThreshold ?? ""}
                  onChange={(e) => handleChange("highMortalityThreshold", e.target.value === "" ? "" : Number.parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* System Preferences */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">System Preferences</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Data Backup Frequency</label>
                <select
                  value={settings.dataBackupFrequency}
                  onChange={(e) => handleChange("dataBackupFrequency", e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <select
                  value={settings.theme}
                  onChange={(e) => handleChange("theme", e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Data Management</h2>
            <div className="space-y-3">
              <button className="w-full md:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium">
                Export All Data (CSV)
              </button>
              <button className="w-full md:w-auto px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors font-medium">
                Backup Supabase
              </button>
              <button className="w-full md:w-auto px-4 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors font-medium">
                Clear Local Cache
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:opacity-90 transition-opacity font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save size={18} />
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
