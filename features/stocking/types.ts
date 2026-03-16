import type { Database, Tables } from "@/lib/types/database"

export type StockingRow = Tables<"fish_stocking">
export type StockingInsert = Database["public"]["Tables"]["fish_stocking"]["Insert"]
export type BatchOption = Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number]
