"use client"

import type { ReactNode } from "react"

export function SectionHeading({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-[1.08rem] font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-[1.18rem]">{title}</h2>
        {description ? <p className="mt-1.5 max-w-3xl text-[13px] leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="w-full sm:w-auto">{actions}</div> : null}
    </div>
  )
}
