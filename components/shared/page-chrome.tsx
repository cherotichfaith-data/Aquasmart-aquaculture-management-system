"use client"

import type { LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type PageStat = {
  label: string
  value: string
}

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("page-shell", className)}>{children}</div>
}

export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  meta,
  stats,
  className,
}: {
  eyebrow?: string
  title?: string
  description?: string
  icon?: LucideIcon
  actions?: React.ReactNode
  meta?: React.ReactNode
  stats?: PageStat[]
  className?: string
}) {
  return (
    <section className={cn("page-hero", className)}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {eyebrow ? <span className="page-chip">{eyebrow}</span> : null}
              {meta}
            </div>
            <div className="flex items-start gap-4">
              {Icon ? (
                <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-background/85 md:flex">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              ) : null}
              <div className="space-y-2">
                {title ? <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h1> : null}
                {description ? <p className="max-w-3xl text-sm text-muted-foreground md:text-base">{description}</p> : null}
              </div>
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        {stats && stats.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}


export function PageSection({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <section className={cn("page-section", className)}>{children}</section>
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="section-heading">
      <div className="space-y-1">
        <h2 className="section-heading-title">{title}</h2>
        {description ? <p className="section-heading-copy">{description}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  )
}

export function StatusBadge({
  label,
  tone = "default",
}: {
  label: string
  tone?: "default" | "success" | "warning" | "critical"
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
        tone === "success" && "border-chart-2/30 bg-chart-2/10 text-chart-2",
        tone === "warning" && "border-chart-4/30 bg-chart-4/10 text-chart-4",
        tone === "critical" && "border-destructive/30 bg-destructive/10 text-destructive",
        tone === "default" && "border-border/80 bg-background/80 text-muted-foreground",
      )}
    >
      {label}
    </Badge>
  )
}
