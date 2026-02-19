"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { AlertCircle, Check } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { createClient } from "@/utils/supabase/client"
import { isSbPermissionDenied, logSbError } from "@/utils/supabase/log"
import { getSessionUser } from "@/utils/supabase/session"
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/types/database"
import { DEFAULT_SETTINGS, formatError, hasActionableSbError } from "./settings-utils"
import { AlertThresholdsSection, FarmInformationSection, SaveSettingsButton } from "./settings-sections"

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false)
  const [thresholdId, setThresholdId] = useState<string | null>(null)
  const [thresholdDenied, setThresholdDenied] = useState(false)
  const { user, profile } = useAuth()
  const { farm, farmId, loading: farmLoading } = useActiveFarm()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const settingsLoadQuery = useQuery({
    queryKey: ["settings", "load", user?.id ?? "anon", farmId ?? "no-farm", thresholdDenied],
    enabled: Boolean(user?.id) && !farmLoading && !hasLoadedSettings,
    queryFn: async () => {
      const sessionUser = await getSessionUser(supabase, "settings:load:getSession")
      if (!sessionUser) {
        return {
          thresholdRow: null as Tables<"alert_threshold"> | null,
          nextThresholdDenied: thresholdDenied,
        }
      }

      let nextThresholdDenied = thresholdDenied
      let thresholdRow: Tables<"alert_threshold"> | null = null

      if (farmId && !thresholdDenied) {
        const { data, error } = await supabase
          .from("alert_threshold")
          .select("*")
          .eq("scope", "farm")
          .eq("farm_id", farmId)
          .maybeSingle()
        if (error && isSbPermissionDenied(error)) {
          nextThresholdDenied = true
        } else if (error && hasActionableSbError(error)) {
          logSbError("settings:load:threshold", error)
        } else {
          thresholdRow = data ?? null
        }
      }

      return {
        thresholdRow,
        nextThresholdDenied,
      }
    },
    staleTime: 60_000,
  })
  const settingsLoadData = settingsLoadQuery.data
  const settingsLoadLoading = settingsLoadQuery.isLoading
  const settingsLoadSuccess = settingsLoadQuery.isSuccess
  const settingsLoadFetched = settingsLoadQuery.isFetched

  useEffect(() => {
    if (!user?.id) return
    if (farmLoading) return
    if (hasLoadedSettings) return

    setLoading(settingsLoadLoading)
    if (!settingsLoadSuccess) {
      if (settingsLoadFetched) {
        setLoading(false)
      }
      return
    }
    if (!settingsLoadData) {
      setLoading(false)
      return
    }

    const farmRow = farm ?? null
    const {
      thresholdRow,
      nextThresholdDenied,
    } = settingsLoadData

    if (nextThresholdDenied) setThresholdDenied(true)
    setThresholdId(thresholdRow?.id ?? null)
    setSettings((prev) => ({
      ...prev,
      farmName: farmRow?.name ?? profile?.farm_name ?? prev.farmName,
      location: farmRow?.location ?? profile?.location ?? prev.location,
      owner: farmRow?.owner ?? profile?.owner ?? prev.owner,
      email: farmRow?.email ?? profile?.email ?? prev.email,
      phone: farmRow?.phone ?? profile?.phone ?? prev.phone,
      role: profile?.role ?? prev.role,
      lowDoThreshold: thresholdRow?.low_do_threshold ?? prev.lowDoThreshold,
      highAmmoniaThreshold: thresholdRow?.high_ammonia_threshold ?? prev.highAmmoniaThreshold,
      highMortalityThreshold: thresholdRow?.high_mortality_threshold ?? prev.highMortalityThreshold,
    }))
    setHasLoadedSettings(true)
    setLoading(false)
  }, [farm, farmLoading, hasLoadedSettings, profile, settingsLoadData, settingsLoadFetched, settingsLoadLoading, settingsLoadSuccess, user?.id])

  useEffect(() => {
    if (user?.id) return
    const savedSettings = localStorage.getItem("aqua_settings")
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch {
        // ignore malformed local cache
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
          const sessionUser = await getSessionUser(supabase, "settings:save:getSession")
          if (!sessionUser) {
            setErrorMsg("No active session.")
            setIsSaving(false)
            return
          }
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
              if (isSbPermissionDenied(farmCreateError)) {
                setErrorMsg("You do not have permission to create a farm. Ask an admin to assign your account to an existing farm.")
                setIsSaving(false)
                return
              }
              if (hasActionableSbError(farmCreateError)) {
                logSbError("settings:save:farmCreate", farmCreateError)
              }
              throw farmCreateError
            }

            resolvedFarmId = newFarm?.id ?? null
            if (resolvedFarmId) {
              const role = profile?.role ?? "admin"
              const { error: membershipError } = await supabase
                .from("farm_user")
                .insert({ farm_id: resolvedFarmId, user_id: user.id, role })
              if (membershipError) {
                if (hasActionableSbError(membershipError)) {
                  logSbError("settings:save:farmUser", membershipError)
                }
                throw membershipError
              }
            }
          }

          if (!resolvedFarmId) {
            setErrorMsg("No farm selected for this account.")
            setIsSaving(false)
            return
          }

          const farmPayload: TablesUpdate<"farm"> = {
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
            if (isSbPermissionDenied(farmError)) {
              setErrorMsg("You do not have permission to update farm details.")
              setIsSaving(false)
              return
            }
            if (hasActionableSbError(farmError)) {
              logSbError("settings:save:farmUpdate", farmError)
            }
            throw farmError
          }

          const thresholdPayload: TablesInsert<"alert_threshold"> = {
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
            if (thresholdError) {
              if (hasActionableSbError(thresholdError)) {
                logSbError("settings:save:thresholdUpdate", thresholdError)
              }
              throw thresholdError
            }
          } else {
            const { data: insertedThreshold, error: thresholdError } = await supabase
              .from("alert_threshold")
              .insert(thresholdPayload)
              .select("id")
              .single()
            if (thresholdError) {
              if (hasActionableSbError(thresholdError)) {
                logSbError("settings:save:thresholdInsert", thresholdError)
              }
              throw thresholdError
            }
            setThresholdId(insertedThreshold?.id ?? null)
          }

          const profilePayload: TablesInsert<"profiles"> = {
            id: user.id,
            email: settings.email,
            owner: settings.owner,
            farm_name: settings.farmName,
            location: settings.location,
            phone: settings.phone,
            role: settings.role,
          }

          const { error: mainProfileError } = await supabase
            .from("profiles")
            .upsert(profilePayload, { onConflict: "id" })

          if (mainProfileError) {
            if (hasActionableSbError(mainProfileError)) {
              logSbError("settings:save:profiles", mainProfileError)
            }
            throw mainProfileError
          }

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("farm-updated", { detail: { farmId: resolvedFarmId } }))
            window.dispatchEvent(new Event("profile-updated"))
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
        if (hasActionableSbError(err)) {
          logSbError("settings:save", err)
        }
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
          <FarmInformationSection settings={settings} handleChange={handleChange} />
          <AlertThresholdsSection settings={settings} handleChange={handleChange} />
          <SaveSettingsButton isSaving={isSaving} onSave={handleSave} />
        </div>
      </div>
    </DashboardLayout>
  )
}

