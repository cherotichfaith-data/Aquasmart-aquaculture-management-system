"use client"

import { useEffect, useState } from "react"

export function InitialSplash() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem("aquasmart_seen_splash")
      if (!seen) {
        setShow(true)
        sessionStorage.setItem("aquasmart_seen_splash", "1")
        const t = setTimeout(() => setShow(false), 900)
        return () => clearTimeout(t)
      }
    } catch (e) {
      // sessionStorage may be unavailable in some environments; silently ignore
    }
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <style>{`
        @keyframes swim {
          0%, 100% { transform: translateX(-5px) scaleY(1); }
          50% { transform: translateX(5px) scaleY(1.05); }
        }
        .fish-body { animation: swim 2.5s ease-in-out infinite; transform-origin: center; }

        @keyframes draw-wave { to { stroke-dashoffset: 0; } }
        .wave { stroke-dasharray: 100; stroke-dashoffset: 200; animation: draw-wave 2s ease-in-out infinite; }
        .wave2 { animation-delay: -0.5s; }
      `}</style>

      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-label="Loading" className="h-24 w-24">
        <g className="fish-body">
          <path
            d="M30 50 C 30 35, 60 35, 70 50 C 60 65, 30 65, 30 50 Z"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--background))"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M70 50 L 85 40 M70 50 L 85 60"
            stroke="hsl(var(--primary))"
            fill="none"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx="40" cy="48" r="3" fill="hsl(var(--primary))" />
        </g>

        <path className="wave" d="M 10,70 Q 30,60 50,70 T 90,70" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path className="wave wave2" d="M 10,80 Q 30,90 50,80 T 90,80" stroke="hsl(var(--accent))" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  )
}
