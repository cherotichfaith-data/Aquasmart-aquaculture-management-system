export function ratingBadgeClass(rating: string | null | undefined) {
  const key = String(rating ?? "").toLowerCase()
  if (key === "optimal") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
  if (key === "acceptable") return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
  if (key === "critical") return "bg-orange-500/10 text-orange-700 dark:text-orange-300"
  if (key === "lethal") return "bg-red-500/10 text-red-600 dark:text-red-300"
  return "bg-muted/50 text-muted-foreground"
}

export function actionBadgeClass(action: string) {
  if (action === "Escalate") return "bg-red-500/10 text-red-600 dark:text-red-300"
  if (action === "Investigate") return "bg-orange-500/10 text-orange-700 dark:text-orange-300"
  if (action === "Watch") return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
  return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
}
