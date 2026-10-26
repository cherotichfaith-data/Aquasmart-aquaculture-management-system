/**
 * Escapes a string for safe interpolation into the HTML body of an email.
 * Email templates here are plain template literals (no JSX runtime), so any
 * user-supplied value -- activity titles, notes, names -- must pass through
 * this before it lands between tags or inside an attribute.
 */
export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}
