import type { Plugin } from "chart.js"

export type ChartEventMarker = {
  /** Fractional position (0..1) along the plot's horizontal span. Computed
   * from real elapsed time between the first and last plotted date rather
   * than snapped to the nearest data point, so an event on a day with no
   * data row still lands where it actually happened. */
  t: number
  color: string
  label: string
}

export type ChartEventMarkersPluginOptions = {
  markers: ChartEventMarker[]
  lineColor: string
  cardColor: string
  labelMinGapPx?: number
}

/**
 * Draws vertical dashed event lines (stocking, harvest, ...) across the plot
 * area, with a colored dot at the bottom and a label when there's room --
 * the one thing the shared Chart.js theme didn't already cover, since it's
 * an annotation over the data rather than a data series itself. Registered
 * per-chart via the `plugins` prop (not globally), so only charts that
 * actually have events opt in.
 */
export const chartEventMarkersPlugin: Plugin<"line"> = {
  id: "chartEventMarkers",
  afterDatasetsDraw(chart, _args, pluginOptions) {
    const options = pluginOptions as ChartEventMarkersPluginOptions
    if (!options?.markers?.length) return
    const { ctx, chartArea } = chart
    if (!chartArea) return

    const minGap = options.labelMinGapPx ?? 64
    const positioned = options.markers
      .map((marker) => ({
        ...marker,
        x: chartArea.left + marker.t * (chartArea.right - chartArea.left),
      }))
      .sort((a, b) => a.x - b.x)

    ctx.save()
    let visibleLabelEnd = -Infinity
    for (const marker of positioned) {
      ctx.beginPath()
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = options.lineColor
      ctx.lineWidth = 1
      ctx.moveTo(marker.x, chartArea.top)
      ctx.lineTo(marker.x, chartArea.bottom)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.beginPath()
      ctx.fillStyle = marker.color
      ctx.arc(marker.x, chartArea.bottom, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = options.cardColor
      ctx.stroke()

      const showLabel = marker.x - visibleLabelEnd >= minGap
      if (showLabel) {
        ctx.fillStyle = marker.color
        ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "top"
        ctx.fillText(marker.label, marker.x, chartArea.bottom + 8)
        visibleLabelEnd = marker.x + minGap
      }
    }
    ctx.restore()
  },
}
