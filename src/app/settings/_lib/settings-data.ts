"use client"

import type { SupabaseClient } from "@supabase/supabase-js"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"
import { getSessionUser } from "@/lib/supabase/session"
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/types/database"
import { hasActionableSbError, type SettingsFormState } from "../settings-utils"

export type AlertThresholdWithFeeding = Tables<"alert_threshold"> & {
  low_feeding_rate_threshold?: number | null
  high_feeding_rate_threshold?: number | null
}

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
      thresholdRow: null as AlertThresholdWithFeeding | null,
      nextThresholdDenied: thresholdDenied,
    }
  }

  const sessionUser = await getSessionUser(supabase as any, "settings:load:getSession")
  if (!sessionUser) {
    return {
      thresholdRow: null as AlertThresholdWithFeeding | null,
      nextThresholdDenied: thresholdDenied,
    }
  }

  let nextThresholdDenied = thresholdDenied
  let thresholdRow: AlertThresholdWithFeeding | null = null

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
      thresholdRow = (data as AlertThresholdWithFeeding | null) ?? null
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

  let resolvedFarmId = farmId
  let nextThresholdId = thresholdId

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
        return {
          errorMessage:
            "You do not have permission to create a farm. Ask an admin to assign your account to an existing farm.",
        }
      }
      if (hasActionableSbError(farmCreateError)) {
        logSbError("settings:save:farmCreate", farmCreateError)
      }
      throw farmCreateError
    }

    resolvedFarmId = newFarm?.id ?? null
    if (resolvedFarmId) {
      const role = profileRole ?? "admin"
      const { error: membershipError } = await supabase
        .from("farm_user")
        .insert({ farm_id: resolvedFarmId, user_id: userId, role })
      if (membershipError) {
        if (hasActionableSbError(membershipError)) {
          logSbError("settings:save:farmUser", membershipError)
        }
        throw membershipError
      }
    }
  }

  if (!resolvedFarmId) {
    return { errorMessage: "No farm selected for this account." }
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

  const thresholdPayload: TablesInsert<"alert_threshold"> & {
    low_feeding_rate_threshold?: number | null
    high_feeding_rate_threshold?: number | null
  } = {
    scope: "farm",
    farm_id: resolvedFarmId,
    low_do_threshold: settings.lowDoThreshold,
    high_ammonia_threshold: settings.highAmmoniaThreshold,
    high_mortality_threshold: settings.highMortalityThreshold,
    low_feeding_rate_threshold: settings.lowFeedingRateThreshold,
    high_feeding_rate_threshold: settings.highFeedingRateThreshold,
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
