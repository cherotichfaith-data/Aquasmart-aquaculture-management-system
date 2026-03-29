"use client"

import type { SupabaseClient } from "@supabase/supabase-js"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"
import { getSessionUser } from "@/lib/supabase/session"
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/types/database"
import { hasActionableSbError, type SettingsFormState } from "../settings-utils"

export type AlertThresholdRow = Tables<"alert_threshold">

export const isAbortLikeError = (err: unknown): boolean => {
  if (!err) return false
  const e = err as { name?: string; message?: string }
  const name = String(e.name ?? "").toLowerCase()
  const message = String(e.message ?? "").toLowerCase()
  return name.includes("abort") || message.includes("abort") || name.includes("cancel") || message.includes("cancel")
}

export async function loadSettingsData(params: {
  supabase: SupabaseClient<any, "public", any>
  userId?: string | null
  farmId?: string | null
  thresholdDenied: boolean
  signal?: AbortSignal
}) {
  const { supabase, userId, farmId, thresholdDenied, signal } = params
  if (!userId) {
    return {
      thresholdRow: null as AlertThresholdRow | null,
      nextThresholdDenied: thresholdDenied,
    }
  }

  const sessionUser = await getSessionUser(supabase as any, "settings:load:getSession")
  if (!sessionUser) {
    return {
      thresholdRow: null as AlertThresholdRow | null,
      nextThresholdDenied: thresholdDenied,
    }
  }

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
      const withSignal = (query as any).abortSignal?.(signal)
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

export async function saveSettingsData(params: {
  supabase: SupabaseClient<any, "public", any>
  userId?: string | null
  farmId?: string | null
  settings: SettingsFormState
  thresholdId: string | null
  profileRole?: string | null
}) {
  const { supabase, userId, farmId, settings, thresholdId, profileRole } = params
  const sessionUser = await getSessionUser(supabase as any, "settings:save:getSession")
  if (!sessionUser || !userId) {
    return { errorMessage: "No active session." }
  }

  const resolvedFarmId = farmId
  let nextThresholdId = thresholdId

  if (!resolvedFarmId) {
    return {
      errorMessage:
        "No farm workspace exists for this account yet. Complete onboarding to create your farm workspace.",
    }
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
      return { errorMessage: "You do not have permission to update farm details." }
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
    nextThresholdId = insertedThreshold?.id ?? null
  }

  const farmUserPayload: TablesInsert<"farm_user"> = {
    farm_id: resolvedFarmId,
    user_id: userId,
    role: settings.role,
  }

  const { error: farmUserError } = await supabase
    .from("farm_user")
    .upsert(farmUserPayload, { onConflict: "farm_id,user_id" })

  if (farmUserError) {
    if (hasActionableSbError(farmUserError)) {
      logSbError("settings:save:farmUserUpsert", farmUserError)
    }
    throw farmUserError
  }

  return {
    resolvedFarmId,
    thresholdId: nextThresholdId,
    errorMessage: null as string | null,
  }
}
