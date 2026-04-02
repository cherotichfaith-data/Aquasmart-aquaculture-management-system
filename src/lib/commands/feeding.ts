import type { Database } from "@/lib/types/database"

export type FeedingInsertInput = Database["public"]["Tables"]["feeding_record"]["Insert"] & {
  feeding_response: "very_good" | "good" | "fair" | "bad"
}

type FeedingRecordRow = Database["public"]["Tables"]["feeding_record"]["Row"]

type RecordFeedingResponse = {
  data: FeedingRecordRow
  meta: {
    farmId: string
    systemId: number
    date: string
  }
}

export async function recordFeeding(payload: FeedingInsertInput): Promise<RecordFeedingResponse> {
  const response = await fetch("/api/feeding/record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const body = (await response.json().catch(() => null)) as
    | RecordFeedingResponse
    | {
        error?: string
      }
    | null

  if (!response.ok) {
    throw new Error(body && "error" in body && body.error ? body.error : "Failed to record feeding event.")
  }

  if (!body || !("data" in body) || !("meta" in body)) {
    throw new Error("Invalid feeding response.")
  }

  return body
}
