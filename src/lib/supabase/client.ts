import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

let browserClient: SupabaseClient<Database> | null = null

export function supabaseBrowser() {
  if (browserClient) return browserClient

  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  return browserClient
}

export const createClient = supabaseBrowser
