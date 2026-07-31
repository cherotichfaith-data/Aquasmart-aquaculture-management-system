export type SemanticTone = "good" | "warn" | "bad" | "info" | "neutral"

export function getSemanticColor(tone: SemanticTone) {
  if (tone === "good") return "var(--success)"
  if (tone === "warn") return "var(--warning)"
  if (tone === "bad") return "var(--destructive)"
  if (tone === "info") return "var(--info)"
  return "var(--muted-foreground)"
}

