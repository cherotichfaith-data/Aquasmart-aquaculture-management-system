export const chartAxisTick = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 11,
  fontWeight: 500,
}

export const chartGridProps = {
  stroke: "hsl(var(--border))",
  strokeDasharray: "2 6",
  opacity: 0.22,
  vertical: false,
}

export const chartXAxisProps = {
  axisLine: false,
  tickLine: false,
  minTickGap: 24,
  tickMargin: 10,
  tick: chartAxisTick,
}

export const chartYAxisProps = {
  axisLine: false,
  tickLine: false,
  tickMargin: 10,
  tick: chartAxisTick,
}

export const chartLegendProps = {
  wrapperStyle: {
    paddingTop: 12,
    fontSize: "11px",
    fontWeight: 500,
    color: "hsl(var(--muted-foreground))",
  },
}

export const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card) / 0.92)",
  border: "1px solid hsl(var(--border) / 0.18)",
  borderRadius: "16px",
  boxShadow: "0 20px 42px -30px rgba(15, 23, 32, 0.5)",
  backdropFilter: "blur(16px)",
  padding: "10px 12px",
  color: "hsl(var(--foreground))",
}

export const chartTooltipLabelStyle = {
  color: "hsl(var(--foreground))",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.01em",
  marginBottom: "4px",
}

export const chartTooltipItemStyle = {
  color: "hsl(var(--foreground))",
  fontSize: "11px",
  fontWeight: 500,
}
