export const PRODUCTION_METRICS = {
  efcr: {
    label: "eFCR",
    unit: "",
    decimals: 2,
  },
  abw: {
    label: "ABW",
    unit: "g",
    decimals: 1,
  },
  sgr: {
    label: "SGR",
    unit: "%/day",
    decimals: 2,
  },
  mortality: {
    label: "Mortality",
    unit: "fish",
    decimals: 0,
  },
  biomass_density: {
    label: "Biomass density",
    unit: "kg/m3",
    decimals: 2,
  },
  biomass: {
    label: "Biomass",
    unit: "kg",
    decimals: 1,
  },
  feeding_rate: {
    label: "Feeding rate",
    unit: "% BW/day",
    decimals: 2,
  },
} as const

export type ProductionMetric = keyof typeof PRODUCTION_METRICS

export const PRODUCTION_METRIC_OPTIONS: Array<{ value: ProductionMetric; label: string }> = [
  { value: "efcr", label: PRODUCTION_METRICS.efcr.label },
  { value: "biomass", label: PRODUCTION_METRICS.biomass.label },
  { value: "abw", label: PRODUCTION_METRICS.abw.label },
  { value: "mortality", label: PRODUCTION_METRICS.mortality.label },
  { value: "feeding_rate", label: PRODUCTION_METRICS.feeding_rate.label },
  { value: "biomass_density", label: PRODUCTION_METRICS.biomass_density.label },
  { value: "sgr", label: PRODUCTION_METRICS.sgr.label },
]

export function parseProductionMetric(value?: string | null): ProductionMetric {
  if (value && Object.prototype.hasOwnProperty.call(PRODUCTION_METRICS, value)) {
    return value as ProductionMetric
  }
  return "efcr"
}
