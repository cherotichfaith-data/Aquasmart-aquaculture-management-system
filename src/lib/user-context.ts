export function mergeUserContext<TProfile extends Record<string, unknown>, TSettings extends Record<string, unknown>>(params: {
  profile?: TProfile | null
  settings?: TSettings | null
  fallback?: Record<string, unknown> | null
}) {
  const profile = params.profile ?? null
  const settings = params.settings ?? null
  const merged =
    profile || settings || params.fallback
      ? {
          ...(params.fallback ?? {}),
          ...(profile ?? {}),
          ...(settings ?? {}),
        }
      : null

  return {
    profile,
    settings,
    merged,
  }
}
