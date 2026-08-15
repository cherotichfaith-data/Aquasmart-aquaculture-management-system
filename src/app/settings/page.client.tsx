"use client"

import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { AlertCircle, Check, CheckCircle2, Info, Save } from "lucide-react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { useAuth } from "@/components/providers/auth-provider"
import { DataErrorState } from "@/components/shared/data-states"
import { Skeleton } from "@/components/app-ui/skeleton"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useActiveFarmRole } from "@/lib/hooks/use-active-farm-role"
import { queryKeys } from "@/lib/cache/query-keys"
import { formatRoleLabel, resolveAppEntryPath, type AquaSmartRole } from "@/lib/app-entry"
import { createClient } from "@/lib/supabase/client"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"
import { getSessionUser } from "@/lib/supabase/session"
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/types/database"
import { getErrorMessage } from "@/lib/utils/query-result"

type SettingsFormState = {
  farmName: string
  location: string
  lowDoThreshold: number
  highAmmoniaThreshold: number
  highMortalityThreshold: number
}

const DEFAULT_SETTINGS: SettingsFormState = {
  farmName: "",
  location: "",
  lowDoThreshold: 5.0,
  highAmmoniaThreshold: 0.05,
  highMortalityThreshold: 2.0,
}

const inputClassName =
  "soft-input-surface w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/45"

type AlertThresholdRow = Tables<"alert_threshold">
type SettingsLoadData = Awaited<
  ReturnType<typeof loadSettingsData>
>

function hasActionableSbError(err: unknown) {
  if (!err || typeof err !== "object") return false
  const maybe = err as { message?: string; details?: string; hint?: string; code?: string; status?: number }
  return Boolean(maybe.message || maybe.details || maybe.hint || maybe.code || maybe.status)
}

function formatError(err: unknown) {
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

function isAbortLikeError(err: unknown): boolean {
  if (!err) return false
  const e = err as { name?: string; message?: string }
  const name = String(e.name ?? "").toLowerCase()
  const message = String(e.message ?? "").toLowerCase()
  return name.includes("abort") || message.includes("abort") || name.includes("cancel") || message.includes("cancel")
}

async function loadSettingsData(params: {
  userId?: string | null
  farmId?: string | null
  thresholdDenied: boolean
  signal?: AbortSignal
}) {
  const { userId, farmId, thresholdDenied, signal } = params
  if (!userId) {
    return {
      thresholdRow: null as AlertThresholdRow | null,
      nextThresholdDenied: thresholdDenied,
    }
  }

  const supabase = createClient()
  let nextThresholdDenied = thresholdDenied
  let thresholdRow: AlertThresholdRow | null = null

  if (farmId && !thresholdDenied) {
    let query = supabase
      .from("alert_threshold")
      .select("*")
      .eq("scope", "farm")
      .eq("farm_id", farmId)
      .maybeSingle()
    if (signal) {
      const withSignal = (query as { abortSignal?: (signal: AbortSignal) => typeof query }).abortSignal?.(signal)
      if (withSignal) query = withSignal
    }
    const { data, error } = await query
    if (error && isSbPermissionDenied(error)) {
      nextThresholdDenied = true
    } else if (error && !isAbortLikeError(error) && hasActionableSbError(error)) {
      logSbError("settings:load:threshold", error)
    } else {
      thresholdRow = (data as AlertThresholdRow | null) ?? null
    }
  }

  return {
    thresholdRow,
    nextThresholdDenied,
  }
}

async function saveSettingsData(params: {
  userId?: string | null
  farmId?: string | null
  settings: SettingsFormState
  thresholdId: string | null
}) {
  const { userId, farmId, settings, thresholdId } = params
  const supabase = createClient()
  const sessionUser = await getSessionUser(supabase as never, "settings:save:getSession")
  if (!sessionUser || !userId) {
    return { errorMessage: "No active session." }
  }

  if (!farmId) {
    return {
      errorMessage:
        "No farm workspace exists for this account yet. Complete onboarding to create your farm workspace.",
    }
  }

  let nextThresholdId = thresholdId

  const farmPayload: TablesUpdate<"farm"> = {
    name: settings.farmName,
    location: settings.location,
  }

  const { error: farmError } = await supabase.from("farm").update(farmPayload).eq("id", farmId)
  if (farmError) {
    if (isSbPermissionDenied(farmError)) {
      return { errorMessage: "You do not have permission to update farm details." }
    }
    if (hasActionableSbError(farmError)) {
      logSbError("settings:save:farmUpdate", farmError)
    }
    throw farmError
  }

  const thresholdPayload: TablesInsert<"alert_threshold"> = {
    scope: "farm",
    farm_id: farmId,
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
      if (hasActionableSbError(thresholdError)) logSbError("settings:save:thresholdUpdate", thresholdError)
      throw thresholdError
    }
  } else {
    const { data: insertedThreshold, error: thresholdError } = await supabase
      .from("alert_threshold")
      .insert(thresholdPayload)
      .select("id")
      .single()
    if (thresholdError) {
      if (hasActionableSbError(thresholdError)) logSbError("settings:save:thresholdInsert", thresholdError)
      throw thresholdError
    }
    nextThresholdId = insertedThreshold?.id ?? null
  }

  return {
    resolvedFarmId: farmId,
    thresholdId: nextThresholdId,
    errorMessage: null as string | null,
  }
}

