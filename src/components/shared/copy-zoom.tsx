"use client"

import { useRef, useState, type ReactNode } from "react"
import { Check, Copy, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/app-ui/button"

const MIN_ZOOM = 0.6
const MAX_ZOOM = 2
const ZOOM_STEP = 0.1

type CopyState = "idle" | "copied" | "failed"

function tableToClipboard(table: HTMLTableElement) {
  const clone = table.cloneNode(true) as HTMLTableElement
  clone.setAttribute("style", "border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px")
  clone.querySelectorAll("th,td").forEach((cell) => {
    const isNumber = cell.classList.contains("n")
    const right = isNumber ? "text-align:right;" : ""
    const head = cell.tagName === "TH" ? "background:#eef2f6;font-weight:bold;text-align:left;" : ""
    // Label cells (batch ids like 03.25, dates, cage names, headers) stay exactly as shown: without this, Excel
    // turns "03.25" into the number 3.25 and dates into serial numbers.
    const keepText = isNumber ? "" : 'mso-number-format:"\\@";'
    cell.removeAttribute("class")
    cell.setAttribute("style", `border:1px solid #bbb;padding:4px 8px;${head}${right}${keepText}`)
  })
  const text = Array.from(table.rows)
    .map((row) =>
      Array.from(row.cells)
        .map((cell) => (cell.innerText || cell.textContent || "").trim().replace(/\s+/g, " "))
        .join("\t"),
    )
    .join("\n")
  return { html: clone.outerHTML, text }
}

/**
 * Draws the table as an image, the way it looks on screen (header shading, bold total rows, right-aligned
 * numbers, grid lines). Chat apps, slides and image editors paste this; Excel and Word still get the real table.
 */
function tableToPng(table: HTMLTableElement): Promise<Blob> {
  const rows = Array.from(table.rows).map((row) => ({
    total: row.classList.contains("rpt-total"),
    cells: Array.from(row.cells).map((cell) => ({
      text: (cell.innerText || cell.textContent || "").replace(/\s+/g, " ").trim(),
      header: cell.tagName === "TH",
      number: cell.classList.contains("n"),
    })),
  }))
  const columns = Math.max(1, ...rows.map((row) => row.cells.length))
  const rowHeight = 26
  const padding = 10
  const normalFont = "12px Arial, sans-serif"
  const boldFont = "600 12px Arial, sans-serif"

  const measure = document.createElement("canvas").getContext("2d")
  if (!measure) return Promise.reject(new Error("Table image could not be rendered."))
  const widths = Array.from({ length: columns }, (_, col) =>
    Math.max(
      28,
      ...rows.map((row) => {
        const cell = row.cells[col]
        if (!cell) return 0
        measure.font = cell.header || row.total ? boldFont : normalFont
        return Math.ceil(measure.measureText(cell.text).width) + padding * 2
      }),
    ),
  )
  const width = widths.reduce((sum, value) => sum + value, 0)
  const height = rows.length * rowHeight

  const scale = 2
  const canvas = document.createElement("canvas")
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext("2d")
  if (!ctx) return Promise.reject(new Error("Table image could not be rendered."))
  ctx.scale(scale, scale)
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, width, height)
  ctx.textBaseline = "middle"

  rows.forEach((row, rowIndex) => {
    let x = 0
    const y = rowIndex * rowHeight
    row.cells.forEach((cell, col) => {
      const w = widths[col]
      if (cell.header) {
        ctx.fillStyle = "#eef2f6"
        ctx.fillRect(x, y, w, rowHeight)
      } else if (row.total) {
        ctx.fillStyle = "#f6f3ec"
        ctx.fillRect(x, y, w, rowHeight)
      }
      ctx.strokeStyle = "#bbbbbb"
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, rowHeight - 1)
      ctx.fillStyle = "#232a25"
      ctx.font = cell.header || row.total ? boldFont : normalFont
      ctx.textAlign = cell.number && !cell.header ? "right" : "left"
      ctx.fillText(cell.text, cell.number && !cell.header ? x + w - padding : x + padding, y + rowHeight / 2 + 1)
      x += w
    })
  })

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Table image could not be created."))), "image/png")
  })
}

function resolveCssVars(markup: string) {
  const root = getComputedStyle(document.documentElement)
  return markup.replace(/var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)/g, (_all, name: string, fallback?: string) => {
    return root.getPropertyValue(name).trim() || fallback?.trim() || "#000000"
  })
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Chart image could not be rendered."))
    image.src = url
  })
}

