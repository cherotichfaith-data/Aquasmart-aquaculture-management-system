import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth")
  }

  return user
}