function SettingsLoadingState({
  initialFarmId,
  initialFarmName,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
}) {
  return (
    <DashboardLayout hideHeader showHeaderToolbar={false} initialFarmId={initialFarmId} initialFarmName={initialFarmName}>
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-72" />
        </div>
        <div className="soft-panel p-5 sm:p-6">
          <Skeleton className="mb-5 h-7 w-44" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
        <div className="soft-panel p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-7 w-40" />
          </div>
          <Skeleton className="mb-5 h-4 w-60" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-11 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-12 w-40 rounded-lg" />
        </div>
      </div>
    </DashboardLayout>
  )
}

function FarmInformationSection({
  settings,
  handleChange,
  displayName,
  accountEmail,
  farmRole,
}: {
  settings: SettingsFormState
  handleChange: (field: string, value: string | number) => void
  displayName: string
  accountEmail: string
  farmRole: AquaSmartRole
}) {
  return (
    <div className="soft-panel p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold leading-tight sm:text-xl">Farm Information</h2>
      <p className="mb-5 text-sm leading-6 text-muted-foreground">
        Farm settings are edited here. Your account details and active farm role are shown for context and are managed
        separately from farm configuration.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground/90">Farm Name</label>
          <input type="text" value={settings.farmName} onChange={(e) => handleChange("farmName", e.target.value)} className={inputClassName} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground/90">Location</label>
          <input type="text" value={settings.location} onChange={(e) => handleChange("location", e.target.value)} className={inputClassName} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-foreground/90">Your Name</p>
          <div className="flex items-center rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-sm text-foreground">
            {displayName || "-"}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-foreground/90">Account Email</p>
          <div className="flex items-center rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-sm text-foreground">
            {accountEmail || "-"}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-foreground/90">Active Farm Role</p>
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
            <span className="text-sm text-foreground">{formatRoleLabel(farmRole)}</span>
            <span className="ml-auto text-xs text-muted-foreground">Managed by admin</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function AlertThresholdsSection({
  settings,
  handleChange,
}: {
  settings: SettingsFormState
  handleChange: (field: string, value: string | number) => void
}) {
  const thresholds = [
    {
      field: "lowDoThreshold",
      label: "Low Dissolved Oxygen",
      step: "0.1",
      min: 0,
      max: 20,
      placeholder: "e.g. 4.0",
      hint: "Alert fires when DO drops below this value. Tilapia: 4.0 mg/L recommended.",
      value: settings.lowDoThreshold,
    },
    {
      field: "highAmmoniaThreshold",
      label: "High Total Ammonia (TAN)",
      step: "0.01",
      min: 0,
      max: 10,
      placeholder: "e.g. 1.0",
      hint: "Alert fires when TAN exceeds this value. Safe limit: < 0.5 mg/L; danger: > 1.0 mg/L.",
      value: settings.highAmmoniaThreshold,
    },
    {
      field: "highMortalityThreshold",
      label: "High Mortality Rate",
      step: "0.01",
      min: 0,
      max: 100,
      placeholder: "e.g. 0.5",
      hint: "Alert fires when daily mortality rate exceeds this percentage. Healthy: < 0.1% / day.",
      value: settings.highMortalityThreshold,
    },
  ] as const

  return (
    <div className="soft-panel p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <AlertCircle size={20} className="text-primary" />
        <h2 className="text-lg font-semibold leading-tight sm:text-xl">Alert Thresholds</h2>
      </div>
      <p className="mb-5 text-sm leading-6 text-muted-foreground">
        These values determine when the system fires alerts. Changes take effect immediately for new data entries.
      </p>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {thresholds.map((t) => (
          <div key={t.field}>
            <div className="mb-1.5">
              <label className="text-sm font-medium text-foreground/90">{t.label}</label>
            </div>
            <div>
              <input
                type="number"
                step={t.step}
                min={t.min}
                max={t.max}
                placeholder={t.placeholder}
                value={t.value ?? ""}
                onChange={(e) => handleChange(t.field, e.target.value === "" ? "" : Number.parseFloat(e.target.value))}
                className={inputClassName}
              />
            </div>
            <p className="mt-1.5 flex items-start gap-1.5 text-tag leading-relaxed text-muted-foreground">
              <Info size={11} className="mt-0.5 shrink-0 opacity-60" />
              {t.hint}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SaveSettingsButton({
  isSaving,
  saved = false,
  disabled = false,
  onSave,
}: {
  isSaving: boolean
  saved?: boolean
  disabled?: boolean
  onSave: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-4">
      {saved && (
        <span className="flex items-center gap-1.5 text-sm font-medium text-success">
          <CheckCircle2 size={16} className="shrink-0" />
          Settings saved
        </span>
      )}
      <button
        onClick={onSave}
        disabled={isSaving || disabled}
        className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Save size={18} />
        {isSaving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  )
}

export default function SettingsPage({
  initialFarmId,
  initialFarmName,
  initialUserId,
  initialFarmRole,
  initialSettingsLoad,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialUserId?: string | null
  initialFarmRole?: AquaSmartRole | null
  initialSettingsLoad?: SettingsLoadData
}) {
  const initialThresholdRow = initialSettingsLoad?.thresholdRow ?? null
  const [settings, setSettings] = useState<SettingsFormState>(() => ({
    ...DEFAULT_SETTINGS,
    farmName: initialFarmName ?? "",
    lowDoThreshold: initialThresholdRow?.low_do_threshold ?? DEFAULT_SETTINGS.lowDoThreshold,
    highAmmoniaThreshold: initialThresholdRow?.high_ammonia_threshold ?? DEFAULT_SETTINGS.highAmmoniaThreshold,
    highMortalityThreshold: initialThresholdRow?.high_mortality_threshold ?? DEFAULT_SETTINGS.highMortalityThreshold,
  }))
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(() => !initialSettingsLoad)
  const [isSaving, setIsSaving] = useState(false)
  const [hasLoadedSettings, setHasLoadedSettings] = useState(() => Boolean(initialSettingsLoad))
  const [thresholdId, setThresholdId] = useState<string | null>(initialThresholdRow?.id ?? null)
  const [thresholdDenied, setThresholdDenied] = useState(initialSettingsLoad?.nextThresholdDenied ?? false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const hasMountedRef = useRef(false)

  const { user, profile } = useAuth()
  const resolvedUserId = user?.id ?? initialUserId ?? null
  const { farm, farmId, loading: farmLoading } = useActiveFarm({ initialFarmId, initialFarmName })
  const resolvedFarmId = farmId ?? initialFarmId ?? null
  const farmRoleQuery = useActiveFarmRole(resolvedFarmId)
  const farmRole = (farmRoleQuery.data ?? initialFarmRole ?? null) as AquaSmartRole
  const missingFarmAssignment = Boolean(resolvedUserId) && !farmLoading && !resolvedFarmId
  const router = useRouter()
  const canAccessSettings = !farmRole || farmRole === "admin" || farmRole === "farm_manager"
  const profileDisplayName =
    (typeof profile?.full_name === "string" && profile.full_name.trim()) ||
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    (typeof user?.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
    user?.email ||
    ""
  const accountEmail =
    (typeof user?.email === "string" && user.email.trim()) ||
    (typeof profile?.email === "string" && profile.email.trim()) ||
    ""

  useEffect(() => {
    if (farmRole && !canAccessSettings) {
      router.replace(resolveAppEntryPath(farmRole))
    }
  }, [farmRole, canAccessSettings, router])

  const settingsLoadQuery = useQuery({
    queryKey: queryKeys.settings.load(resolvedUserId, resolvedFarmId, thresholdDenied),
    enabled: Boolean(resolvedUserId) && !farmLoading && !hasLoadedSettings,
    queryFn: ({ signal }) =>
      loadSettingsData({
        userId: resolvedUserId,
        farmId: resolvedFarmId,
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
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }
    if (!resolvedUserId) return
    setHasLoadedSettings(false)
    setThresholdDenied(false)
    setThresholdId(null)
    setSaved(false)
    setErrorMsg(null)
    setSettings(DEFAULT_SETTINGS)
    setLoading(true)
  }, [resolvedFarmId, resolvedUserId])

  useEffect(() => {
    if (!resolvedUserId || hasLoadedSettings) return

    setLoading(settingsLoadLoading)
    if (!settingsLoadSuccess) {
      if (settingsLoadFetched) setLoading(false)
      return
    }
    if (!settingsLoadData) {
      setLoading(false)
      return
    }

    const thresholdRow = settingsLoadData.thresholdRow
    if (settingsLoadData.nextThresholdDenied) setThresholdDenied(true)
    setThresholdId(thresholdRow?.id ?? null)
    setSettings((prev) => ({
      ...prev,
      farmName: farm?.name ?? initialFarmName ?? prev.farmName,
      location: farm?.location ?? prev.location,
      lowDoThreshold: thresholdRow?.low_do_threshold ?? prev.lowDoThreshold,
      highAmmoniaThreshold: thresholdRow?.high_ammonia_threshold ?? prev.highAmmoniaThreshold,
      highMortalityThreshold: thresholdRow?.high_mortality_threshold ?? prev.highMortalityThreshold,
    }))
    setHasLoadedSettings(true)
    setLoading(false)
  }, [farm, hasLoadedSettings, initialFarmName, resolvedUserId, settingsLoadData, settingsLoadFetched, settingsLoadLoading, settingsLoadSuccess])

  useEffect(() => {
    if (!hasLoadedSettings) return
    setSettings((prev) => ({
      ...prev,
      farmName: farm?.name ?? initialFarmName ?? prev.farmName,
      location: prev.location || farm?.location || "",
    }))
  }, [farm, hasLoadedSettings, initialFarmName])

  useEffect(() => {
    if (resolvedUserId) return
    const savedSettings = localStorage.getItem("aqua_settings")
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch {
        // ignore malformed local cache
      }
    }
    setLoading(false)
  }, [resolvedUserId])

  const handleChange = (field: string, value: string | number) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    const save = async () => {
      setIsSaving(true)
      setErrorMsg(null)
      try {
        if (resolvedUserId) {
            const result = await saveSettingsData({
              userId: resolvedUserId,
              farmId: resolvedFarmId,
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
          }
          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
          router.replace(resolveAppEntryPath(farmRole))
        } else {
          localStorage.setItem("aqua_settings", JSON.stringify(settings))
          setSaved(true)
          setTimeout(() => setSaved(false), 3000)
        }
      } catch (err) {
        if (hasActionableSbError(err)) logSbError("settings:save", err)
        setErrorMsg(formatError(err))
      } finally {
        setIsSaving(false)
      }
    }

    void save()
  }

  if (farmRole && !canAccessSettings) return null
  if (loading) return <SettingsLoadingState initialFarmId={initialFarmId} initialFarmName={initialFarmName} />

  return (
    <DashboardLayout hideHeader showHeaderToolbar={false} initialFarmId={initialFarmId} initialFarmName={initialFarmName}>
      <div className="space-y-6">
        {saved ? (
          <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
            <Check className="shrink-0 text-success" size={18} />
            <p className="text-sm font-medium text-success">Settings saved, changes are now active.</p>
          </div>
        ) : null}
        {errorMsg ? (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <AlertCircle className="text-destructive" size={20} />
            <p className="font-medium text-destructive">{errorMsg}</p>
          </div>
        ) : null}
        {missingFarmAssignment ? (
          <div className="rounded-3xl border border-warning/30 bg-warning/10 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 text-warning" size={20} />
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-warning">Set up or join a farm first</p>
                  <p className="mt-2 text-sm leading-6 text-warning/90">
                    AquaSmart settings are only available after you have farm access.
                  </p>
                </div>
                <a
                  href="/onboarding"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Go to setup
                </a>
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-6">
          {settingsLoadQuery.isError ? (
            <DataErrorState
              title="Unable to load settings"
              description={settingsLoadError ?? "Please retry or check your connection."}
              onRetry={() => settingsLoadQuery.refetch()}
            />
          ) : null}
          {missingFarmAssignment ? null : (
            <>
              <FarmInformationSection
                settings={settings}
                handleChange={handleChange}
                displayName={profileDisplayName}
                accountEmail={accountEmail}
                farmRole={farmRole}
              />
              <AlertThresholdsSection settings={settings} handleChange={handleChange} />
              <SaveSettingsButton isSaving={isSaving} saved={saved} disabled={missingFarmAssignment} onSave={handleSave} />
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

