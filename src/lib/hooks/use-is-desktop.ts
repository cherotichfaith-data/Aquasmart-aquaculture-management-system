"use client"

import { useEffect, useState } from "react"

/**
 * Tracks whether the viewport is at or above `breakpointPx` (768 = Tailwind's
 * `md`, matching the rest of the app's breakpoint). Starts `true` so the
 * server render and the client's first render agree -- there's no window to
 * measure yet -- then corrects itself right after mount, same trade-off
 * `DashboardLayout` already makes for its own responsive state.
 */
export function useIsDesktop(breakpointPx = 768) {
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${breakpointPx}px)`)
    const applyState = () => setIsDesktop(query.matches)
    applyState()
    query.addEventListener("change", applyState)
    return () => query.removeEventListener("change", applyState)
  }, [breakpointPx])

  return isDesktop
}
