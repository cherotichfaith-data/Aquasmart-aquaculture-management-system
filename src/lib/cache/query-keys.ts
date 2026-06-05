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
      return ["options", "systems", farmToken(params?.farmId), params?.stage ?? "all", params?.activeOnly ?? true] as const
    },
    batches(params?: { farmId?: string | null; activeOnly?: boolean }) {
      return ["options", "batches", farmToken(params?.farmId), params?.activeOnly ?? true] as const
    },
    timePeriods() {
      return ["options", "time-periods"] as const
    },
    feeds(
      farmId?: string | null,
      userId?: string | null,
      scope?: { dateFrom?: string | null; dateTo?: string | null; inventoryOnly?: boolean },
    ) {
      return [
        "options",
        "feeds",
        farmToken(farmId),
        userId ?? "anon",
        scope?.inventoryOnly ? "inventory-week" : "all",
        stringToken(scope?.dateFrom),
        stringToken(scope?.dateTo),
      ] as const
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
  production: {
    summary(params?: {
      farmId?: string | null
      systemId?: number
      stage?: string | null
      dateFrom?: string
      dateTo?: string
      limit?: number
    }) {
      return [
        "production",
        "summary",
        farmToken(params?.farmId),
        numberToken(params?.systemId),
        params?.stage ?? "all",
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
        params?.limit ?? 50,
      ] as const
    },
    summaryMetrics(params: {
      farmId?: string | null
      stage: string
      batch?: string
      system?: string
      timePeriod?: string
      dateFrom?: string | null
      dateTo?: string | null
    }) {
      return [
        "production",
        "summary-metrics",
        farmToken(params.farmId),
        params.stage,
        params.batch ?? "all",
        params.system ?? "all",
        params.timePeriod ?? "2 weeks",
        stringToken(params.dateFrom),
        stringToken(params.dateTo),
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
    efcrTrend(params?: {
      farmId?: string | null
      systemIds?: number[]
      dateFrom?: string
      dateTo?: string
    }) {
      return [
        "reports",
        "efcr-trend",
        farmToken(params?.farmId),
        params?.systemIds?.join(",") ?? "",
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
      ] as const
    },
    growthTrend(params?: {
      farmId?: string | null
      systemIds?: number[]
      dateFrom?: string
      dateTo?: string
      days?: number
    }) {
      return [
        "reports",
        "growth-trend",
        farmToken(params?.farmId),
        params?.systemIds?.join(",") ?? "",
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
        params?.days ?? 180,
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
  },
  waterQuality: {
    latestStatus(params?: { farmId?: string | null; systemId?: number | null }) {
      return ["wq", "latest_status", farmToken(params?.farmId), params?.systemId ?? null] as const
    },
    measurements(params?: {
      farmId?: string | null
      systemId?: number | null
      dateFrom?: string | null
      dateTo?: string | null
      parameterName?: string | null
      limit?: number | null
    }) {
      return [
        "wq",
        "measurements",
        farmToken(params?.farmId),
        params?.systemId ?? null,
        params?.dateFrom ?? null,
        params?.dateTo ?? null,
        params?.parameterName ?? null,
        params?.limit ?? null,
      ] as const
    },
    dailyRating(params?: {
      farmId?: string | null
      systemId?: number | null
      dateFrom?: string | null
      dateTo?: string | null
      limit?: number | null
    }) {
      return [
        "wq",
        "daily_rating",
        farmToken(params?.farmId),
        params?.systemId ?? null,
        params?.dateFrom ?? null,
        params?.dateTo ?? null,
        params?.limit ?? null,
      ] as const
    },
    thresholds(farmId?: string | null) {
      return ["wq", "thresholds", farmToken(farmId)] as const
    },
  },
  dashboard: {
    systemsOverview(farmId?: string | null) {
      return ["systems-overview", farmToken(farmId)] as const
    },
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
  settings: {
    load(userId?: string | null, farmId?: string | null, thresholdDenied = false) {
      return ["settings", "load", userId ?? "anon", farmId ?? "no-farm", thresholdDenied] as const
    },
    members(farmId?: string | null) {
      return ["settings", "members", farmToken(farmId)] as const
    },
    pendingInvites(farmId?: string | null) {
      return ["settings", "pending-invites", farmToken(farmId)] as const
    },
  },
  activity: {
    recentActivities(params?: {
      farmId?: string | null
      tableName?: string
      changeType?: string
      dateFrom?: string
      dateTo?: string
      limit?: number
    }) {
      return [
        "recent-activities",
        farmToken(params?.farmId),
        params?.tableName ?? "all",
        params?.changeType ?? "all",
        params?.dateFrom ?? "all",
        params?.dateTo ?? "all",
        params?.limit ?? 5,
      ] as const
    },
  },
  onboarding: {
    state(userId?: string | null, linkedFarmId?: string | null) {
      return ["onboarding", "state", userId ?? "anon", linkedFarmId ?? "none"] as const
    },
  },
  analytics: {
    harvestForecast(params: { farmId?: string | null; systemId?: number }) {
      return ["analytics", "harvest-forecast", farmToken(params.farmId), numberToken(params.systemId)] as const
    },
    cycleBenchmarks(params: { farmId?: string | null; systemId?: number }) {
      return ["analytics", "cycle-benchmarks", farmToken(params.farmId), numberToken(params.systemId)] as const
    },
    recommendedActions(params: { farmId?: string | null; systemId?: number; systemIds?: number[] | null }) {
      return [
        "analytics",
        "recommended-actions",
        farmToken(params.farmId),
        numberToken(params.systemId),
        params.systemIds?.join(",") ?? "all-systems",
      ] as const
    },
    fcrIntervals(params: { farmId?: string | null; systemId?: number; dateFrom?: string; dateTo?: string }) {
      return ["analytics", "fcr-intervals", farmToken(params.farmId), numberToken(params.systemId), params.dateFrom ?? null, params.dateTo ?? null] as const
    },
    feedRateAnalysis(params: { farmId?: string | null; systemId?: number; systemIds?: number[] | null; dateFrom?: string; dateTo?: string }) {
      return [
        "analytics",
        "feed-rate-analysis",
        farmToken(params.farmId),
        numberToken(params.systemId),
        params.systemIds?.join(",") ?? "all-systems",
        params.dateFrom ?? null,
        params.dateTo ?? null,
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
