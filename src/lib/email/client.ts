import { Resend } from "resend"

/**
 * Central Resend access. Everything that sends mail -- auth-adjacent flows,
 * cron notifications, one-off transactional messages -- goes through here so
 * the API key and default sender are read in exactly one place.
 *
 * Note: Supabase Auth's own emails (signup confirmation, password reset,
 * invites) are delivered by Resend via the project's Custom SMTP setting in
 * the Supabase dashboard, not through this module. This module is for email
 * the application sends itself.
 */

let cachedClient: Resend | null = null

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable.")
  }
  if (!cachedClient) {
    cachedClient = new Resend(apiKey)
  }
  return cachedClient
}

/**
 * Default `from` address, e.g. `SUSTAIN Aquasmart <no-reply@mail.example.com>`.
 * `REMINDER_EMAIL_FROM` is accepted as a fallback so the existing
 * planned-activity reminder deployment keeps working without an env change.
 */
export function getDefaultFromAddress(): string {
  const from = (process.env.EMAIL_FROM ?? process.env.REMINDER_EMAIL_FROM)?.trim()
  if (!from) {
    throw new Error("Missing EMAIL_FROM (or REMINDER_EMAIL_FROM) environment variable.")
  }
  return from
}

export function isEmailConfigured(): boolean {
  const hasKey = Boolean(process.env.RESEND_API_KEY?.trim())
  const hasFrom = Boolean((process.env.EMAIL_FROM ?? process.env.REMINDER_EMAIL_FROM)?.trim())
  return hasKey && hasFrom
}
