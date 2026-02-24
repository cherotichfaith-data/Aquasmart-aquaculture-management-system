"use client"

import { Keyboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const shortcuts = [
  { label: "Quick actions", keys: ["Ctrl", "K"] },
  { label: "New entry", keys: ["Ctrl", "N"] },
  { label: "Record feeding", keys: ["Ctrl", "Shift", "F"] },
  { label: "Record sampling", keys: ["Ctrl", "Shift", "S"] },
]

export function ShortcutsHelp() {
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Keyboard className="h-4 w-4" />
            Shortcuts
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="space-y-2">
            {shortcuts.map((shortcut) => (
              <div key={shortcut.label} className="flex items-center justify-between text-sm">
                <span>{shortcut.label}</span>
                <span className="flex items-center gap-1">
                  {shortcut.keys.map((key) => (
                    <kbd key={key} className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {key}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
