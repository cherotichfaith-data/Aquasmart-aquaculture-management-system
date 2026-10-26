export { getResendClient, getDefaultFromAddress, isEmailConfigured } from "./client"
export { sendEmail, sendEmailOrThrow } from "./send"
export type { EmailContent, SendEmailParams, SendEmailResult } from "./send"
export { escapeHtml } from "./html"
export {
  renderPlannedActivityReminderEmail,
  buildPlannedActivityReminderSubject,
} from "./templates/planned-activity-reminder"
export type {
  PlannedActivityReminderInput,
  PlannedActivityReminderItem,
} from "./templates/planned-activity-reminder"
