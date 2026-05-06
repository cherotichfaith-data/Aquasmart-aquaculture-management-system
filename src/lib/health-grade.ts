import type { HealthGrade, SystemHealthRow } from "@/lib/types/insights"

const HEALTH_GRADE_MAP: Record<string, HealthGrade> = {
  excellent: "excellent",
  good: "good",
  watch: "fair",
  fair: "fair",
  poor: "poor",
  critical: "critical",
}

export function normalizeHealthGrade(value: string | null | undefined): HealthGrade {
  if (!value) return "fair"
  return HEALTH_GRADE_MAP[value.trim().toLowerCase()] ?? "fair"
}

export function normalizeSystemHealthRow<T extends Pick<SystemHealthRow, "health_grade">>(row: T): T {
  return {
    ...row,
    health_grade: normalizeHealthGrade(row.health_grade),
  }
}
