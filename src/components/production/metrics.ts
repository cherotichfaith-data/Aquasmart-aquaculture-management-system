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
    decimals: 1,
  },
  density: {
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

export const PRODUCTION_METRIC_OPTIONS: Array<{ value: ProductionMetric; label: string }> =
  Object.entries(PRODUCTION_METRICS).map(([value, config]) => ({
    value: value as ProductionMetric,
    label: config.label,
  }))

export function parseProductionMetric(value?: string | null): ProductionMetric {
  if (value && Object.prototype.hasOwnProperty.call(PRODUCTION_METRICS, value)) {
    return value as ProductionMetric
  }
  return "efcr_periodic"
}
