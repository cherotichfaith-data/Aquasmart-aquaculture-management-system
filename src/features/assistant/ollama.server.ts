import { ASSISTANT_TOOLS } from "./tools.server"

export type ChatMessage = { role: "user" | "assistant"; content: string }

type OllamaMessage = {
  role: "system" | "user" | "assistant" | "tool"
  content: string
  tool_calls?: { function: { name: string; arguments: Record<string, unknown> } }[]
}

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:3b"
const MAX_TOOL_ROUNDS = 4

const SYSTEM_PROMPT = `You are the farm assistant for SUSTAIN Aquasmart, a tilapia cage-farming app.
Answer only from tool results. Never guess or invent numbers: if you need farm figures, call a tool first.
If a tool returns nothing, say the data is not recorded. Keep answers short and plain, quote units (g, kg, %), and name the cage or batch each number belongs to.
You cannot change data. Today is ${new Date().toISOString().slice(0, 10)}.`

export async function runAssistant(params: { accessToken: string; farmId: string; messages: ChatMessage[] }) {
  const conversation: OllamaMessage[] = [{ role: "system", content: SYSTEM_PROMPT }, ...params.messages]
  const toolsUsed: string[] = []
  const tools = ASSISTANT_TOOLS.map((tool) => ({
    type: "function",
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  }))

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: conversation,
        // Stop offering tools on the last round so the model has to answer.
        ...(round < MAX_TOOL_ROUNDS ? { tools } : {}),
        options: { temperature: 0.1 },
      }),
    })
    if (!response.ok) throw new Error(`Ollama responded ${response.status}`)

    const { message } = (await response.json()) as { message: OllamaMessage }
    const calls = message.tool_calls ?? []
    if (calls.length === 0) return { reply: message.content.trim(), toolsUsed }

    conversation.push(message)
    for (const call of calls) {
      const tool = ASSISTANT_TOOLS.find((candidate) => candidate.name === call.function.name)
      let content: string
      if (!tool) {
        content = JSON.stringify({ error: `Unknown tool ${call.function.name}` })
      } else {
        toolsUsed.push(tool.name)
        try {
          content = JSON.stringify(await tool.run({ accessToken: params.accessToken, farmId: params.farmId }, call.function.arguments ?? {}))
        } catch (error) {
          content = JSON.stringify({ error: error instanceof Error ? error.message : "Tool failed" })
        }
      }
      conversation.push({ role: "tool", content })
    }
  }

  return { reply: "I could not finish that question. Try asking it more narrowly.", toolsUsed }
}
