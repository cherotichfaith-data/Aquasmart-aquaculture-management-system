"use client"

import type { ChartOptions, ScriptableContext, Tick } from "chart.js"

export function formatCompactTick(value: number | string) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  return new Intl.NumberFormat(undefined, {
    notation: Math.abs(numeric) >= 1000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(numeric) >= 1000 ? 1 : 0,
  }).format(numeric)
}

export function formatDecimalTick(value: number | string, decimals = 1) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function parseIsoDay(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, rawYear, rawMonth, rawDay] = match
  const year = Number(rawYear)
  const month = Number(rawMonth)
  const day = Number(rawDay)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  return new Date(Date.UTC(year, month - 1, day))
}

function toIsoDay(value: Date) {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-")
}

function ceilTo(value: number, step: number) {
  return Math.ceil(value / step) * step
}

function floorTo(value: number, step: number) {
  return Math.floor(value / step) * step
}

function niceStep(range: number, targetTicks = 5): number {
  if (range <= 0) return 1
  const raw = range / targetTicks
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)))
  const normalized = raw / magnitude
  const nice = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10
  return nice * magnitude
}

export function buildDailyDateDomain(values: Array<string | null | undefined>) {
  const validDates = values
    .filter((value): value is string => Boolean(value))
    .filter((value) => parseIsoDay(value) != null)
    .sort((left, right) => left.localeCompare(right))

  if (!validDates.length) return [] as string[]

  const start = parseIsoDay(validDates[0])
  const end = parseIsoDay(validDates[validDates.length - 1])
  if (!start || !end) return []

  const domain: string[] = []
  const cursor = new Date(start.getTime())
  while (cursor.getTime() <= end.getTime()) {
    domain.push(toIsoDay(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return domain
}

export function getDateAxisMaxTicks(domainLength: number) {
  if (domainLength <= 14) return domainLength
  if (domainLength <= 31) return 8
  if (domainLength <= 92) return 7
  if (domainLength <= 180) return 6
  return 5
}

export function buildMetricAxisBounds(
  values: Array<number | null | undefined>,
  options?: {
    includeZero?: boolean
    minFloor?: number
    targetTicks?: number
    padRatio?: number
    trimOutliers?: boolean
  },
): { min: number | undefined; max: number | undefined } {
  const {
    includeZero = false,
    minFloor = 0,
    targetTicks = 5,
    padRatio = 0.15,
    trimOutliers = false,
  } = options ?? {}
  const finite = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (!finite.length) {
    return { min: includeZero ? 0 : undefined, max: undefined }
  }

  let observed = [...finite].sort((left, right) => left - right)
  if (trimOutliers && observed.length > 2) {
    const q1 = observed[Math.floor(observed.length * 0.25)]
    const q3 = observed[Math.floor(observed.length * 0.75)]
    const iqr = q3 - q1
    const fence = Math.max(iqr * 1.5, 0.25)
    const lower = q1 - fence
    const upper = q3 + fence
    const inliers = observed.filter((value) => value >= lower && value <= upper)
    if (inliers.length) observed = inliers
  }

  const dataMin = observed[0]
  const dataMax = observed[observed.length - 1]
  if (dataMin === dataMax) {
    if (dataMax === 0) {
      return { min: includeZero ? 0 : minFloor, max: 1 }
    }
    const baseStep = niceStep(Math.abs(dataMax) * 0.4 || 1, targetTicks)
    const paddedMin = includeZero ? 0 : Math.max(minFloor, floorTo(dataMin - baseStep, baseStep))
    const paddedMax = ceilTo(dataMax + baseStep, baseStep)
    return { min: paddedMin, max: paddedMax }
  }

  const range = dataMax - dataMin
  const paddedRange = range * padRatio
  const step = niceStep(range + paddedRange * 2, targetTicks)
  const nextMin = includeZero ? 0 : Math.max(minFloor, floorTo(dataMin - paddedRange, step))
  const nextMax = ceilTo(dataMax + paddedRange, step)

  return {
    min: nextMin,
    max: nextMax > nextMin ? nextMax : nextMin + step,
  }
}

type ChartPalette = {
  text: string
  muted: string
  grid: string
  border: string
  card: string
  tooltipBackground: string
  tooltipBorder: string
  tooltipForeground: string
  primary: string
  chart1: string
  chart2: string
  chart3: string
  chart4: string
  chart5: string
  destructive: string
}

const FALLBACK_PALETTE: ChartPalette = {
  text: "#18324a",
  muted: "#5b7389",
  grid: "rgba(127, 140, 141, 0.18)",
  border: "#dce9f4",
  card: "#ffffff",
  tooltipBackground: "rgba(44, 62, 80, 0.94)",
  tooltipBorder: "rgba(236, 240, 241, 0.14)",
  tooltipForeground: "#f8fbff",
  primary: "#22c55e",
  chart1: "#22c55e",
  chart2: "#16a34a",
  chart3: "#2563eb",
  chart4: "#1d4ed8",
  chart5: "#1e3a8a",
  destructive: "#ef4444",
}

function readVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export function getChartPalette(): ChartPalette {
  return {
    text: readVar("--foreground", FALLBACK_PALETTE.text),
    muted: readVar("--muted-foreground", FALLBACK_PALETTE.muted),
    grid: readVar("--chart-grid", FALLBACK_PALETTE.grid),
    border: readVar("--border", FALLBACK_PALETTE.border),
    card: readVar("--card", FALLBACK_PALETTE.card),
    tooltipBackground: readVar("--chart-tooltip-bg", FALLBACK_PALETTE.tooltipBackground),
    tooltipBorder: readVar("--chart-tooltip-border", FALLBACK_PALETTE.tooltipBorder),
    tooltipForeground: readVar("--chart-tooltip-foreground", FALLBACK_PALETTE.tooltipForeground),
    primary: readVar("--primary", FALLBACK_PALETTE.primary),
    chart1: readVar("--chart-1", FALLBACK_PALETTE.chart1),
    chart2: readVar("--chart-2", FALLBACK_PALETTE.chart2),
    chart3: readVar("--chart-3", FALLBACK_PALETTE.chart3),
    chart4: readVar("--chart-4", FALLBACK_PALETTE.chart4),
    chart5: readVar("--chart-5", FALLBACK_PALETTE.chart5),
    destructive: readVar("--destructive", FALLBACK_PALETTE.destructive),
  }
}

export function withAlpha(color: string, alpha: number) {
  const normalized = color.trim()
  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1)
    const fullHex =
      hex.length === 3
        ? hex
            .split("")
            .map((char) => `${char}${char}`)
            .join("")
        : hex
    const red = Number.parseInt(fullHex.slice(0, 2), 16)
    const green = Number.parseInt(fullHex.slice(2, 4), 16)
    const blue = Number.parseInt(fullHex.slice(4, 6), 16)
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
  }

  const rgbMatch = normalized.match(/^rgb\(([^)]+)\)$/i)
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${alpha})`
  }

  const rgbaMatch = normalized.match(/^rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)$/i)
  if (rgbaMatch) {
    return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${alpha})`
  }

  return normalized
}

