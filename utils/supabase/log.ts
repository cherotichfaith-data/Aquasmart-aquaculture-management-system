type SbErrorLike = {
  message?: string
  details?: string
  hint?: string
  code?: string
  status?: number
  name?: string
}

function asSbErrorLike(err: unknown): SbErrorLike {
  if (!err) return {}
  if (typeof err === "string") return { message: err }
  if (err instanceof Error) {
    const typed = err as Error & {
      details?: string
      hint?: string
      code?: string
      status?: number
      name?: string
    }
    return {
      message: typed.message,
      details: typed.details,
      hint: typed.hint,
      code: typed.code,
      status: typed.status,
      name: typed.name,
    }
  }
  if (typeof err === "object") {
    const obj = err as {
      message?: string
      details?: string
      hint?: string
      code?: string
      status?: number
      name?: string
      error?: string
    }
    return {
      message: obj.message ?? obj.error,
      details: obj.details,
      hint: obj.hint,
      code: obj.code,
      status: obj.status,
      name: obj.name,
    }
  }
  return { message: String(err) }
}

export function logSbError(tag: string, err: unknown) {
  if (!err) return
  const safeErr = asSbErrorLike(err)
  if (
    !safeErr.message &&
    !safeErr.details &&
    !safeErr.hint &&
    !safeErr.code &&
    !safeErr.status &&
    !safeErr.name
  ) {
    return
  }
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
  return (
    safeErr.status === 401 ||
    safeErr.code === "401" ||
    /auth session missing/i.test(safeErr.message ?? "") ||
    /session missing/i.test(safeErr.message ?? "") ||
    safeErr.name === "AuthSessionMissingError"
  )
}
