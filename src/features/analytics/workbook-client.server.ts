import "server-only"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"
import type { WorkbookTables } from "./workbook-types"
import type { MonthlyTables, MonthlyFunctions } from "./monthly-types"
import type { FeedTables, FeedFunctions } from "./feed-types"

// Session-scoped extension while preserving the generated schema and pending local edits.
type WorkbookDatabase = Omit<Database, "public"> & { public: Omit<Database["public"], "Tables" | "Functions"> & { Tables: Database["public"]["Tables"] & WorkbookTables & MonthlyTables & FeedTables; Functions: Database["public"]["Functions"] & MonthlyFunctions & FeedFunctions } }
export function workbookClient(accessToken: string) {
  return createClient<WorkbookDatabase>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
