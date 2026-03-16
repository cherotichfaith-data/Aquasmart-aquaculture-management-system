export const cacheTags = {
  farm: (farmId: string) => `farm:${farmId}`,
  systems: (farmId: string) => `systems:${farmId}`,
  inventory: (farmId: string) => `inventory:${farmId}`,
  feeding: (farmId: string, systemId?: number | null) =>
    systemId != null ? `feeding:${farmId}:${systemId}` : `feeding:${farmId}`,
  stocking: (farmId: string, systemId?: number | null) =>
    systemId != null ? `stocking:${farmId}:${systemId}` : `stocking:${farmId}`,
  waterQuality: (farmId: string, systemId?: number | null) =>
    systemId != null ? `water-quality:${farmId}:${systemId}` : `water-quality:${farmId}`,
  reports: (farmId: string, reportName?: string | null) =>
    reportName ? `reports:${farmId}:${reportName}` : `reports:${farmId}`,
  dataEntry: (farmId: string) => `data-entry:${farmId}`,
} as const

export function getSystemScopedTags(params: { farmId: string; systemId?: number | null }) {
  return [
    cacheTags.farm(params.farmId),
    cacheTags.systems(params.farmId),
    cacheTags.inventory(params.farmId),
    cacheTags.dataEntry(params.farmId),
    cacheTags.feeding(params.farmId, params.systemId),
    cacheTags.stocking(params.farmId, params.systemId),
    cacheTags.waterQuality(params.farmId, params.systemId),
  ]
}
