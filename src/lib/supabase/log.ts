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

export function isSbNetworkError(err: unknown) {
  const safeErr = asSbErrorLike(err)
  const message = String(safeErr.message ?? "")
  const details = String(safeErr.details ?? "")
  const haystack = `${message}\n${details}`
  return (
    (typeof safeErr.status === "number" && safeErr.status >= 500 && safeErr.status < 600) ||
    /fetch failed/i.test(haystack) ||
    /getaddrinfo/i.test(haystack) ||
    /enotfound/i.test(haystack) ||
    /connect timeout/i.test(haystack) ||
    /und_err_connect_timeout/i.test(haystack) ||
    /bad gateway/i.test(haystack) ||
    /gateway timeout/i.test(haystack) ||
    /service unavailable/i.test(haystack) ||
    /cloudflare/i.test(haystack) ||
    safeErr.name === "AuthRetryableFetchError"
  )
}

export function isSbInvalidRefreshToken(err: unknown) {
  const safeErr = asSbErrorLike(err)
  const message = String(safeErr.message ?? "")
  return (
    safeErr.code === "refresh_token_not_found" ||
    /invalid refresh token/i.test(message) ||
    /refresh token not found/i.test(message)
  )
}

export function isSbFlowStateNotFound(err: unknown) {
  const safeErr = asSbErrorLike(err)
  const message = String(safeErr.message ?? "")
  return safeErr.code === "flow_state_not_found" || /flow state/i.test(message)
}

export function isSbRateLimitError(err: unknown) {
  const safeErr = asSbErrorLike(err)
  const message = String(safeErr.message ?? "")
  return (
    safeErr.status === 429 ||
    safeErr.code === "over_email_send_rate_limit" ||
    /rate limit/i.test(message)
  )
}

export function isSbMissingFunction(err: unknown, functionName?: string) {
  const safeErr = asSbErrorLike(err)
  const message = String(safeErr.message ?? "")
  const details = String(safeErr.details ?? "")
  const haystack = `${message}\n${details}`

  if (safeErr.code === "PGRST202" || safeErr.status === 404) {
    if (!functionName) return true
    return haystack.toLowerCase().includes(functionName.toLowerCase())
  }

  if (/could not find the function/i.test(haystack) || /schema cache/i.test(haystack)) {
    if (!functionName) return true
    return haystack.toLowerCase().includes(functionName.toLowerCase())
  }

  return false
}

export function isSbFunctionResultTypeMismatch(err: unknown) {
  const safeErr = asSbErrorLike(err)
  const message = String(safeErr.message ?? "")
  const details = String(safeErr.details ?? "")
  return (
    safeErr.code === "42804" &&
    (/structure of query does not match function result type/i.test(message) ||
      /returned type .* does not match expected type/i.test(details))
  )
}
