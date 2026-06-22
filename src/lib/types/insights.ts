import type { Database } from "@/lib/types/database"

export type ActionPriority = "High" | "Medium" | "Info"
export type RecommendedActionRow = Database["public"]["Functions"]["api_recommended_actions"]["Returns"][number]
