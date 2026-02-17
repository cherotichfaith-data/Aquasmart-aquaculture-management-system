import { createClient } from "@/utils/supabase/client"
import { isSbPermissionDenied, logSbError } from "@/utils/supabase/log"
import { getSessionUser } from "@/utils/supabase/session"

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

type OrderableQuery = {
  order: (column: string, options: { ascending: boolean }) => OrderableQuery
}

function applyOrder<TQuery extends OrderableQuery>(query: TQuery, order: QueryParams["order"]): TQuery {
  if (!order) return query
  if (typeof order === "string") {
    const [column, direction] = order.split(".")
    return query.order(column, { ascending: direction !== "desc" }) as TQuery
  }
  return query.order(order.column, { ascending: order.ascending }) as TQuery
}

export async function supabaseQuery<T = unknown>(table: string, params: QueryParams = {}): Promise<QueryResult<T>> {
  try {
    const supabase = createClient()
    const sessionUser = await getSessionUser(supabase, `supabaseQuery:${table}:getSession`)
    if (!sessionUser) {
      return { status: "error", data: null, error: "No active session" }
    }
    let query = supabase.from(table).select(params.select ?? "*")

    if (params.eq) {
      Object.entries(params.eq).forEach(([k, v]) => {
        query = query.eq(k, v)
      })
    }

    if (params.in) {
      Object.entries(params.in).forEach(([k, values]) => {
        if (!values.length) return
        query = query.in(k, values)
      })
    }

    if (params.gte) {
      Object.entries(params.gte).forEach(([k, v]) => {
        query = query.gte(k, v)
      })
    }

    if (params.lte) {
      Object.entries(params.lte).forEach(([k, v]) => {
        query = query.lte(k, v)
      })
    }

    query = applyOrder(query, params.order)

    if (params.limit) {
      query = query.limit(params.limit)
    }

    const { data, error } = await query

    if (error) {
      if (!isSbPermissionDenied(error)) {
        logSbError(`supabaseQuery:${table}`, error)
      }
      return { status: "error", data: null, error: error.message }
    }

    return { status: "success", data: (data ?? []) as T[] }
  } catch (err) {
    logSbError(`supabaseQuery:${table}:catch`, err)
    const message = err instanceof Error ? err.message : String(err)
    return { status: "error", data: null, error: message }
  }
}

export async function supabaseInsert<T = unknown, InsertPayload extends object = object>(
  table: string,
  payload: InsertPayload | InsertPayload[],
): Promise<QueryResult<T>> {
  try {
    const supabase = createClient()
    const sessionUser = await getSessionUser(supabase, `supabaseInsert:${table}:getSession`)
    if (!sessionUser) {
      return { status: "error", data: null, error: "No active session" }
    }
    const { data, error } = await supabase.from(table).insert(payload).select()

    if (error) {
      logSbError(`supabaseInsert:${table}`, error)
      return { status: "error", data: null, error: error.message }
    }

    return { status: "success", data: (data ?? []) as T[] }
  } catch (err) {
    logSbError(`supabaseInsert:${table}:catch`, err)
    const message = err instanceof Error ? err.message : String(err)
    return { status: "error", data: null, error: message }
  }
}
