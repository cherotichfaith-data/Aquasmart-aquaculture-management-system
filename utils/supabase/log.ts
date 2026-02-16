export function logSbError(tag: string, err: any) {
  if (!err) return
  console.error(tag, {
    message: err?.message,
    details: err?.details,
    hint: err?.hint,
    code: err?.code,
    status: err?.status,
    raw: err,
  })
}

export function isSbPermissionDenied(err: any) {
  return err?.code === "42501" || err?.status === 403 || /permission denied/i.test(err?.message ?? "")
}

export function isSbAuthMissing(err: any) {
  return err?.status === 401 || /auth session missing/i.test(err?.message ?? "")
}