/** Renders a chart (title, legend and the SVG) to a PNG so it pastes cleanly into Word, Slides or chat. */
async function chartToPng(figure: HTMLElement): Promise<Blob> {
  const svg = figure.querySelector("svg")
  if (!svg) throw new Error("No chart to copy.")
  const viewBox = svg.viewBox.baseVal
  const width = viewBox.width || svg.clientWidth || 900
  const height = viewBox.height || svg.clientHeight || 320

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  clone.setAttribute("width", String(width))
  clone.setAttribute("height", String(height))
  clone.setAttribute("style", "font-family:Arial,sans-serif")
  const markup = resolveCssVars(new XMLSerializer().serializeToString(clone))
  const svgUrl = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }))

  try {
    const image = await loadImage(svgUrl)
    const title = figure.querySelector(".rpt-chart__title")?.textContent?.trim() ?? ""
    const legend = Array.from(figure.querySelectorAll(".rpt-chart__legend span")).map((item) => {
      const swatch = item.querySelector("i")
      const line = item.querySelector("line")
      const color = swatch
        ? getComputedStyle(swatch).backgroundColor
        : line
          ? resolveCssVars(line.getAttribute("stroke") ?? "#000")
          : "#000"
      return { text: item.textContent?.trim() ?? "", color }
    })

    const scale = 2
    const headerHeight = (title ? 34 : 0) + (legend.length ? 26 : 0)
    const canvas = document.createElement("canvas")
    canvas.width = width * scale
    canvas.height = (headerHeight + height) * scale
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Chart image could not be rendered.")
    ctx.scale(scale, scale)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, headerHeight + height)

    let top = 0
    if (title) {
      ctx.fillStyle = "#232a25"
      ctx.font = "600 15px Arial, sans-serif"
      ctx.textBaseline = "middle"
      ctx.fillText(title, 12, 20)
      top = 34
    }
    if (legend.length) {
      ctx.font = "12px Arial, sans-serif"
      ctx.textBaseline = "middle"
      let x = 12
      for (const item of legend) {
        ctx.fillStyle = item.color
        ctx.fillRect(x, top + 6, 12, 12)
        ctx.fillStyle = "#232a25"
        ctx.fillText(item.text, x + 18, top + 12)
        x += 18 + ctx.measureText(item.text).width + 16
      }
    }
    ctx.drawImage(image, 0, headerHeight, width, height)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Chart image could not be created."))), "image/png")
    })
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Puts Copy and zoom controls beside a table or a chart.
 *  - table: copies it as a table (pastes into Excel, Sheets, Word) plus tab-separated text.
 *  - chart: copies it as a PNG image (title, legend and plot); downloads the PNG if the browser blocks image copy.
 */
export function CopyZoom({
  type,
  name,
  children,
}: {
  type: "table" | "chart"
  name: string
  children: ReactNode
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [copyState, setCopyState] = useState<CopyState>("idle")

  function flash(next: CopyState) {
    setCopyState(next)
    window.setTimeout(() => setCopyState("idle"), 2000)
  }

  async function handleCopy() {
    const root = contentRef.current
    if (!root) return
    try {
      if (type === "table") {
        const table = root.querySelector("table")
        if (!table) throw new Error("No table to copy.")
        const { html, text } = tableToClipboard(table)
        const textParts = {
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }
        if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
          // One clipboard entry in three forms: Excel/Word take the table, chat apps and slides take the picture
          // of the table, anything else takes the tab-separated text.
          try {
            await navigator.clipboard.write([new ClipboardItem({ ...textParts, "image/png": tableToPng(table) })])
          } catch {
            await navigator.clipboard.write([new ClipboardItem(textParts)])
          }
        } else {
          await navigator.clipboard.writeText(text)
        }
      } else {
        const figure = (root.querySelector("figure") as HTMLElement | null) ?? root
        const filename = `${name.replace(/[^\w-]+/g, "_").toLowerCase() || "chart"}.png`
        // The image is passed as a promise so the browser still treats the copy as a direct click.
        const pngPromise = chartToPng(figure)
        if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": pngPromise })])
          } catch {
            downloadBlob(await pngPromise, filename)
          }
        } else {
          downloadBlob(await pngPromise, filename)
        }
      }
      flash("copied")
    } catch {
      flash("failed")
    }
  }

  const clamp = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 10) / 10))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-1.5" role="toolbar" aria-label={`${name} tools`}>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => void handleCopy()}
          aria-label={`Copy ${name}`}
          title={copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : `Copy ${type}`}
        >
          {copyState === "copied" ? <Check className="size-4" /> : copyState === "failed" ? <X className="size-4 text-destructive-strong" /> : <Copy className="size-4" />}
        </Button>
        <span className="sr-only" aria-live="polite">
          {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : ""}
        </span>
        <Button type="button" variant="outline" size="icon-sm" onClick={() => setZoom((current) => clamp(current - ZOOM_STEP))} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">
          <ZoomOut className="size-4" />
        </Button>
        <span className="w-11 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <Button type="button" variant="outline" size="icon-sm" onClick={() => setZoom((current) => clamp(current + ZOOM_STEP))} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">
          <ZoomIn className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => setZoom(1)} disabled={zoom === 1} aria-label="Reset zoom">
          <RotateCcw className="size-4" />
        </Button>
      </div>
      <div className="overflow-auto">
        <div ref={contentRef} style={{ zoom }}>
          {children}
        </div>
      </div>
    </div>
  )
}
