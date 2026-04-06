"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { createClient } from "@/lib/supabase/client"
import { logSbError } from "@/lib/supabase/log"
import { DEFAULT_SETTINGS, formatError, hasActionableSbError } from "./settings-utils"
import { getErrorMessage } from "@/lib/utils/query-result"
import { SettingsPageShell } from "./_components/settings-page-shell"
import { loadSettingsData, saveSettingsData } from "./_lib/settings-data"

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
  const missingFarmAssignment = Boolean(user?.id) && !farmLoading && !farmId
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const settingsLoadQuery = useQuery({
    queryKey: ["settings", "load", user?.id ?? "anon", farmId ?? "no-farm", thresholdDenied],
    enabled: Boolean(user?.id) && !farmLoading && !hasLoadedSettings,
    queryFn: ({ signal }) =>
      loadSettingsData({
        supabase,
        userId: user?.id,
        farmId,
        thresholdDenied,
        signal,
      }),
    staleTime: 60_000,
  })
  const settingsLoadData = settingsLoadQuery.data
  const settingsLoadLoading = settingsLoadQuery.isLoading
  const settingsLoadSuccess = settingsLoadQuery.isSuccess
  const settingsLoadFetched = settingsLoadQuery.isFetched
  const settingsLoadError = getErrorMessage(settingsLoadQuery.error)

  useEffect(() => {
    if (!user?.id) return
    setHasLoadedSettings(false)
    setThresholdDenied(false)
    setThresholdId(null)
    setSaved(false)
    setErrorMsg(null)
    setSettings(DEFAULT_SETTINGS)
    setLoading(true)
  }, [farmId, user?.id])

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
          const result = await saveSettingsData({
            supabase,
            userId: user.id,
            farmId,
            settings,
            thresholdId,
          })
          if (result.errorMessage) {
            setErrorMsg(result.errorMessage)
            setIsSaving(false)
            return
          }
          setThresholdId(result.thresholdId ?? null)

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("farm-updated", { detail: { farmId: result.resolvedFarmId } }))
            window.dispatchEvent(new Event("profile-updated"))
          }

          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
          router.replace("/")
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

  return (
    <SettingsPageShell
      loading={loading}
      saved={saved}
      errorMsg={errorMsg}
      settingsLoadError={settingsLoadQuery.isError ? (settingsLoadError ?? "Please retry or check your connection.") : null}
      missingFarmAssignment={missingFarmAssignment}
      onRetryLoad={() => settingsLoadQuery.refetch()}
      settings={settings}
      onChange={handleChange}
      isSaving={isSaving}
      onSave={handleSave}
    />
  )
}
