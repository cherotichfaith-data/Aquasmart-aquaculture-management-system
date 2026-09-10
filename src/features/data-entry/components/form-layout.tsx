import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Shared layout primitives for the data-entry forms. Phase 1 ships these; the
 * nine forms move onto them in Phase 2 so field layout lives in one place.
 *
 * - `FormSection` — a titled card. Use one per logical group of fields.
 * - `FieldGrid`   — an auto-reflowing field grid (1 → 2 → 3 columns by width).
 * - `FormActions` — the submit row: full-width buttons on a phone, right-aligned
 *                   once there is room.
 */

export function FormSection({
  kicker,
  title,
  description,
  children,
  className,
}: {
  kicker?: ReactNode
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
}) {
  const hasHead = kicker != null || title != null || description != null
  return (
    <section className={cn("data-entry-section", className)}>
      {hasHead ? (
        <header className="data-entry-section-head">
          {kicker != null ? <span className="data-entry-section-kicker">{kicker}</span> : null}
          {title != null ? <h3 className="data-entry-section-title">{title}</h3> : null}
          {description != null ? <p className="data-entry-section-desc">{description}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  )
}

export function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("data-entry-field-grid", className)}>{children}</div>
}

export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("data-entry-form-actions", className)}>{children}</div>
}
