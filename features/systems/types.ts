import type { Database, Tables } from "@/lib/types/database"

export type SystemRow = Tables<"system">
export type SystemInsert = Database["public"]["Tables"]["system"]["Insert"]
export type SystemOption = Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]
