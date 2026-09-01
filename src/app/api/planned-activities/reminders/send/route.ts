import { NextResponse } from "next/server"
import {
  listPlannedActivitiesForScheduledDate,
  listReminderDeliveriesForDate,
  recordReminderDeliveries,
} from "@/features/dashboard/planned-activities.server"
import { formatPlannedActivityDateLabel, type PlannedActivity } from "@/features/dashboard/planned-activities"
import { listFarmMembersForFarm } from "@/features/settings/users.server"
import { renderPlannedActivityReminderEmail, sendEmailOrThrow } from "@/lib/email"
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

async function sendReminderEmail(params: {
  to: string
  scheduledDate: string
  activities: PlannedActivity[]
}) {
  const scheduledDateLabel = formatPlannedActivityDateLabel(params.scheduledDate)
  const content = renderPlannedActivityReminderEmail({
    scheduledDateLabel,
    items: params.activities.map((activity) => ({
      title: activity.title,
      notes: activity.notes,
    })),
  })

  return sendEmailOrThrow({
    to: params.to,
    ...content,
    tags: [{ name: "type", value: "planned-activity-reminder" }],
    // One reminder per recipient per scheduled date -- a retried cron run
    // must not double-send.
    idempotencyKey: `planned-activity-reminder:${params.scheduledDate}:${params.to}`,
  })
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
          to: recipientEmail,
          scheduledDate,
          activities: pendingActivities,
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
