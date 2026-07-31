"use client"

import { Download, Share, X } from "lucide-react"
import { Button } from "@/components/app-ui/button"
import { useInstallPrompt } from "@/lib/pwa/use-install-prompt"

/**
 * Explicit "Add to Home Screen" nudge -- field workers won't reliably
 * discover the browser's own (often hidden) install affordance on their own,
 * and a standalone install matters a lot here since it's what gets the app
 * its own icon/launch surface separate from a browser tab.
 */
export function InstallBanner() {
  const { canPromptInstall, showIosInstructions, promptInstall, dismiss } = useInstallPrompt()

  if (!canPromptInstall && !showIosInstructions) {
    return null
  }

  return (
    <div className="flex items-center gap-3 border-b border-primary/20 bg-primary/[0.06] px-4 py-2 text-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {canPromptInstall ? <Download size={16} /> : <Share size={16} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">Install AquaSmart</p>
        <p className="text-xs text-muted-foreground">
          {canPromptInstall
            ? "Add it to your home screen for quick, offline-ready access."
            : 'Tap Share, then "Add to Home Screen" for quick, offline-ready access.'}
        </p>
      </div>
      {canPromptInstall ? (
        <Button size="sm" onClick={() => void promptInstall()} className="min-h-8 shrink-0 rounded-full px-3 text-xs">
          Install
        </Button>
      ) : null}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X size={16} />
      </button>
    </div>
  )
}
