import { Constants, type Enums } from "@/lib/types/database"

export const MORTALITY_CAUSES = Constants.public.Enums.mortality_cause
export type MortalityCause = Enums<"mortality_cause">

export const ALERT_SEVERITIES = ["info", "warning", "critical"] as const