export function createVerticalGradient(color: string, topOpacity = 0.34, bottomOpacity = 0.03) {
  return (context: ScriptableContext<"line">) => {
    const { chart } = context
    const { ctx, chartArea } = chart
    if (!chartArea) return withAlpha(color, topOpacity)
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
    gradient.addColorStop(0, withAlpha(color, topOpacity))
    gradient.addColorStop(0.65, withAlpha(color, Math.max(bottomOpacity + 0.08, topOpacity / 3)))
    gradient.addColorStop(1, withAlpha(color, bottomOpacity))
    return gradient
  }
}

export function chartLegendOptions(
  palette: ChartPalette,
  display = true,
): any {
  return {
    display,
    position: "top",
    labels: {
      color: palette.muted,
      usePointStyle: true,
      pointStyle: "circle",
      boxWidth: 10,
      boxHeight: 10,
      padding: 14,
      font: {
        size: 11,
        weight: 500,
      },
    },
  } as any
}

export function chartTooltipOptions(
  palette: ChartPalette,
  overrides?: any,
): any {
  return {
    backgroundColor: palette.tooltipBackground,
    borderColor: palette.tooltipBorder,
    borderWidth: 1,
    titleColor: palette.tooltipForeground,
    bodyColor: palette.tooltipForeground,
    padding: 12,
    cornerRadius: 14,
    boxPadding: 6,
    usePointStyle: true,
    ...overrides,
  } as any
}

