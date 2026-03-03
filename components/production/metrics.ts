export const PRODUCTION_METRICS = {
  efcr_periodic: {
    label: "eFCR periodic",
    unit: "",
    decimals: 2,
    source: "summary",
  },
  efcr_aggregated: {
    label: "eFCR aggregated",
    unit: "",
    decimals: 2,
    source: "summary",
  },
  mortality: {
    label: "Mortality rate",
    unit: "rate/day",
    decimals: 4,
    source: "inventory",
  },
  abw: {
    label: "ABW",
    unit: "g",
    decimals: 1,
    source: "summary",
  },
  feeding: {
    label: "Feeding rate",
    unit: "kg/t",
    decimals: 2,
    source: "inventory",
  },
  density: {
    label: "Biomass density",
    unit: "kg/m3",
    decimals: 2,
    source: "inventory",
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
