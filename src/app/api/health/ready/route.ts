import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const revalidate = 0

function getMissingEnvVars() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ] as const

  return required.filter((name) => !process.env[name])
}

export async function GET() {
  const missingEnvVars = getMissingEnvVars()

  if (missingEnvVars.length > 0) {
    return NextResponse.json(
      {
        status: "error",
        check: "ready",
        service: "aquasmart-web",
        timestamp: new Date().toISOString(),
        checks: {
          env: {
            ok: false,
            missing: missingEnvVars,
          },
          supabase: {
            ok: false,
          },
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("farm").select("id").limit(1)

    if (error) {
      return NextResponse.json(
        {
          status: "error",
          check: "ready",
          service: "aquasmart-web",
          timestamp: new Date().toISOString(),
          checks: {
            env: {
              ok: true,
              missing: [],
            },
            supabase: {
              ok: false,
              message: error.message,
            },
          },
        },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      )
    }

    return NextResponse.json(
      {
        status: "ok",
        check: "ready",
        service: "aquasmart-web",
        timestamp: new Date().toISOString(),
        checks: {
          env: {
            ok: true,
            missing: [],
          },
          supabase: {
            ok: true,
          },
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown readiness error"

    return NextResponse.json(
      {
        status: "error",
        check: "ready",
        service: "aquasmart-web",
        timestamp: new Date().toISOString(),
        checks: {
          env: {
            ok: true,
            missing: [],
          },
          supabase: {
            ok: false,
            message,
          },
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  }
}
