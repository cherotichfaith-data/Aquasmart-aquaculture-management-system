"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Droplets, Fish, FlaskConical, Plus, X } from "lucide-react"
import { Separator } from "@/components/app-ui/separator"
import { Sheet } from "@/components/app-ui/sheet"
import { DATA_ENTRY_PATH, withCurrentSearchContext } from "@/lib/app-entry"

const QUICK_ENTRY_ITEMS = [
  { type: "feeding", label: "Record Feeding", icon: Fish },
  { type: "sampling", label: "Record Sampling", icon: FlaskConical },
  { type: "water_quality", label: "Record Water Quality", icon: Droplets },
] as const

/**
 * Thumb-reach quick entry for phones. The header's own "Add Data" dropdown
 * (components/layout/header.tsx) covers desktop but sits at the top of the
 * page -- on a phone that means scrolling back up before logging a reading,
 * and on routes that hide the header entirely (Production, Settings) it
 * isn't reachable at all. This renders a fixed button on every route that
 * wants it instead, below `md` only, and carries the same farm/system/
 * batch context the sidebar already preserves between sections.
 */
export default function MobileQuickEntry() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  const go = (href: string) => {
    setOpen(false)
    router.push(withCurrentSearchContext(href, searchParams))
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Quick entry"
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_12px_28px_-8px_rgba(15,23,32,0.45)] transition-transform active:scale-95 md:hidden"
      >
        <Plus size={26} />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} side="bottom">
        <div className="flex items-start justify-between gap-3 px-4 py-4">
          <div>
            <h2 className="text-base font-bold">Quick Entry</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Log a reading without leaving this page.</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close quick entry"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
          >
            <X size={18} />
          </button>
        </div>
        <Separator />
        <div className="grid gap-1 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {QUICK_ENTRY_ITEMS.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => go(`${DATA_ENTRY_PATH}?type=${item.type}`)}
              className="flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <item.icon size={18} className="text-muted-foreground" />
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => go(DATA_ENTRY_PATH)}
            className="flex min-h-12 items-center justify-center rounded-xl px-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent"
          >
            View all entry types
          </button>
        </div>
      </Sheet>
    </>
  )
}
