import { escapeHtml } from "../html"
import type { EmailContent } from "../send"

export type PlannedActivityReminderItem = {
  title: string
  /** Free-text note; may be empty. */
  notes: string
}

export type PlannedActivityReminderInput = {
  /** Human-readable date the activities are scheduled for, already formatted. */
  scheduledDateLabel: string
  items: PlannedActivityReminderItem[]
}

export function buildPlannedActivityReminderSubject(scheduledDateLabel: string) {
  return `SUSTAIN Aquasmart reminder: planned activities for ${scheduledDateLabel}`
}

function buildText({ scheduledDateLabel, items }: PlannedActivityReminderInput) {
  const header = `Planned activities scheduled for ${scheduledDateLabel}:`
  const lines = items.map((item, index) => {
    const notes = item.notes.trim() ? ` - ${item.notes.trim()}` : ""
    return `${index + 1}. ${item.title}${notes}`
  })
  return [header, "", ...lines].join("\n")
}

function buildHtml({ scheduledDateLabel, items }: PlannedActivityReminderInput) {
  const listItems = items
    .map((item) => {
      const notes = item.notes.trim()
      const noteMarkup = notes
        ? `<div style="margin-top:4px;color:#54616b;">${escapeHtml(notes)}</div>`
        : ""
      return `<li style="margin-bottom:12px;"><strong>${escapeHtml(item.title)}</strong>${noteMarkup}</li>`
    })
    .join("")

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#12212b;">
      <h2 style="margin-bottom:8px;">SUSTAIN Aquasmart planned activities reminder</h2>
      <p style="margin-bottom:16px;">These activities are scheduled for <strong>${escapeHtml(scheduledDateLabel)}</strong>.</p>
      <ol style="padding-left:20px;margin:0;">${listItems}</ol>
    </div>
  `
}

export function renderPlannedActivityReminderEmail(
  input: PlannedActivityReminderInput,
): EmailContent {
  return {
    subject: buildPlannedActivityReminderSubject(input.scheduledDateLabel),
    text: buildText(input),
    html: buildHtml(input),
  }
}
