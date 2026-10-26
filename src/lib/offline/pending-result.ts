type OfflinePendingMeta = {
  farmId: string
  systemId?: number | null
  date: string
  pendingSync: true
  localIds: string[]
}

export function buildOfflinePendingResult<TData>(params: {
  data: TData
  farmId?: string | null
  systemId?: number | null
  date: string
  localIds: string[]
}) {
  return {
    data: params.data,
    meta: {
      farmId: params.farmId ?? "",
      systemId: params.systemId ?? null,
      date: params.date,
      pendingSync: true,
      localIds: params.localIds,
    } satisfies OfflinePendingMeta,
  }
}
