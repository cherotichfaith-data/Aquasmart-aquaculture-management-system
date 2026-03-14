import type { Database, Tables } from "@/lib/types/database"

export type FeedingRow = Tables<"feeding_record">
export type FeedingInsert = Database["public"]["Tables"]["feeding_record"]["Insert"]
export type FeedTypeOption = Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number]
