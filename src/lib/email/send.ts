import { getDefaultFromAddress, getResendClient } from "./client"

/** The rendered body of an email, produced by a template in `./templates`. */
export type EmailContent = {
  subject: string
  html: string
  text: string
}

export type SendEmailParams = EmailContent & {
  to: string | string[]
  /** Overrides `EMAIL_FROM`; must be an address on a verified Resend domain. */
  from?: string
  replyTo?: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  /** Resend tags for filtering/metrics in the dashboard. */
  tags?: { name: string; value: string }[]
  /**
   * Passed to Resend as an idempotency key: a retry with the same key within
   * 24h returns the original send instead of delivering a duplicate. Use a
   * stable value derived from what the email is about (recipient + event).
   */
  idempotencyKey?: string
}

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string }

function normalizeRecipients(to: string | string[]): string[] {
  return (Array.isArray(to) ? to : [to]).map((address) => address.trim()).filter(Boolean)
}

/**
 * Sends one email through Resend. Never throws for an expected failure
 * (missing config, provider rejection, network error) -- callers branch on
 * `result.ok` and decide whether that is fatal for their flow.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const recipients = normalizeRecipients(params.to)
  if (recipients.length === 0) {
    return { ok: false, error: "sendEmail called with no recipients." }
  }

  let client
  let fromAddress: string
  try {
    client = getResendClient()
    fromAddress = params.from?.trim() || getDefaultFromAddress()
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email is not configured."
    console.error("[email] configuration error", message)
    return { ok: false, error: message }
  }

  try {
    const { data, error } = await client.emails.send(
      {
        from: fromAddress,
        to: recipients,
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo,
        cc: params.cc,
        bcc: params.bcc,
        tags: params.tags,
      },
      params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined,
    )

    if (error) {
      console.error("[email] send rejected", { name: error.name, message: error.message })
      return { ok: false, error: error.message || "Resend rejected the email." }
    }

    return { ok: true, id: data?.id ?? null }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email."
    console.error("[email] send failed", message)
    return { ok: false, error: message }
  }
}

/**
 * Same as {@link sendEmail} but throws on failure. For callers that treat a
 * failed send as a hard error (e.g. a cron route that should return 500).
 */
export async function sendEmailOrThrow(params: SendEmailParams): Promise<string | null> {
  const result = await sendEmail(params)
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.id
}
