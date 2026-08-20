import { NextResponse } from "next/server"
import {
  listPlannedActivitiesForScheduledDate,
  listReminderDeliveriesForDate,
  recordReminderDeliveries,
} from "@/features/dashboard/planned-activities.server"
import { formatPlannedActivityDateLabel, type PlannedActivity } from "@/features/dashboard/planned-activities"
import { listFarmMembersForFarm } from "@/features/settings/users.server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logSbError } from "@/lib/supabase/log"

const REMINDER_TIMEZONE = "Africa/Nairobi"

function getTimeZoneDateIso(timeZone: string, date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  return formatter.format(date)
}

function getTomorrowInTimeZone(timeZone: string, date = new Date()) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + 1)
  return getTimeZoneDateIso(timeZone, next)
}

function getCronSecret() {
  return process.env.PLANNED_ACTIVITY_REMINDER_CRON_SECRET ?? process.env.CRON_SECRET ?? null
}

function isAuthorized(request: Request) {
  const configuredSecret = getCronSecret()
  if (!configuredSecret) {
    return process.env.NODE_ENV !== "production"
  }

  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${configuredSecret}`
}

function buildReminderSubject(scheduledDate: string) {
  return `AquaSmart reminder: planned activities for ${formatPlannedActivityDateLabel(scheduledDate)}`
}

function buildReminderText(activities: PlannedActivity[], scheduledDate: string) {
  const header = `Planned activities scheduled for ${formatPlannedActivityDateLabel(scheduledDate)}:`
  const lines = activities.map((activity, index) => {
    const notes = activity.notes.trim() ? ` - ${activity.notes.trim()}` : ""
    return `${index + 1}. ${activity.title}${notes}`
  })
  return [header, "", ...lines].join("\n")
}

function buildReminderHtml(activities: PlannedActivity[], scheduledDate: string) {
  const items = activities
    .map((activity) => {
      const notes = activity.notes.trim()
      return `<li style="margin-bottom:12px;"><strong>${escapeHtml(activity.title)}</strong>${notes ? `<div style="margin-top:4px;color:#54616b;">${escapeHtml(notes)}</div>` : ""}</li>`
    })
    .join("")

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#12212b;">
      <h2 style="margin-bottom:8px;">AquaSmart planned activities reminder</h2>
      <p style="margin-bottom:16px;">These activities are scheduled for <strong>${escapeHtml(formatPlannedActivityDateLabel(scheduledDate))}</strong>.</p>
      <ol style="padding-left:20px;margin:0;">${items}</ol>
    </div>
  `
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

async function sendReminderEmail(params: {
  to: string[]
  subject: string
  text: string
  html: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.REMINDER_EMAIL_FROM

  if (!apiKey || !from) {
    throw new Error("Missing RESEND_API_KEY or REMINDER_EMAIL_FROM.")
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    }),
  })

  const payload = (await response.json().catch(() => null)) as { id?: string; message?: string; error?: string } | null
  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error ?? "Reminder email request failed.")
  }

  return payload?.id ?? null
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const reminderDate = getTimeZoneDateIso(REMINDER_TIMEZONE)
  const scheduledDate = getTomorrowInTimeZone(REMINDER_TIMEZONE)

  try {
    const [activities, deliveries] = await Promise.all([
      listPlannedActivitiesForScheduledDate(scheduledDate),
      listReminderDeliveriesForDate(reminderDate),
    ])

    const deliveredKeys = new Set(deliveries.map((item) => `${item.activity_planner_id}|${item.recipient_email}`))
    const activitiesByFarm = new Map<string, PlannedActivity[]>()

    for (const activity of activities) {
      const bucket = activitiesByFarm.get(activity.farm_id) ?? []
      bucket.push(activity)
      activitiesByFarm.set(activity.farm_id, bucket)
    }

    let sentEmails = 0
    let recordedDeliveries = 0

    // This route runs on a cron secret, not a user session (see
    // isAuthorized above) -- there's no caller whose farm-admin session
    // could carry the query, and it needs every farm's roster, not one
    // admin's own farm. The service role is the correct, deliberate choice
    // here, not a shortcut around it.
    const admin = createAdminClient()
    for (const [farmId, farmActivities] of activitiesByFarm.entries()) {
      const members = await listFarmMembersForFarm(farmId, admin)
      const recipientEmails = Array.from(
        new Set(
          members
            .map((member) => member.email?.trim().toLowerCase() ?? "")
            .filter((email) => email.length > 0),
        ),
      )

      for (const recipientEmail of recipientEmails) {
        const pendingActivities = farmActivities.filter((activity) => !deliveredKeys.has(`${activity.id}|${recipientEmail}`))
        if (!pendingActivities.length) continue

        const providerMessageId = await sendReminderEmail({
          to: [recipientEmail],
          subject: buildReminderSubject(scheduledDate),
          text: buildReminderText(pendingActivities, scheduledDate),
          html: buildReminderHtml(pendingActivities, scheduledDate),
        })

        await recordReminderDeliveries(
          pendingActivities.map((activity) => ({
            plannedActivityId: activity.id,
            recipientEmail,
            reminderDate,
            providerMessageId,
          })),
        )

        sentEmails += 1
        recordedDeliveries += pendingActivities.length
      }
    }

    return NextResponse.json({
      data: {
        reminderDate,
        scheduledDate,
        activityCount: activities.length,
        sentEmails,
        recordedDeliveries,
      },
    })
  } catch (error) {
    logSbError("plannedActivities:sendReminders", error)
    const message = error instanceof Error ? error.message : "Unable to send planned activity reminders."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
