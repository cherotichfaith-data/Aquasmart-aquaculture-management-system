"use client"

import { Menu } from "lucide-react"

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="border-b border-border bg-card/90 sticky top-0 z-20 backdrop-blur md:hidden">
      <div className="flex items-center px-4 py-3">
        <button onClick={onMenuClick} className="p-2 hover:bg-accent rounded-sm transition-colors">
          <Menu size={20} />
        </button>
      </div>
    </header>
  )
}
