"use client"

import { useCallback, useEffect, useState } from "react"

const DISMISS_STORAGE_KEY = "aquasmart-install-dismissed-at"
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false
  const isDisplayModeStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false
  // iOS Safari doesn't support the display-mode media query the same way --
  // it exposes navigator.standalone instead.
  const isIosStandalone = (window.navigator as { standalone?: boolean }).standalone === true
  return isDisplayModeStandalone || isIosStandalone
}

function isIosSafari() {
  if (typeof window === "undefined") return false
  const ua = window.navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua)
  // iOS Chrome/Firefox/Edge all use WebKit under the hood and report similarly,
  // but none of them (including Safari) fire beforeinstallprompt on iOS, so any
  // iOS browser gets the manual "Add to Home Screen" instructions.
  return isIos
}

function wasRecentlyDismissed() {
  if (typeof window === "undefined") return false
  const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY)
  if (!raw) return false
  const dismissedAt = Number(raw)
  if (!Number.isFinite(dismissedAt)) return false
  return Date.now() - dismissedAt < DISMISS_COOLDOWN_MS
}

/**
 * Surfaces "Add to Home Screen" as an explicit, visible action instead of
 * relying on field workers to discover it themselves via the browser's own
 * (often buried) install UI.
 *
 * Chromium-based browsers (Android Chrome, desktop Chrome/Edge) fire
 * `beforeinstallprompt`, which we capture and defer so we can trigger it from
 * our own banner. iOS has no such event -- Safari and every other iOS browser
 * (WebKit-only there) never fire it -- so on iOS we instead show manual
 * "tap Share -> Add to Home Screen" instructions.
 */
export function useInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay())
    setIsIos(isIosSafari())
    setDismissed(wasRecentlyDismissed())

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredEvent(event as BeforeInstallPromptEvent)
    }
    const handleAppInstalled = () => {
      setDeferredEvent(null)
      setIsStandalone(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredEvent) return
    await deferredEvent.prompt()
    const choice = await deferredEvent.userChoice
    setDeferredEvent(null)
    if (choice.outcome === "accepted") {
      setIsStandalone(true)
    }
  }, [deferredEvent])

  const dismiss = useCallback(() => {
    setDismissed(true)
    window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()))
  }, [])

  const canPromptInstall = Boolean(deferredEvent) && !isStandalone && !dismissed
  const showIosInstructions = isIos && !isStandalone && !dismissed && !deferredEvent

  return {
    canPromptInstall,
    showIosInstructions,
    promptInstall,
    dismiss,
  }
}
