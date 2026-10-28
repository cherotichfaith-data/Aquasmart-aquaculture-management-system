"use client"

import { useRef, useState, type ReactNode } from "react"
import { Check, Copy, RotateCcw, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/app-ui/button"

const MIN_ZOOM = 0.6
const MAX_ZOOM = 2
const ZOOM_STEP = 0.1

type CopyState = "idle" | "copied" | "failed"

function tableToClipboard(table: HTMLTableElement) {
  const clone = table.cloneNode(true) as HTMLTableElement
  clone.setAttribute("style", "border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px")
  clone.querySelectorAll("th,td").forEach((cell) => {
    const right = cell.classList.contains("n") ? "text-align:right;" : ""
    const head = cell.tagName === "TH" ? "background:#eef2f6;font-weight:bold;text-align:left;" : ""
    cell.removeAttribute("class")
    cell.setAttribute("style", `border:1px solid #bbb;padding:4px 8px;${head}${right}`)
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
        if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/html": new Blob([html], { type: "text/html" }),
              "text/plain": new Blob([text], { type: "text/plain" }),
            }),
          ])
        } else {
          await navigator.clipboard.writeText(text)
        }
      } else {
        const figure = (root.querySelector("figure") as HTMLElement | null) ?? root
        const blob = await chartToPng(figure)
        const filename = `${name.replace(/[^\w-]+/g, "_").toLowerCase() || "chart"}.png`
        if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
          } catch {
            downloadBlob(blob, filename)
          }
        } else {
          downloadBlob(blob, filename)
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
        <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()} aria-label={`Copy ${name}`}>
          {copyState === "copied" ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : type === "table" ? "Copy table" : "Copy chart"}
        </Button>
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
