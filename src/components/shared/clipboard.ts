/** Image-only clipboard content prevents chat apps from choosing a text representation. */
export async function copyImage(png: Promise<Blob>): Promise<{ copied: true } | { copied: false; blob: Blob }> {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      // Keep the clipboard write in the click gesture; Safari can resolve the PNG afterwards.
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })])
      return { copied: true }
    } catch {
      // Do not silently turn a requested image into text.
    }
  }
  return { copied: false, blob: await png }
}

/** Explicit alternative for editable spreadsheet/document pasting. */
export async function copyEditableTable(html: string, text: string) {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      })])
      return
    } catch {
      // A text-only fallback is appropriate only for this explicitly chosen table format.
    }
  }
  if (!navigator.clipboard?.writeText) throw new Error("Table copying is unavailable.")
  await navigator.clipboard.writeText(text)
}
