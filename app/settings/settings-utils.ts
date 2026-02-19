export type SettingsFormState = {
  farmName: string
  location: string
  owner: string
  email: string
  phone: string
  role: string
  lowDoThreshold: number
  highAmmoniaThreshold: number
  highMortalityThreshold: number
}

export const DEFAULT_SETTINGS: SettingsFormState = {
  farmName: "AquaSmart Farm 1",
  location: "Lake Zone - Kimbwela",
  owner: "John Doe",
  email: "john@aquafarm.com",
  phone: "+255 123 456 789",
  role: "farm_manager",
  lowDoThreshold: 4.0,
  highAmmoniaThreshold: 0.05,
  highMortalityThreshold: 2.0,
}

export const hasActionableSbError = (err: unknown) => {
  if (!err || typeof err !== "object") return false
  const maybe = err as { message?: string; details?: string; hint?: string; code?: string; status?: number }
  return Boolean(maybe.message || maybe.details || maybe.hint || maybe.code || maybe.status)
}

export const formatError = (err: unknown) => {
  if (!err) return "Unknown error"
  if (typeof err === "string") return err
  if (err instanceof Error) return err.message
  const maybe = err as { message?: string; details?: string; hint?: string }
  if (maybe.message) {
    const details = maybe.details ? ` (${maybe.details})` : ""
    const hint = maybe.hint ? ` Hint: ${maybe.hint}` : ""
    return `${maybe.message}${details}${hint}`
  }
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}
