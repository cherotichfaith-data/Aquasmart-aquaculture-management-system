const farmToken = (farmId?: string | null) => farmId ?? "all"
const numberToken = (value?: number | null, fallback = "all") => value ?? fallback
const stringToken = (value?: string | null, fallback = "") => value ?? fallback

export const queryKeys = {
  options: {
    systems(params?: {
      farmId?: string | null
      stage?: string | null
      activeOnly?: boolean
    }) {
      return ["options", "systems", farmToken(params?.farmId), params?.stage ?? "all", params?.activeOnly ?? false] as const
    },
    batches(farmId?: string | null) {
      return ["options", "batches", farmToken(farmId)] as const
    },
    feeds(userId?: string | null) {
      return ["options", "feeds", userId ?? "anon"] as const
    },
    feedSuppliers(userId?: string | null) {
      return ["options", "feed-suppliers", userId ?? "anon"] as const
    },
    fingerlingSuppliers(userId?: string | null) {
      return ["options", "fingerling-suppliers", userId ?? "anon"] as const
    },
    farms(userId?: string | null) {
      return ["options", "farms", userId ?? "anon"] as const
    },
    systemVolumes(params?: {
      farmId?: string | null
      stage?: string | null
      activeOnly?: boolean
    }) {
      return [
        "options",
        "system-volumes",
        farmToken(params?.farmId),
        params?.stage ?? "all",
        params?.activeOnly ?? true,
      ] as const
    },
  },
  inventory: {
    daily(params?: {
      farmId?: string | null
      systemId?: number
      dateFrom?: string
      dateTo?: string
      limit?: number
      cursorDate?: string
      orderAsc?: boolean
    }) {
      return [
        "inventory",
        "daily",
        farmToken(params?.farmId),
        numberToken(params?.systemId),
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
        params?.limit ?? 50,
        stringToken(params?.cursorDate),
        params?.orderAsc ?? false,
      ] as const
    },
  },
  reports: {
    runningStock(farmId?: string | null) {
      return ["reports", "running-stock", farmToken(farmId)] as const
    },
    feedingRecords(params?: {
      farmId?: string | null
      systemId?: number
      systemIds?: number[]
      batchId?: number
      dateFrom?: string
      dateTo?: string
      limit?: number
    }) {
      return [
        "reports",
        "feeding-records",
        farmToken(params?.farmId),
        numberToken(params?.systemId),
        params?.systemIds?.join(",") ?? "all-systems",
        numberToken(params?.batchId),
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
        params?.limit ?? 100,
      ] as const
    },
    recentEntries(farmId?: string | null) {
      return ["reports", "recent-entries", farmToken(farmId)] as const
    },
    sampling(params?: {
      farmId?: string | null
      systemId?: number
      systemIds?: number[]
      batchId?: number
      dateFrom?: string
      dateTo?: string
      limit?: number
    }) {
      return [
        "reports",
        "sampling",
        farmToken(params?.farmId),
        numberToken(params?.systemId),
        params?.systemIds?.join(",") ?? "all-systems",
        numberToken(params?.batchId),
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
        params?.limit ?? 100,
      ] as const
    },
    stocking(params?: {
      farmId?: string | null
      systemId?: number
      systemIds?: number[]
      batchId?: number
      dateFrom?: string
      dateTo?: string
      limit?: number
    }) {
      return [
        "reports",
        "stocking",
        farmToken(params?.farmId),
        numberToken(params?.systemId),
        params?.systemIds?.join(",") ?? "all-systems",
        numberToken(params?.batchId),
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
        params?.limit ?? 100,
      ] as const
    },
    fcrTrend(params?: {
      farmId?: string | null
      systemIds?: number[]
      dateFrom?: string
      dateTo?: string
      days?: number
    }) {
      return [
        "reports",
        "fcr-trend",
        farmToken(params?.farmId),
        params?.systemIds?.join(",") ?? "",
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
        params?.days ?? 180,
      ] as const
    },
    growthTrend(params?: {
      systemIds?: number[]
      dateFrom?: string
      dateTo?: string
      days?: number
    }) {
      return [
        "reports",
        "growth-trend",
        params?.systemIds?.join(",") ?? "",
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
        params?.days ?? 180,
      ] as const
    },
    survivalTrendScoped(params?: {
      systemIds?: number[]
      dateFrom?: string
      dateTo?: string
    }) {
      return [
        "reports",
        "survival-trend-scoped",
        params?.systemIds?.join(",") ?? "",
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
      ] as const
    },
    transfer(params?: {
      farmId?: string | null
      batchId?: number
      dateFrom?: string
      dateTo?: string
      limit?: number
    }) {
      return [
        "reports",
        "transfer",
        farmToken(params?.farmId),
        numberToken(params?.batchId),
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
        params?.limit ?? 100,
      ] as const
    },
    mortality(params?: {
      farmId?: string | null
      systemId?: number
      systemIds?: number[]
      batchId?: number
      dateFrom?: string
      dateTo?: string
      limit?: number
    }) {
      return [
        "reports",
        "mortality",
        farmToken(params?.farmId),
        numberToken(params?.systemId),
        params?.systemIds?.join(",") ?? "all-systems",
        numberToken(params?.batchId),
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
        params?.limit ?? 100,
      ] as const
    },
    batchSystemIds(params?: { farmId?: string | null; batchId?: number }) {
      return ["reports", "batch-system-ids", farmToken(params?.farmId), numberToken(params?.batchId)] as const
    },
  },
  mortality: {
    events(params?: {
      farmId?: string | null
      systemId?: number
      batchId?: number
      dateFrom?: string
      dateTo?: string
      limit?: number
    }) {
      return [
        "mortality-events",
        farmToken(params?.farmId),
        numberToken(params?.systemId),
        numberToken(params?.batchId),
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
        params?.limit ?? 100,
      ] as const
    },
    alertLog(params?: {
      farmId?: string | null
      systemId?: number
      severity?: string
      ruleCodes?: string[]
      unacknowledgedOnly?: boolean
      limit?: number
    }) {
      return [
        "alert-log",
        farmToken(params?.farmId),
        numberToken(params?.systemId),
        params?.severity ?? "all",
        params?.ruleCodes?.join(",") ?? "all-rules",
        params?.unacknowledgedOnly ?? false,
        params?.limit ?? 50,
      ] as const
    },
    survivalTrend(params: {
      systemId?: number
      dateFrom?: string
      dateTo?: string
    }) {
      return [
        "survival-trend",
        numberToken(params.systemId),
        stringToken(params.dateFrom),
        stringToken(params.dateTo),
      ] as const
    },
  },
  dashboard: {
    systemsTable(params: {
      farmId?: string | null
      stage: string
      batch?: string
      system?: string
      timePeriod?: string
      dateFrom?: string | null
      dateTo?: string | null
      includeIncomplete?: boolean
    }) {
      return [
        "systems-table",
        farmToken(params.farmId),
        params.stage,
        params.batch ?? "all",
        params.system ?? "all",
        params.timePeriod ?? "2 weeks",
        stringToken(params.dateFrom),
        stringToken(params.dateTo),
        params.includeIncomplete ?? false,
      ] as const
    },
    kpiOverview(params: {
      farmId?: string | null
      stage: string
      timePeriod: string
      batch?: string
      system?: string
      dateFrom?: string | null
      dateTo?: string | null
    }) {
      return [
        "kpi-overview",
        farmToken(params.farmId),
        params.stage,
        params.timePeriod,
        params.batch ?? "all",
        params.system ?? "all",
        stringToken(params.dateFrom),
        stringToken(params.dateTo),
      ] as const
    },
    recommendedActions(params: {
      farmId?: string | null
      stage?: string
      batch?: string
      system?: string
      timePeriod?: string
      dateFrom?: string | null
      dateTo?: string | null
    }) {
      return [
        "recommended-actions",
        farmToken(params.farmId),
        params.stage ?? "all",
        params.batch ?? "all",
        params.system ?? "all",
        params.timePeriod ?? "2 weeks",
        stringToken(params.dateFrom),
        stringToken(params.dateTo),
      ] as const
    },
    productionSummaryMetrics(params: {
      farmId?: string | null
      stage: string
      batch?: string
      system?: string
      timePeriod?: string
      dateFrom?: string | null
      dateTo?: string | null
    }) {
      return [
        "production-summary-metrics",
        farmToken(params.farmId),
        params.stage,
        params.batch ?? "all",
        params.system ?? "all",
        params.timePeriod ?? "2 weeks",
        stringToken(params.dateFrom),
        stringToken(params.dateTo),
      ] as const
    },
    productionTrend(params: {
      farmId?: string | null
      stage?: string
      batch?: string
      system?: string
      timePeriod: string
      dateFrom?: string | null
      dateTo?: string | null
    }) {
      return [
        "production-trend",
        farmToken(params.farmId),
        params.stage ?? "all",
        params.batch ?? "all",
        params.system ?? "all",
        params.timePeriod,
        stringToken(params.dateFrom),
        stringToken(params.dateTo),
      ] as const
    },
  },
  activity: {
    recentActivities(params?: {
      tableName?: string
      changeType?: string
      dateFrom?: string
      dateTo?: string
      limit?: number
    }) {
      return [
        "recent-activities",
        params?.tableName ?? "all",
        params?.changeType ?? "all",
        params?.dateFrom ?? "all",
        params?.dateTo ?? "all",
        params?.limit ?? 5,
      ] as const
    },
  },
  appConfig(keys: string[], userId?: string | null) {
    return ["app-config", userId ?? "anon", keys.join(",") || "none"] as const
  },
  farmUserRole(farmId?: string | null, userId?: string | null) {
    return ["farm-user-role", farmToken(farmId), userId ?? "anon"] as const
  },
  timePeriodBounds(params: { farmId?: string | null; timePeriod: string; systemId?: number | null; scope?: string | null }) {
    return [
      "time-period-bounds",
      farmToken(params.farmId),
      params.timePeriod,
      numberToken(params.systemId),
      params.scope ?? "dashboard",
    ] as const
  },
}
