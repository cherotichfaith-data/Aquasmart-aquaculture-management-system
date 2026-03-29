import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sortByDateAsc<T>(rows: T[], getDate: (row: T) => string | null | undefined): T[] {
  return [...rows].sort((a, b) => String(getDate(a) ?? "").localeCompare(String(getDate(b) ?? "")))
}