function baseTickOptions(
  palette: ChartPalette,
  formatter?: (value: number | string, index: number, ticks: Tick[]) => string,
) {
  return {
    color: palette.muted,
    padding: 10,
    font: {
      size: 11,
      weight: 500,
    },
    callback(value: number | string, index: number, ticks: Tick[]) {
      return formatter ? formatter(value, index, ticks) : String(value)
    },
  }
}

export function buildCartesianOptions<TType extends "line" | "bar" | "scatter">({
  palette,
  legend = false,
  stacked = false,
  indexAxis = "x",
  xTickFormatter,
  yTickFormatter,
  yRightTickFormatter,
  tooltip,
  xGrid = false,
  yGrid = true,
  yStacked = stacked,
  xStacked = stacked,
  yReverse = false,
  xTitle,
  yTitle,
  yRightTitle,
  xMin,
  xMax,
  xMaxTicksLimit,
  min,
  max,
  rightMin,
  rightMax,
  extraScales,
}: {
  palette: ChartPalette
  legend?: boolean
  stacked?: boolean
  indexAxis?: "x" | "y"
  xTickFormatter?: (value: number | string, index: number, ticks: Tick[]) => string
  yTickFormatter?: (value: number | string, index: number, ticks: Tick[]) => string
  yRightTickFormatter?: (value: number | string, index: number, ticks: Tick[]) => string
  tooltip?: any
  xGrid?: boolean
  yGrid?: boolean
  xStacked?: boolean
  yStacked?: boolean
  yReverse?: boolean
  xTitle?: string
  yTitle?: string
  yRightTitle?: string
  xMin?: number
  xMax?: number
  xMaxTicksLimit?: number
  min?: number
  max?: number
  rightMin?: number
  rightMax?: number
  extraScales?: Record<string, any>
}): ChartOptions<TType> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis,
    interaction: {
      mode: "index",
      intersect: false,
    },
    animation: {
      duration: 240,
    },
    elements: {
      line: {
        tension: 0.35,
        borderJoinStyle: "round",
      },
      point: {
        radius: 0,
        hoverRadius: 4,
      },
      bar: {
        borderRadius: 6,
      },
    },
    plugins: {
      legend: chartLegendOptions(palette, legend),
      tooltip: chartTooltipOptions(palette, tooltip),
    },
    scales: {
      x: {
        stacked: xStacked,
        border: {
          display: false,
        },
        grid: {
          display: xGrid,
          color: palette.grid,
          drawTicks: false,
        },
        ticks: {
          ...baseTickOptions(palette, xTickFormatter),
          ...(xMaxTicksLimit != null ? { maxTicksLimit: xMaxTicksLimit } : {}),
        },
        title: xTitle
          ? {
              display: true,
              text: xTitle,
              color: palette.muted,
              font: {
                size: 11,
                weight: 500,
              },
            }
          : undefined,
        min: xMin,
        max: xMax,
      },
      y: {
        stacked: yStacked,
        reverse: yReverse,
        border: {
          display: false,
        },
        grid: {
          display: yGrid,
          color: palette.grid,
          drawTicks: false,
        },
        ticks: baseTickOptions(palette, yTickFormatter),
        title: yTitle
          ? {
              display: true,
              text: yTitle,
              color: palette.muted,
              font: {
                size: 11,
                weight: 500,
              },
            }
          : undefined,
        min,
        max,
      },
      ...(yRightTickFormatter || yRightTitle || rightMin != null || rightMax != null
        ? {
            y1: {
              position: "right",
              border: {
                display: false,
              },
              grid: {
                drawOnChartArea: false,
                drawTicks: false,
              },
              ticks: baseTickOptions(palette, yRightTickFormatter),
              title: yRightTitle
                ? {
                    display: true,
                    text: yRightTitle,
                    color: palette.muted,
                    font: {
                      size: 11,
                      weight: 500,
                    },
                  }
                : undefined,
              min: rightMin,
              max: rightMax,
            },
          }
        : {}),
      ...(extraScales ?? {}),
    },
  } as unknown as ChartOptions<TType>
}
