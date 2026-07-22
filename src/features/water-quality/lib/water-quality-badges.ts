export function ratingBadgeClass(rating: string | null | undefined) {
  const key = String(rating ?? "").toLowerCase()
  if (key === "optimal") return "bg-success/10 text-success"
  if (key === "acceptable") return "bg-warning/10 text-warning"
  if (key === "critical") return "bg-warning/10 text-warning"
  if (key === "lethal") return "bg-destructive/10 text-destructive"
  return "bg-muted/50 text-muted-foreground"
}

export function actionBadgeClass(action: string) {
  if (action === "Escalate") return "bg-destructive/10 text-destructive"
  if (action === "Investigate") return "bg-warning/10 text-warning"
  if (action === "Watch") return "bg-warning/10 text-warning"
  return "bg-success/10 text-success"
}
