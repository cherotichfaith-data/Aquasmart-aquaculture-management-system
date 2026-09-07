/**
 * Null out `batch_id` on record rows whose batch is a data-repair stand-in
 * (INFERRED-*, BATCH-<n>), so synthetic batches never surface in a report
 * table -- not even as a bare id number.
 */
export function scrubSyntheticBatchId<T extends { batch_id?: number | null }>(
  rows: T[],
  syntheticIds: Set<number>,
): T[] {
  if (syntheticIds.size === 0) return rows
  return rows.map((row) =>
    row.batch_id != null && syntheticIds.has(row.batch_id) ? { ...row, batch_id: null } : row,
  )
}
