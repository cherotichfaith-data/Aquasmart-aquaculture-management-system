import { NextResponse } from "next/server"
import { z } from "zod"
import { requireApiUser } from "@/lib/server/auth"
import { runAssistant } from "@/features/assistant/ollama.server"
import { logSbError } from "@/lib/supabase/log"

const bodySchema = z.object({
  farmId: z.string().uuid(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(20),
})

export async function POST(request: Request) {
  const auth = await requireApiUser("api:assistant")
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof bodySchema>
  try {
    payload = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  try {
    const result = await runAssistant({ accessToken: auth.accessToken, farmId: payload.farmId, messages: payload.messages })
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    logSbError("api:assistant", error)
    return NextResponse.json({ error: "The assistant is offline. Make sure Ollama is running." }, { status: 503 })
  }
}
