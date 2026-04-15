export type SemanticTone = "good" | "warn" | "bad" | "info" | "neutral"

export function getSemanticColor(tone: SemanticTone) {
  if (tone === "good") return "var(--success)"
  if (tone === "warn") return "var(--warning)"
  if (tone === "bad") return "var(--destructive)"
  if (tone === "info") return "var(--info)"
  return "var(--muted-foreground)"
}

export function getSemanticTextClass(tone: SemanticTone) {
  if (tone === "good") return "text-success"
  if (tone === "warn") return "text-warning"
  if (tone === "bad") return "text-destructive"
  if (tone === "info") return "text-info"
  return "text-muted-foreground"
}

export function getSemanticBadgeClass(tone: Exclude<SemanticTone, "neutral">) {
  if (tone === "good") return "border-success/25 bg-success/15 text-success-foreground"
  if (tone === "warn") return "border-warning/25 bg-warning/15 text-warning-foreground"
  if (tone === "bad") return "border-destructive/25 bg-destructive/15 text-destructive"
  return "border-info/25 bg-info/15 text-info-foreground"
}

export function getSemanticCalloutClass(tone: Exclude<SemanticTone, "neutral">) {
  if (tone === "good") return "border-success/35 bg-success/10 text-success-foreground"
  if (tone === "warn") return "border-warning/35 bg-warning/10 text-warning-foreground"
  if (tone === "bad") return "border-destructive/35 bg-destructive/10 text-destructive"
  return "border-info/35 bg-info/10 text-info-foreground"
}
