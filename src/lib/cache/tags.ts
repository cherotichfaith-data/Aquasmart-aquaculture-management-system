export const cacheTags = {
  feedSuppliers: () => "options:feed-suppliers",
  feedTypes: () => "options:feed-types",
  fingerlingSuppliers: () => "options:fingerling-suppliers",
  batchOptions: (farmId: string) => `options:batches:${farmId}`,
  farmOptions: (userId: string) => `farm-options:${userId}`,
  farm: (farmId: string) => `farm:${farmId}`,
  systems: (farmId: string) => `systems:${farmId}`,
  inventory: (farmId: string) => `inventory:${farmId}`,
  dashboard: (farmId: string) => `dashboard:${farmId}`,
  waterQuality: (farmId: string) => `water-quality:${farmId}`,
  feeding: (farmId: string, systemId?: number | null) =>
    systemId == null ? `feeding:${farmId}` : `feeding:${farmId}:${systemId}`,
  reports: (farmId: string, reportName: string) => `reports:${farmId}:${reportName}`,
}

export function feedingWriteTags(params: { farmId: string; systemId: number }) {
  return [
    cacheTags.farm(params.farmId),
    cacheTags.systems(params.farmId),
    cacheTags.inventory(params.farmId),
    cacheTags.dashboard(params.farmId),
    cacheTags.feeding(params.farmId),
    cacheTags.feeding(params.farmId, params.systemId),
    cacheTags.reports(params.farmId, "feeding"),
    cacheTags.reports(params.farmId, "recent-entries"),
  ]
}

export function inventoryWriteTags(params: { farmId: string; systemId: number; includeProduction?: boolean }) {
  return [
    cacheTags.farm(params.farmId),
    cacheTags.systems(params.farmId),
    cacheTags.inventory(params.farmId),
    cacheTags.dashboard(params.farmId),
    cacheTags.feeding(params.farmId),
    cacheTags.feeding(params.farmId, params.systemId),
    cacheTags.reports(params.farmId, "recent-entries"),
    ...(params.includeProduction ? [cacheTags.reports(params.farmId, "production")] : []),
  ]
}

export function waterQualityWriteTags(params: { farmId: string }) {
  return [
    cacheTags.farm(params.farmId),
    cacheTags.systems(params.farmId),
    cacheTags.dashboard(params.farmId),
    cacheTags.waterQuality(params.farmId),
    cacheTags.reports(params.farmId, "recent-entries"),
  ]
}

export function feedInventoryWriteTags(params: { farmId: string }) {
  return [
    cacheTags.farm(params.farmId),
    cacheTags.inventory(params.farmId),
    cacheTags.dashboard(params.farmId),
    cacheTags.reports(params.farmId, "recent-entries"),
    cacheTags.reports(params.farmId, "feed-inventory"),
  ]
}
