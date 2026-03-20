import type { QueryResult } from "@/lib/supabase-client"

export function getQueryResultError(result?: QueryResult<unknown> | null): string | null {
  if (!result) return null
  if (typeof result === "object" && "status" in result && result.status === "error") {
    return result.error
  }
  return null
}

export function getErrorMessage(error: unknown): string | null {
  if (!error) return null
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return null
}

export function getCombinedQueryMessages(
  ...sources: Array<{
    error?: unknown
    result?: QueryResult<unknown> | null
  }>
): string[] {
  const seen = new Set<string>()
  const messages: string[] = []

  sources.forEach((source) => {
    const message = getErrorMessage(source.error) ?? getQueryResultError(source.result)
    if (!message || seen.has(message)) return
    seen.add(message)
    messages.push(message)
  })

  return messages
}
