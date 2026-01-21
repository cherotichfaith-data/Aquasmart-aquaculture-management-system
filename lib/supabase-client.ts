export interface QueryParams {
  select?: string
  eq?: Record<string, string | number | boolean>
  order?: string | { column: string; ascending: boolean }
  limit?: number
}

export type QueryResult<T> = { status: "success"; data: T[] } | { status: "error"; data: null; error: string }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[v0] Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
  )
}

export async function supabaseQuery<T = any>(table: string, params: QueryParams = {}): Promise<QueryResult<T>> {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        status: "error",
        data: null,
        error: "Missing Supabase credentials in environment variables",
      }
    }

    const url = new URL(`${supabaseUrl}/rest/v1/${table}`)
    const sp = new URLSearchParams()

    sp.set("select", params.select ?? "*")
    if (params.order) {
      if (typeof params.order === "string") {
        sp.set("order", params.order)
      } else {
        sp.set("order", `${params.order.column}.${params.order.ascending ? "asc" : "desc"}`)
      }
    }
    if (params.limit) sp.set("limit", String(params.limit))

    if (params.eq) {
      Object.entries(params.eq).forEach(([k, v]) => {
        sp.set(k, `eq.${String(v)}`)
      })
    }

    url.search = sp.toString()

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
    })

    if (!res.ok) {
      const text = await res.text()
      return {
        status: "error",
        data: null,
        error: `Supabase error ${res.status}: ${text}`,
      }
    }

    const json = await res.json()
    const data = Array.isArray(json) ? json : [json]
    return { status: "success", data: data as T[] }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { status: "error", data: null, error: message }
  }
}

export async function supabaseInsert<T = any, InsertPayload extends object = object>(
  table: string,
  payload: InsertPayload | InsertPayload[],
): Promise<QueryResult<T>> {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        status: "error",
        data: null,
        error: "Missing Supabase credentials in environment variables",
      }
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      return {
        status: "error",
        data: null,
        error: `Supabase error ${res.status}: ${text}`,
      }
    }

    const json = await res.json()
    const data = Array.isArray(json) ? json : [json]
    return { status: "success", data: data as T[] }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { status: "error", data: null, error: message }
  }
}
