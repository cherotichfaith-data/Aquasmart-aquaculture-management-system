import type { CageHarvestRow } from "./types"

/** Confirmed by the farm: report batch 03.25 only from cage 2E; legacy TAFIRI history is unconfirmed. */
export function confirmedHarvestScopes(cages: CageHarvestRow[], batches: CageHarvestRow[], farmId: string) {
  if (farmId !== "ae4f719b-e29e-4f60-bae0-2429cf840c5d") return { cageHarvests: cages, batchHarvests: batches }
  const cageHarvests = cages.filter(row => row.batch_name !== "03.25" || row.cage_name === "2E")
  const batchHarvests = batches.flatMap(row => {
    if (row.batch_name !== "03.25") return [row]
    const confirmed = cageHarvests.find(cage => cage.cycle_id === row.cycle_id && cage.batch_name === "03.25" && cage.cage_name === "2E")
    return confirmed ? [{ ...confirmed, system_id: null, cage_name: null, unit: null, report_system_id: confirmed.system_id ?? undefined }] : []
  })
  return { cageHarvests, batchHarvests }
}
