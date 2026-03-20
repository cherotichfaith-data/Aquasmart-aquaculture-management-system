"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useSystemTimelineBounds } from "@/lib/hooks/use-system-timeline"
import { resolveSystemTimelineWindow } from "@/lib/system-timeline-window"

type TimelineIntegrityNoteProps = {
  systemId?: number
  dateFrom?: string | null
  dateTo?: string | null
}

type NoteContent = {
  badge: string
  title: string
  description: string
}

const buildSingleSystemNote = (source: string | null | undefined, hasDataInWindow: boolean, hasTimeline: boolean): NoteContent => {
  if (hasTimeline && !hasDataInWindow) {
    return {
      badge: "No activity",
      title: "This system has no production activity in the selected period.",
      description:
        "The underlying cycle may exist, but the current page window does not overlap that system's recorded production activity, so the app leaves cycle-based views empty.",
    }
  }

  if (source === "cycle_closed") {
    return {
      badge: "Cycle-based",
      title: "This system has a resolved production cycle.",
      description:
        "Cycle dates come from first stocking to final harvest. Transfers, additions, and partial harvests stay inside the same cycle, and snapshot dates are shown separately.",
    }
  }

  if (source === "cycle_ongoing") {
    return {
      badge: "Cycle-based",
      title: "This system is in an open production cycle.",
      description:
        "Cycle dates come from first stocking to the current open cycle. Transfers and additions remain in-cycle activities, and snapshot dates are shown separately.",
    }
  }

  if (source === "planned_cycle") {
    return {
      badge: "Planned only",
      title: "This system only has a planned cycle record.",
      description:
        "Activity-driven charts may stay empty until stocking or other production records exist. The app does not present a planned cycle as observed production.",
    }
  }

  if (source === "observed_activity") {
    return {
      badge: "Observed fallback",
      title: "This system does not have full cycle boundaries recorded.",
      description:
        "The app is using observed activity dates because first stocking and final harvest are incomplete. It is not labeling that range as a true production cycle.",
    }
  }

  return {
    badge: "No timeline",
    title: "This system does not have a trustworthy production timeline yet.",
    description:
      "Cycle-based views stay empty instead of inferring dates from dashboard snapshots, inventory dates, or other partial records.",
  }
}

const buildFarmScopeNote = (
  rows: Array<{
    period_source: string | null
    hasDataInWindow: boolean
    hasTimeline: boolean
  }>,
): NoteContent | null => {
  if (!rows.length) return null

  const counts = rows.reduce(
    (acc, row) => {
      if (row.hasTimeline && !row.hasDataInWindow) {
        acc.noActivity += 1
        return acc
      }
      const source = row.period_source ?? "no_data"
      if (source === "cycle_closed" || source === "cycle_ongoing") acc.cycle += 1
      else if (source === "observed_activity") acc.observed += 1
      else if (source === "planned_cycle") acc.planned += 1
      else acc.noData += 1
      return acc
    },
    { cycle: 0, observed: 0, planned: 0, noData: 0, noActivity: 0 },
  )

  if (counts.observed === 0 && counts.planned === 0 && counts.noData === 0 && counts.noActivity === 0) {
    return {
      badge: "Cycle-based",
      title: "Systems in scope resolve to stocking-based production cycles.",
      description:
        "These views use first stocking to final harvest for cycle dates. Snapshot dates stay separate from production periods.",
    }
  }

  return {
    badge: "Mixed coverage",
    title: "Systems in scope do not all have the same timeline quality.",
    description: `${counts.cycle} systems resolve to stocking-based cycles, ${counts.observed} use observed activity fallback, ${counts.planned} only have planned cycles, ${counts.noActivity} have no activity in the selected period, and ${counts.noData} have no trustworthy production timeline. Cycle-based views avoid inventing dates from snapshots.`,
  }
}

export function TimelineIntegrityNote({ systemId, dateFrom, dateTo }: TimelineIntegrityNoteProps) {
  const { farmId } = useActiveFarm()
  const timelineQuery = useSystemTimelineBounds({
    farmId,
    systemId,
  })

  const note = useMemo(() => {
    if (timelineQuery.data?.status !== "success") return null

    const rows = timelineQuery.data.data
    if (systemId != null) {
      const windowed = resolveSystemTimelineWindow(rows[0], {
        windowStart: dateFrom ?? null,
        windowEnd: dateTo ?? null,
      })
      return buildSingleSystemNote(
        rows[0]?.period_source,
        windowed?.hasDataInWindow ?? false,
        windowed?.hasTimeline ?? false,
      )
    }
    return buildFarmScopeNote(
      rows.map((row) => {
        const windowed = resolveSystemTimelineWindow(row, {
          windowStart: dateFrom ?? null,
          windowEnd: dateTo ?? null,
        })
        return {
          period_source: row.period_source ?? null,
          hasDataInWindow: windowed?.hasDataInWindow ?? false,
          hasTimeline: windowed?.hasTimeline ?? false,
        }
      }),
    )
  }, [dateFrom, dateTo, systemId, timelineQuery.data])

  if (!note) return null

  return (
    <div className="rounded-lg border border-border/80 bg-muted/25 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="bg-background/70">
          {note.badge}
        </Badge>
        <p className="text-sm font-semibold text-foreground">{note.title}</p>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{note.description}</p>
    </div>
  )
}
