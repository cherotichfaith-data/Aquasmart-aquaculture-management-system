export const PRODUCTION_METRICS = {
  efcr_periodic: {
    label: "eFCR periodic",
    unit: "",
    decimals: 2,
  },
  efcr_aggregated: {
    label: "eFCR aggregated",
    unit: "",
    decimals: 2,
  },
  abw: {
    label: "ABW",
    unit: "g",
    decimals: 0,
  },
  mortality: {
    label: "Daily mortality rate",
    unit: "%",
    decimals: 2,
  },
  biomass_increase: {
    label: "Biomass increase",
    unit: "kg",
    decimals: 1,
  },
  density: {
    label: "Density",
    unit: "kg/m3",
    decimals: 1,
  },
  feeding: {
    label: "Feeding rate",
    unit: "%",
    decimals: 2,
  },
} as const

export type ProductionMetric = keyof typeof PRODUCTION_METRICS

export const PRODUCTION_METRIC_OPTIONS: Array<{ value: ProductionMetric; label: string }> = [
  { value: "efcr_periodic", label: PRODUCTION_METRICS.efcr_periodic.label },
  { value: "efcr_aggregated", label: PRODUCTION_METRICS.efcr_aggregated.label },
  { value: "mortality", label: PRODUCTION_METRICS.mortality.label },
  { value: "biomass_increase", label: PRODUCTION_METRICS.biomass_increase.label },
  { value: "abw", label: PRODUCTION_METRICS.abw.label },
  { value: "feeding", label: PRODUCTION_METRICS.feeding.label },
  { value: "density", label: PRODUCTION_METRICS.density.label },
]

export function parseProductionMetric(value?: string | null): ProductionMetric {
  if (value === "efcr") return "efcr_periodic"
  if (value === "feeding_rate") return "feeding"
  if (value === "biomass_density") return "density"
  if (value === "biomass") return "biomass_increase"
  if (value && Object.prototype.hasOwnProperty.call(PRODUCTION_METRICS, value)) {
    return value as ProductionMetric
  }
  return "efcr_periodic"
}
