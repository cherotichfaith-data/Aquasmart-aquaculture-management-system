/** Entry dates and clock times are wall-clock values in the operator device timezone. */
export function entryDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
export function entryQuarterHour(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(Math.floor(date.getMinutes() / 15) * 15).padStart(2, "0")}`
}
