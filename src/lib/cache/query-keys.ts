const farmToken = (farmId?: string | null) => farmId ?? "all"
const numberToken = (value?: number | null, fallback = "all") => value ?? fallback
const stringToken = (value?: string | null, fallback = "") => value ?? fallback

export const queryKeys = {
  options: {
    systems(params?: {
      farmId?: string | null
      stage?: string | null
      activeOnly?: boolean
      userId?: string | null
    }) {
      return [
        "options",
        "systems",
        params?.userId ?? "anon",
        farmToken(params?.farmId),
        params?.stage ?? "all",
        params?.activeOnly ?? true,
      ] as const
    },
    batches(params?: { farmId?: string | null; activeOnly?: boolean; userId?: string | null }) {
      return [
        "options",
        "batches",
        params?.userId ?? "anon",
        farmToken(params?.farmId),
        params?.activeOnly ?? true,
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
    periodView(params: {
      farmId?: string | null
      stage?: string
      batch?: string
      system?: string
      timePeriod?: string
      dateFrom?: string | null
      dateTo?: string | null
      scopedSystemIds?: number[] | null
      consolidate?: boolean
    }) {
      return [
        "production",
        "period-view",
        farmToken(params.farmId),
        params.stage,
        params.batch ?? "all",
        params.system ?? "all",
        params.timePeriod ?? "month",
        stringToken(params.dateFrom),
        stringToken(params.dateTo),
        params.scopedSystemIds?.join(",") ?? "all-systems",
        params.consolidate ?? false,
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
      scopedSystemIds?: number[] | null
    }) {
      return [
        "production",
        "summary-metrics",
        farmToken(params.farmId),
        params.stage,
        params.batch ?? "all",
        params.system ?? "all",
        params.timePeriod ?? "month",
        stringToken(params.dateFrom),
        stringToken(params.dateTo),
        params.scopedSystemIds?.join(",") ?? "all-systems",
      ] as const
    },
  },
  feedManagement: {
    kpis(params?: {
      farmId?: string | null
      systemIds?: number[] | null
      dateFrom?: string | null
      dateTo?: string | null
    }) {
      return [
        "feed-management",
        "kpis",
        farmToken(params?.farmId),
        params?.systemIds?.join(",") ?? "all-systems",
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
      ] as const
    },
    planVsActual(params?: {
      farmId?: string | null
      systemIds?: number[] | null
      dateFrom?: string | null
      dateTo?: string | null
    }) {
      return [
        "feed-management",
        "plan-vs-actual",
        farmToken(params?.farmId),
        params?.systemIds?.join(",") ?? "all-systems",
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
      ] as const
    },
    systemStatus(params?: {
      farmId?: string | null
      systemIds?: number[] | null
      dateFrom?: string | null
      dateTo?: string | null
    }) {
      return [
        "feed-management",
        "system-status",
        farmToken(params?.farmId),
        params?.systemIds?.join(",") ?? "all-systems",
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
      ] as const
    },
    efcrTrend(params?: {
      farmId?: string | null
      systemIds?: number[] | null
      dateFrom?: string | null
      dateTo?: string | null
    }) {
      return [
        "feed-management",
        "efcr-trend",
        farmToken(params?.farmId),
        params?.systemIds?.join(",") ?? "all-systems",
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
      ] as const
    },
    feedingRateVsTarget(params?: {
      farmId?: string | null
      systemIds?: number[] | null
      dateFrom?: string | null
      dateTo?: string | null
    }) {
      return [
        "feed-management",
        "feeding-rate-vs-target",
        farmToken(params?.farmId),
        params?.systemIds?.join(",") ?? "all-systems",
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
      ] as const
    },
    feedingResponse(params?: {
      farmId?: string | null
      systemIds?: number[] | null
      dateFrom?: string | null
      dateTo?: string | null
    }) {
      return [
        "feed-management",
        "feeding-response",
        farmToken(params?.farmId),
        params?.systemIds?.join(",") ?? "all-systems",
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
      ] as const
    },
    feedVsBiomassGain(params?: {
      farmId?: string | null
      systemIds?: number[] | null
      dateFrom?: string | null
      dateTo?: string | null
    }) {
      return [
        "feed-management",
        "feed-vs-biomass-gain",
        farmToken(params?.farmId),
        params?.systemIds?.join(",") ?? "all-systems",
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
      ] as const
    },
    alerts(params?: {
      farmId?: string | null
      systemIds?: number[] | null
      dateFrom?: string | null
      dateTo?: string | null
    }) {
      return [
        "feed-management",
        "alerts",
        farmToken(params?.farmId),
        params?.systemIds?.join(",") ?? "all-systems",
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
      ] as const
    },
  },
  reports: {
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
    feedingActivity(params?: {
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
        "feeding-activity",
        farmToken(params?.farmId),
        numberToken(params?.systemId),
        params?.systemIds?.join(",") ?? "all-systems",
        numberToken(params?.batchId),
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
        params?.limit ?? 100,
      ] as const
    },
    feedingSummary(params?: {
      farmId?: string | null
      systemId?: number
      batchId?: number
      dateFrom?: string
      dateTo?: string
    }) {
      return [
        "reports",
        "feeding-summary",
        farmToken(params?.farmId),
        numberToken(params?.systemId),
        numberToken(params?.batchId),
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
      ] as const
    },
    performanceSummary(params?: {
      farmId?: string | null
      systemId?: number
      stage?: string | null
      dateFrom?: string
      dateTo?: string
    }) {
      return [
        "reports",
        "performance-summary",
        farmToken(params?.farmId),
        numberToken(params?.systemId),
        params?.stage ?? "all",
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
      ] as const
    },
    feedingBreakdown(params?: {
      farmId?: string | null
      systemId?: number
      batchId?: number
      dateFrom?: string
      dateTo?: string
    }) {
      return [
        "reports",
        "feeding-breakdown",
        farmToken(params?.farmId),
        numberToken(params?.systemId),
        numberToken(params?.batchId),
        stringToken(params?.dateFrom),
        stringToken(params?.dateTo),
      ] as const
    },
    performanceRecords(params?: {
      farmId?: string | null
      systemId?: number
      stage?: string | null
      dateFrom?: string
      dateTo?: string
      limit?: number
    }) {
      return [
        "reports",
        "performance-records",
        farmToken(params?.farmId),
        numberToken(params?.systemId),
        params?.stage ?? "all",
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
      systemId?: number
      systemIds?: number[]
      batchId?: number
      dateFrom?: string
      dateTo?: string
      limit?: number
    }) {
      return [
        "reports",
        "transfer",
        farmToken(params?.farmId),
        numberToken(params?.systemId),
        params?.systemIds?.join(",") ?? "all-systems",
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
  waterQuality: {
    latestStatus(params?: { farmId?: string | null; systemId?: number | null }) {
      return ["wq", "latest_status", farmToken(params?.farmId), params?.systemId ?? null] as const
    },
    measurements(params?: {
      farmId?: string | null
      systemId?: number | null
      dateFrom?: string | null
      dateTo?: string | null
      waterDepth?: number | null
      parameterName?: string | null
      limit?: number | null
      latestFirst?: boolean | null
    }) {
      return [
        "wq",
        "measurements",
        farmToken(params?.farmId),
        params?.systemId ?? null,
        params?.dateFrom ?? null,
        params?.dateTo ?? null,
        params?.waterDepth ?? null,
        params?.parameterName ?? null,
        params?.limit ?? null,
        params?.latestFirst ?? false,
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
    /** Single-call dashboard payload (api_dashboard RPC). */
    payload(params: {
      farmId?: string | null
      timePeriod?: string
      /** `custom_YYYY-MM-DD_YYYY-MM-DD` url token when a custom range is active. */
      custom?: string | null
      systemId?: number | null
      batchId?: number | null
      stage?: string | null
      /** Batches-view toggle: must vary the key so switching views refetches with `batches` populated. */
      includeBatches?: boolean
    }) {
      return [
        "dashboard",
        "payload",
        farmToken(params.farmId),
        params.custom ?? params.timePeriod ?? "month",
        numberToken(params.systemId),
        numberToken(params.batchId),
        params.stage ?? "all",
        params.includeBatches ?? false,
      ] as const
    },
      systems(params?: {
        farmId?: string | null
        stage?: string | null
        systemId?: number | null
        systemIds?: number[] | null
        dateFrom?: string | null
        dateTo?: string | null
      }) {
        return [
          "dashboard",
          "systems",
          farmToken(params?.farmId),
          params?.stage ?? "all",
          numberToken(params?.systemId),
          params?.systemIds?.join(",") ?? "all-systems",
          stringToken(params?.dateFrom),
          stringToken(params?.dateTo),
        ] as const
      },
      batches(params?: {
        farmId?: string | null
        stage?: string | null
        batchIds?: number[] | null
        dateFrom?: string | null
        dateTo?: string | null
      }) {
        return [
          "dashboard",
          "batches",
          farmToken(params?.farmId),
          params?.stage ?? "all",
          params?.batchIds?.join(",") ?? "all-batches",
          stringToken(params?.dateFrom),
          stringToken(params?.dateTo),
        ] as const
      },
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
      scopedSystemIds?: number[] | null
    }) {
      return [
        "systems-table",
        farmToken(params.farmId),
        params.stage,
        params.batch ?? "all",
        params.system ?? "all",
        params.timePeriod ?? "month",
        stringToken(params.dateFrom),
        stringToken(params.dateTo),
        params.includeIncomplete ?? false,
        params.scopedSystemIds?.join(",") ?? "all-systems",
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
      scopedSystemIds?: number[] | null
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
        params.scopedSystemIds?.join(",") ?? "all-systems",
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
      scopedSystemIds?: number[] | null
    }) {
      return [
        "recommended-actions",
        farmToken(params.farmId),
        params.stage ?? "all",
        params.batch ?? "all",
        params.system ?? "all",
        params.timePeriod ?? "month",
        stringToken(params.dateFrom),
        stringToken(params.dateTo),
        params.scopedSystemIds?.join(",") ?? "all-systems",
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
      scopedSystemIds?: number[] | null
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
        params.scopedSystemIds?.join(",") ?? "all-systems",
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
    recommendedActions(params: { farmId?: string | null; systemId?: number; systemIds?: number[] | null }) {
      return [
        "analytics",
        "recommended-actions",
        farmToken(params.farmId),
        numberToken(params.systemId),
        params.systemIds?.join(",") ?? "all-systems",
      ] as const
    },
  },
  appConfig(keys: string[], userId?: string | null) {
    return ["app-config", userId ?? "anon", keys.join(",") || "none"] as const
  },
  farmUserRole(farmId?: string | null, userId?: string | null) {
    return ["farm-user-role", farmToken(farmId), userId ?? "anon"] as const
  },
  timePeriodBounds(params: {
    farmId?: string | null
    timePeriod: string
    /** `custom_YYYY-MM-DD_YYYY-MM-DD` url token when a custom range is active. */
    custom?: string | null
    systemId?: number | null
    batchId?: number | null
    scope?: string | null
  }) {
    return [
      "time-period-bounds",
      farmToken(params.farmId),
      params.custom ?? params.timePeriod,
      numberToken(params.systemId),
      numberToken(params.batchId),
      params.scope ?? "dashboard",
    ] as const
  },
}
