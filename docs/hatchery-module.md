# Hatchery module — Kimbwela

Status: feature discovery and specification. Workbooks are now available locally and initial inspection is complete; detailed mapping and reconciliation remain pending. The user has requested no data uploads or database changes while features are being defined.

Design reference: `C:\Users\faith\OneDrive - Masika Ventures\Tanganyika Blue - Hatchery 2026-09-28\Tilapia-hatchery-architecture 2026-09-28.pdf` (version 2, 28 September 2026). This reference supersedes the earlier prototype's egg-first flow. It is a design input, not evidence that every historical field is available.

Source folder: C:\Users\faith\OneDrive - Masika Ventures\Tanganyika Blue - Data Collection\Hatchery Kimbwela

## Workflows

| Area | Source workbooks | Proposed records |
| --- | --- | --- |
| Broodstock | Broodstock Inventory | Broodstock groups, inventory movements and counts |
| Reproduction | Eggs collection; Fry collection | Collection events with broodstock/pond and cohort references |
| Nursery inventory | Stocking Hatchery; Stocking Density folder | Stocking events and separate dated inventory observations |
| Feeding | Feed record Hatchery | Feed applications by date, unit and cohort |
| Growth | Sampling | Sampling events and weight observations |
| Losses | Mortality Hatchery; Fish Discarding Record | Separate mortality and discard events |
| Movements | Fish Transfer; Fish Harvest(Hatchery) | Linked source/destination transfers and harvest events |
| Sales | Fingerlings Sales | Dispatch quantities and commercial details where recorded |
| Environment | Water quality workbooks | Measurements by unit, date/time, parameter and original unit |

These fields are proposals, not verified source columns.

## Production model and prototype direction

- The main path is broodstock group / spawning cycle → direct fry collection → hatchery hapa rearing and grading → acknowledged transfer to the existing nursing/grow-out system or external sale. Default collection entry to direct fry, with developmental stage and count method. Eggs and hatch rates are unobserved for this path, never inferred or set to zero.
- Artificial egg collection and incubation are a pilot branch: egg collection → jar/run and hatch outcome → shared nursery workflow. Record eggs, larvae and fry separately; hatching date and first-feeding date are distinct.
- Model farm → hatchery → pond → hapa, with jar/tray/tank units for incubation. Hapas are distinct by pond; preserve net placement history and occupancy by batch. Pond water observations are shared with resident hapas, not duplicated measurements. Do not count pond subtotals alongside their constituent hapas.
- Track each collection and batch with a many-to-many ancestry graph. Splits, grades and merges create linked descendants; a location move generally retains batch identity. Record contributed quantities and whether counts are measured or estimated. Never infer exact parentage or source-specific survivor counts from a mixed lot.
- Maintain an event ledger by unit, batch and stage: opening + incoming − outgoing − mortality − other removals + approved adjustment = closing. Separate counts/observations from movements; record discrepancies as reconciliation tasks rather than silently treating them as deaths. Maintain event time, entry time, operator, evidence, quality and correction history.
- Transfer lots connect one or more source batches to receiving cages/batches. Record dispatch and receipt counts, counting method, weights and sampling, transport losses, in-transit stock and unresolved discrepancy. Typical handover size is approximately 1.5–2.5 g, not an automatic rejection threshold. The existing system owns nursing/grow-out after receipt; verify its actual integration capabilities before specifying implementation.
- Field users need unit-first, phone-friendly, offline-capable entry for water, mortality, feeding, collection, sampling and movements; pending sync, duplicate-safe retries and conflicts must be visible. Managers need the same event trail, daily stock and reconciliation, spawning schedules, source-hapa fry output, pilot hatch performance, cohort growth and survival, feed, water trends, dispatch and linked downstream traceability.
- Metrics require matching stage, dates, numerator, denominator, method and coverage. Show unavailable when inputs are missing. Egg hatch metrics apply to pilot runs only. Broodstock productivity should include fry per stocked female and, where exposure is known, fry per female-day. Spawning participation requires examined and observed females; unique repeat-spawning requires individual identification.
- Do not hard-code literature values as local targets. Show site- and stage-specific configured thresholds with effective dates and response ownership.

