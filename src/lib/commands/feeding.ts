import type { Database } from "@/lib/types/database"
import type { FeedingResponseLevel } from "@/lib/feeding-response"

export type FeedingInsertInput = Database["public"]["Tables"]["feeding_record"]["Insert"] & {
  farm_id?: string | null
  feed_type_id?: number | null
  feeding_response?: FeedingResponseLevel | null
}
