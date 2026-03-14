import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { isSbNetworkError, logSbError } from "@/utils/supabase/log"

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
    if (error && !isSbNetworkError(error)) {
      logSbError("requireUser", error)
    }
    redirect("/auth")
  }

  return user
}
