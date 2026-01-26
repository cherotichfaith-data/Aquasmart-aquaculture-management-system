import { createClient } from "@/utils/supabase/client"

export interface QueryParams {
  select?: string
  eq?: Record<string, string | number | boolean>
  in?: Record<string, Array<string | number | boolean>>
  gte?: Record<string, string | number>
  lte?: Record<string, string | number>
  order?: string | { column: string; ascending: boolean }
  limit?: number
}

export type QueryResult<T> = { status: "success"; data: T[] } | { status: "error"; data: null; error: string }

function applyOrder<T>(query: any, order: QueryParams["order"]) {
  if (!order) return query
  if (typeof order === "string") {
    const [column, direction] = order.split(".")
    return query.order(column, { ascending: direction !== "desc" })
  }
  return query.order(order.column, { ascending: order.ascending })
}

export async function supabaseQuery<T = any>(table: string, params: QueryParams = {}): Promise<QueryResult<T>> {
  try {
    const supabase = createClient()
    let query = supabase.from(table).select(params.select ?? "*")

    if (params.eq) {
      Object.entries(params.eq).forEach(([k, v]) => {
        query = query.eq(k, v as any)
      })
    }

    if (params.in) {
      Object.entries(params.in).forEach(([k, values]) => {
        if (!values.length) return
        query = query.in(k, values as any)
      })
    }

    if (params.gte) {
      Object.entries(params.gte).forEach(([k, v]) => {
        query = query.gte(k, v as any)
      })
    }

    if (params.lte) {
      Object.entries(params.lte).forEach(([k, v]) => {
        query = query.lte(k, v as any)
      })
    }

    query = applyOrder(query, params.order)

    if (params.limit) {
      query = query.limit(params.limit)
    }

    const { data, error } = await query

    if (error) {
      return { status: "error", data: null, error: error.message }
    }

    return { status: "success", data: (data ?? []) as T[] }
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
    const supabase = createClient()
    const { data, error } = await supabase.from(table).insert(payload).select()

    if (error) {
      return { status: "error", data: null, error: error.message }
    }

    return { status: "success", data: (data ?? []) as T[] }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { status: "error", data: null, error: message }
  }
}
