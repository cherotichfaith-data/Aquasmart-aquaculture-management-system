export const PRODUCTION_METRICS = {
  biomass: {
    label: "Biomass",
    unit: "kg",
    decimals: 0,
  },
  efcr: {
    label: "eFCR",
    unit: "",
    decimals: 2,
  },
  mortality: {
    label: "Daily mortality rate",
    unit: "%",
    decimals: 2,
  },
  feeding: {
    label: "Feeding rate",
    unit: "%",
    decimals: 2,
  },
  density: {
    label: "Density",
    unit: "kg/m3",
    decimals: 1,
  },
  abw: {
    label: "ABW",
    unit: "g",
    decimals: 0,
  },
} as const

export type ProductionMetric = keyof typeof PRODUCTION_METRICS

export const PRODUCTION_METRIC_OPTIONS: Array<{ value: ProductionMetric; label: string }> = [
  { value: "biomass", label: PRODUCTION_METRICS.biomass.label },
  { value: "efcr", label: PRODUCTION_METRICS.efcr.label },
  { value: "mortality", label: PRODUCTION_METRICS.mortality.label },
  { value: "feeding", label: PRODUCTION_METRICS.feeding.label },
  { value: "density", label: PRODUCTION_METRICS.density.label },
  { value: "abw", label: PRODUCTION_METRICS.abw.label },
]

export function parseProductionMetric(value?: string | null): ProductionMetric {
  // Back-compat aliases for the old 7-metric URL scheme.
  if (value === "efcr_periodic" || value === "efcr_aggregated") return "efcr"
  if (value === "biomass_increase") return "biomass"
  if (value === "feeding_rate") return "feeding"
  if (value === "biomass_density") return "density"
  if (value && Object.prototype.hasOwnProperty.call(PRODUCTION_METRICS, value)) {
    return value as ProductionMetric
  }
  return "efcr"
}

export function parseProductionCompareMetric(
  value: string | null | undefined,
  primaryMetric: ProductionMetric,
): ProductionMetric | null {
  if (!value) return null
  const resolved = parseProductionMetric(value)
  if (resolved === primaryMetric) return null
  return resolved
}
