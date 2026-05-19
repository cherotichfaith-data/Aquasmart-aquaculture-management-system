import { completeSupabaseAuthLink } from "@/lib/supabase/auth-flow"

export async function GET(request: Request) {
  return completeSupabaseAuthLink(request)
}
