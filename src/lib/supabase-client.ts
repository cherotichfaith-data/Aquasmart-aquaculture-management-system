export type QueryResult<T> = { status: "success"; data: T[] } | { status: "error"; data: null; error: string }