Workbook evidence includes broodstock inventory; fry and egg collections; feeding, mortality, stocking, transfer, sampling, water quality, density and fingerling dispatch. It does not by itself establish reliable event-level female contributions, individual parentage, verified opening counts, complete hatch outcomes or reconciled downstream receipts. Mixed dates, overlapping versions and batch identifiers require review before import.

The next visual prototype should make the direct-fry and incubation branches explicit, show a hapa's ledger and reconciliation, offer unit-first daily entry, and follow one acknowledged handover into the existing system. Management views should distinguish production by origin from current stock by location and identify the coverage behind each KPI.

## Integration requirements

### Fecundity tracking — agreed scope

Attach fecundity inputs to each egg collection event, with collection date, pond/hapa, broodstock group and egg batch references where known.

| Field | Meaning and rules |
| --- | --- |
| Contributing females | Number of females that actually contributed eggs to this collection; positive whole number when supplied. Do not substitute the total female inventory. |
| Total contributing female weight (kg) | Combined body weight of those same females; positive value when supplied. Store the original measurement unit and convert to kg for reporting. This is female body weight, not egg weight. |
| Egg count | Nonnegative whole number, with count basis required when supplied. |
| Egg count basis | Measured or estimated; historical records with unknown methodology remain unknown until reviewed. |
| Counting / estimation method | Describe direct counting or the estimation procedure. Required for estimated counts. |
| Estimation inputs | Where applicable, retain sample egg count, sample egg weight (g), total egg weight (g), and any other inputs used. Do not assume all estimates are weight-based. |
| Notes | Measurement limitations or context, including pooled collections. |

Calculated measures:

- Eggs per contributing female = egg count / contributing female count.
- Eggs per kg of contributing female = egg count / total contributing female weight in kg.
- Calculate each measure only when its own denominator is known and positive; otherwise display “Not available”, not zero.
- Label derived fecundity as estimated whenever its egg count is estimated. Unknown count methodology must remain visible.
- For weight-based estimates, egg count = sample egg count × total egg weight / sample egg weight; require positive sample weight and sample count, record rounding to the nearest whole egg, and retain the inputs.
- Report collection-level fecundity. Do not sum contributing female counts across collections and describe the result as unique females; the same females may contribute repeatedly.
- Period summaries use total eggs / total matching denominators across eligible collection events, not a simple average of event ratios. Show coverage and count basis; exclude records with missing denominators and their eggs together.

Initial workbook evidence: egg collections have counts and weights but no contributing female count or body weight. Broodstock female inventory is not a valid substitute. Historical fecundity remains unavailable until those collection-specific inputs are supplied. The egg count column's mixed count/gram label also needs clarification before mapping.

- Add a Hatchery workspace entry using AquaSmart's existing layout, farm selection and role model.
- Scope every record to the active farm and hatchery location. Enforce membership and write roles in database policies and server actions.
- Represent hatchery ponds/tanks and life stages without assuming the existing cage production model applies unchanged.
- Preserve broodstock → egg collection → fry → nursery → fingerling lineage where the evidence supports those links. Leave unknown lineage unset rather than guessing.
- Link hatchery dispatch and grow-out receipt through one transfer identifier so internal movements do not inflate production or sales.
- Keep stock observations separate from stock movements. A density count must not add fish to inventory.
- Calculate balances only after opening quantities, movement semantics and units are verified. Display reconciliation differences explicitly.
- Show hatch/survival rates only for linked cohorts with compatible counts and known denominators; do not divide unrelated period totals.

## Import requirements

Retain original workbooks unchanged. Stage imports before posting, with source file hash, sheet, row, import batch and validation status. Preview mapping, dates, units, rejected rows and suspected duplicates. Re-importing an identical source row must be idempotent.

The folder includes LAPTOP-suffixed versions of feeding, sampling and stocking files, an October ZIP archive, multiple water-quality workbooks and overlapping dated density files. Compare content before deciding which records are authoritative; filenames alone do not establish duplicates or precedence.

Do not ship raw business records as public frontend assets or commit them to the repository.

## Next implementation gate

Continue defining and agreeing hatchery features before implementation or import. Resolve workbook date conflicts, units, mixed batch references and overlapping records during detailed mapping. No workbook data is to be uploaded and no database changes are to be made during this feature-definition phase.
