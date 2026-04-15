import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isSbNetworkError, logSbError } from "@/lib/supabase/log"

function authServiceUnavailable(stage: string): never {
  throw new Error(`Unable to reach Supabase auth service during ${stage}.`)
}

export async function requireUser() {
  const supabase = await createClient()
  let user = null
  let error: unknown = null

  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
    error = result.error
  } catch (caught) {
    error = caught
  }

  if (error || !user) {
    if (error && isSbNetworkError(error)) {
      authServiceUnavailable("requireUser")
    }
    if (error) {
      logSbError("requireUser", error)
    }
    redirect("/auth")
  }

  return user
}

export async function requireUserContext() {
  const supabase = await createClient()
  let user = null
  let authError: unknown = null

  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
    authError = result.error
  } catch (caught) {
    authError = caught
  }

  if (authError || !user) {
    if (authError && isSbNetworkError(authError)) {
      authServiceUnavailable("requireUserContext:getUser")
    }
    if (authError) {
      logSbError("requireUserContext:getUser", authError)
    }
    redirect("/auth")
  }

  let accessToken: string | null = null
  let sessionError: unknown = null

  try {
    const result = await supabase.auth.getSession()
    accessToken = result.data.session?.access_token ?? null
    sessionError = result.error
  } catch (caught) {
    sessionError = caught
  }

  if (sessionError || !accessToken) {
    if (sessionError && isSbNetworkError(sessionError)) {
      authServiceUnavailable("requireUserContext:getSession")
    }
    if (sessionError) {
      logSbError("requireUserContext:getSession", sessionError)
    }
    redirect("/auth")
  }

  return { user, accessToken }
}
