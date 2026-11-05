"use client"

import { useRef, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Button } from "@/components/app-ui/button"
import { Input } from "@/components/app-ui/input"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"

type Message = { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "How is the farm doing overall?",
  "Which cages have the highest mortality?",
  "Are there any water quality problems?",
  "What was recorded most recently?",
]

export default function AssistantPageClient({
  initialFarmId,
  initialFarmName,
  initialFarmRole,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialFarmRole?: string | null
}) {
  const activeFarm = useActiveFarm({ initialFarmId, initialFarmName })
  const farmId = activeFarm.farmId ?? initialFarmId ?? null
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const ask = async (text: string) => {
    const question = text.trim()
    if (!question || !farmId || pending) return
    const next: Message[] = [...messages, { role: "user", content: question }]
    setMessages(next)
    setDraft("")
    setError(null)
    setPending(true)
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId, messages: next.slice(-10) }),
      })
      const body = (await response.json()) as { reply?: string; error?: string }
      if (!response.ok || !body.reply) throw new Error(body.error ?? "The assistant could not answer.")
      setMessages([...next, { role: "assistant", content: body.reply }])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The assistant could not answer.")
    } finally {
      setPending(false)
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }))
    }
  }

  return (
    <DashboardLayout initialFarmId={initialFarmId} initialFarmName={initialFarmName} headerDataOverrides={{ role: initialFarmRole ?? null }}>
      <div className="page-shell mx-auto flex max-w-3xl flex-col gap-4">
        <div className="flex min-h-[50vh] flex-col gap-3">
          {messages.length === 0 ? (
            <div className="space-y-3 py-6">
              <p className="text-sm text-muted-foreground">
                Ask about {activeFarm.farm?.name ?? initialFarmName ?? "your farm"}. Answers come from your recorded data and run on a local model, so nothing leaves your servers.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <Button key={suggestion} variant="outline" size="sm" onClick={() => void ask(suggestion)} disabled={!farmId}>
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "mr-auto max-w-[85%] whitespace-pre-wrap rounded-lg border border-border bg-card px-3 py-2 text-sm"
                }
              >
                {message.content}
              </div>
            ))
          )}
          {pending ? <p className="text-sm text-muted-foreground">Checking the farm data…</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div ref={endRef} />
        </div>
        <form
          className="sticky bottom-2 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void ask(draft)
          }}
        >
          <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about cages, batches, feed, water quality…" aria-label="Question" />
          <Button type="submit" disabled={pending || !draft.trim() || !farmId}>
            Ask
          </Button>
        </form>
      </div>
    </DashboardLayout>
  )
}
