import { createClient } from 'npm:@supabase/supabase-js@2'

// Import CORS headers directly from the SDK (v2.95.0+) — auto-synced with SDK updates.
import { corsHeaders } from 'jsr:@supabase/supabase-js@2/cors'
export { corsHeaders }

// ─── Service-role client ──────────────────────────────────────────────────────
// Bypasses RLS — use only in normalizer functions that run after admin approval.
export const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
)

// ─── User-context client factory ─────────────────────────────────────────────
// Creates a client respecting RLS using the caller's JWT.
// Use in parse-preview (called directly by the frontend user).
export function createUserClient(req: Request) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization') ?? '' },
      },
    }
  )
}

// ─── Response helpers ─────────────────────────────────────────────────────────
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status)
}
