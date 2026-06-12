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

type UploadAccessOptions = {
  allowedStatuses?: string[]
  writeRoles?: string[]
}

export async function requireUploadAccess(
  req: Request,
  rawUploadId: string,
  options: UploadAccessOptions = {},
): Promise<{ upload: any; user: any } | Response> {
  const userClient = createUserClient(req)
  const { data: userData, error: userError } = await userClient.auth.getUser()
  const user = userData?.user ?? null

  if (userError || !user) {
    return errorResponse('Unauthorized', 401)
  }

  const { data: upload, error: uploadError } = await userClient
    .from('raw_uploads')
    .select('*')
    .eq('id', rawUploadId)
    .single()

  if (uploadError || !upload) {
    return errorResponse('Upload not found', 404)
  }

  if (options.allowedStatuses?.length && !options.allowedStatuses.includes(upload.status)) {
    return errorResponse(`Upload status is "${upload.status}"`, 409)
  }

  if (options.writeRoles?.length) {
    const { data: membership, error: membershipError } = await userClient
      .from('farm_user')
      .select('role')
      .eq('farm_id', upload.farm_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError || !membership || !options.writeRoles.includes(String(membership.role))) {
      return errorResponse('Forbidden', 403)
    }
  }

  return { upload, user }
}
