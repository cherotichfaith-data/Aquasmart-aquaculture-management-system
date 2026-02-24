"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"

export function LazyRender({
  children,
  fallback = null,
  className,
  rootMargin = "200px",
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
  rootMargin?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (visible || !ref.current) return
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [rootMargin, visible])

  return (
    <div ref={ref} className={className}>
      {visible ? children : fallback}
    </div>
  )
}
