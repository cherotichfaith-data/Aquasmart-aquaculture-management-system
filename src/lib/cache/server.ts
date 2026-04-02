import { unstable_cache } from "next/cache"

const DEFAULT_SERVER_READ_REVALIDATE_SECONDS = 60

type ServerReadThroughParams<T> = {
  keyParts: Array<string | number | boolean | null | undefined>
  tags?: Array<string | null | undefined>
  revalidate?: number | false
  loader: () => Promise<T>
}

export function runServerReadThrough<T>(params: ServerReadThroughParams<T>) {
  return unstable_cache(
    params.loader,
    params.keyParts.map((part) => String(part ?? "null")),
    {
      tags: Array.from(new Set((params.tags ?? []).filter((tag): tag is string => Boolean(tag)))),
      revalidate: params.revalidate ?? DEFAULT_SERVER_READ_REVALIDATE_SECONDS,
    },
  )()
}
