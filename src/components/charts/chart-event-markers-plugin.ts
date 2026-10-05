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
  /** Rows of labels stacked above the plot so nearby events never overlap. */
  labelLanes?: number
}

/** Vertical space the chart should reserve above the plot for `lanes` rows of event labels. */
export const eventLabelTopPadding = (lanes = 3) => lanes * 20 + 8

/**
 * Draws vertical dashed event lines (stocking, transfer, harvest, ...) across the plot area. Each event's
 * label sits in a row *above* the plot (stacked in lanes so close-together events do not collide) and the
 * dashed line drops from the label to the axis, so the label is easy to read and never fights the date
 * labels along the bottom. Registered per-chart via the `plugins` prop, so only charts with events opt in.
 */
export const chartEventMarkersPlugin: Plugin<"line"> = {
  id: "chartEventMarkers",
  afterDatasetsDraw(chart, _args, pluginOptions) {
    const options = pluginOptions as ChartEventMarkersPluginOptions
    if (!options?.markers?.length) return
    const { ctx, chartArea } = chart
    if (!chartArea) return

    const lanes = options.labelLanes ?? 3
    const laneHeight = 20
    const gap = 8
    ctx.save()
    ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif"

    const positioned = options.markers
      .map((marker) => ({
        ...marker,
        x: chartArea.left + marker.t * (chartArea.right - chartArea.left),
        width: ctx.measureText(marker.label).width + 14,
      }))
      .sort((a, b) => a.x - b.x)

    const laneEnd: number[] = Array.from({ length: lanes }, () => -Infinity)
    for (const marker of positioned) {
      // Keep the label box inside the canvas while the line stays at the true date.
      const half = marker.width / 2
      const boxLeft = Math.min(Math.max(marker.x - half, 4), chart.width - marker.width - 4)
      const lane = laneEnd.findIndex((end) => boxLeft >= end + gap)
      const labelled = lane !== -1
      const boxTop = chartArea.top - (lane + 1) * laneHeight - 2

      // Dashed line: from the label (or the plot top when the label was skipped) down to the axis.
      ctx.beginPath()
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = options.lineColor
      ctx.lineWidth = 1
      ctx.moveTo(marker.x, labelled ? boxTop + 16 : chartArea.top)
      ctx.lineTo(marker.x, chartArea.bottom)
      ctx.stroke()
      ctx.setLineDash([])

      // Dot where the line meets the plot.
      ctx.beginPath()
      ctx.fillStyle = marker.color
      ctx.arc(marker.x, chartArea.top, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = options.cardColor
      ctx.stroke()

      if (labelled) {
        laneEnd[lane] = boxLeft + marker.width
        ctx.fillStyle = options.cardColor
        ctx.strokeStyle = marker.color
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(boxLeft, boxTop, marker.width, 16, 6)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = marker.color
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(marker.label, boxLeft + marker.width / 2, boxTop + 8.5)
      }
    }
    ctx.restore()
  },
}
