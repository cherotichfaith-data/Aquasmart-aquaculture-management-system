import { formatUnitValue } from "@/lib/analytics-format"

export const formatWithUnit = (value: number | null | undefined, decimals: number, unit: string) => {
  return formatUnitValue(value, decimals, unit)
}
