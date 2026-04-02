async function parseJson(response: Response) {
  return response.json().catch(() => null) as Promise<
    | {
        error?: string
      }
    | null
  >
}

export async function postJson<TResult, TPayload>(
  url: string,
  payload: TPayload,
  options?: { signal?: AbortSignal },
): Promise<TResult> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: options?.signal,
  })

  const body = (await parseJson(response)) as TResult | { error?: string } | null

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : "Request failed."
    throw new Error(message)
  }

  if (!body) {
    throw new Error("Invalid server response.")
  }

  return body as TResult
}
