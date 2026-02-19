type CsvCell = string | number | null | undefined

const escapeCsvCell = (value: CsvCell): string => {
  const raw = value == null ? "" : String(value)
  return `"${raw.replaceAll('"', '""')}"`
}

export function downloadCsv(params: {
  filename: string
  headers: string[]
  rows: CsvCell[][]
}) {
  const lines = [params.headers.join(","), ...params.rows.map((row) => row.map(escapeCsvCell).join(","))]
  const csv = lines.join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = params.filename
  link.click()
  URL.revokeObjectURL(url)
}

export function printBrandedPdf(params: {
  title: string
  subtitle?: string
  farmName?: string | null
  dateRange?: { from?: string; to?: string }
  summaryLines?: string[]
  tableHeaders: string[]
  tableRows: CsvCell[][]
  commentary?: string
}) {
  const popup = window.open("", "_blank")
  if (!popup) return

  const headerHtml = params.tableHeaders.map((header) => `<th>${header}</th>`).join("")
  const rowsHtml = params.tableRows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell == null ? "" : String(cell)}</td>`).join("")}</tr>`)
    .join("")
  const summaryHtml = (params.summaryLines ?? []).map((line) => `<li>${line}</li>`).join("")
  const period = params.dateRange?.from && params.dateRange?.to ? `${params.dateRange.from} to ${params.dateRange.to}` : "N/A"

  popup.document.write(`
    <html>
      <head>
        <title>${params.title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
          .logo { width: 34px; height: 34px; border-radius: 6px; background: #2563eb; color: #fff; font-weight: 700; display:flex; align-items:center; justify-content:center; }
          h1 { margin: 0; font-size: 24px; }
          .meta { color: #4b5563; margin: 6px 0 16px; font-size: 12px; }
          .summary { margin: 0 0 12px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; }
          th { background: #f3f4f6; }
          .commentary { margin-top: 12px; font-size: 12px; color: #374151; }
        </style>
      </head>
      <body>
        <div class="brand"><div class="logo">AQ</div><div><h1>${params.title}</h1></div></div>
        ${params.subtitle ? `<div class="meta">${params.subtitle}</div>` : ""}
        <div class="meta">
          Farm: ${params.farmName ?? "N/A"}<br/>
          Period: ${period}<br/>
          Generated: ${new Date().toLocaleString()}
        </div>
        ${summaryHtml ? `<ul class="summary">${summaryHtml}</ul>` : ""}
        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        ${params.commentary ? `<div class="commentary">${params.commentary}</div>` : ""}
      </body>
    </html>
  `)
  popup.document.close()
  popup.focus()
  popup.print()
}
