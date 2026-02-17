type SbErrorLike = {
  message?: string
  details?: string
  hint?: string
  code?: string
  status?: number
}

function asSbErrorLike(err: unknown): SbErrorLike {
  if (!err || typeof err !== "object") return {}
  return err as SbErrorLike
}

export function logSbError(tag: string, err: unknown) {
  if (!err) return
  const safeErr = asSbErrorLike(err)
  console.error(tag, {
    message: safeErr.message,
    details: safeErr.details,
    hint: safeErr.hint,
    code: safeErr.code,
    status: safeErr.status,
    raw: err,
  })
}

export function isSbPermissionDenied(err: unknown) {
  const safeErr = asSbErrorLike(err)
  return safeErr.code === "42501" || safeErr.status === 403 || /permission denied/i.test(safeErr.message ?? "")
}

export function isSbAuthMissing(err: unknown) {
  const safeErr = asSbErrorLike(err)
  return safeErr.status === 401 || /auth session missing/i.test(safeErr.message ?? "")
}
