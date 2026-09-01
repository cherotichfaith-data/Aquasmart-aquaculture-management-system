# Recording fish movements — which form to use

When fish leave a cage, the record has to land in the right table so that yield,
mortality rate, FCR and standing-stock numbers stay correct. Use this guide.

## Decision table

| What happened | Table / form | `transfer_type` |
|---|---|---|
| Moved to another cage on the same farm | **Transfer** | `transfer` |
| Moved to another cage as part of size grading | **Transfer** | `grading` |
| Moved to another cage to reduce stocking density | **Transfer** | `density_thinning` |
| Taken to the lab for diagnosis / investigation / examination | **Transfer** | `lab_sample` |
| Removed to be counted, then returned to the cage | **Transfer** | `count_check` |
| Held back / moved for use as broodstock | **Transfer** | `broodstock` |
| Used for staff training | **Transfer** | `training` |
| Culled or discarded — not viable, "not enough for the project" | **Transfer** | `external_out` |
| Sold or moved to another farm / outside entity | **Transfer** | `external_out` |
| Removed as the harvest — for eating or sale as product | **Harvest** | — |
| Died in the cage | **Mortality** | — |
| Routine growth sample: weighed and **returned** to the cage | **Sampling** | — *(does not reduce stock)* |

## Principles

- **Transfer** is the table for any fish that physically leaves a cage for a
  reason *other than death or being the harvested product*. The
  `transfer_type` records *why*. Cage-to-cage moves have a destination cage;
  everything else (lab, cull, sale, broodstock…) has no destination — put the
  place/reason in the "external destination" field.
- **Harvest** is only for fish taken as the **product** of the operation (eaten
  or sold as food fish). Anything else in this table inflates reported yield and
  distorts FCR.
- **Mortality** is only for fish that **died in the cage**. Fish that were alive
  when removed (lab samples, culls) do not belong here — they would inflate the
  mortality rate.
- **Sampling** (the monthly growth weigh-in) does **not** reduce standing stock,
  because those fish go back in the cage. Only record a Transfer/Mortality for
  the sample fish that do **not** return.
- Every "no-destination" transfer type reduces standing stock the same way — the
  type is for analysis and reporting, not the inventory maths.

## During a transfer or grading operation

Fish pulled off for the lab during a bigger move go on their **own** transfer
line (`lab_sample`, small count), separate from the main transfer line — don't
fold them into the cage-to-cage total.

## If two records fall on the same cage + same day

The transfer entry form allows one transfer per cage per day. For a second
same-day movement (e.g. a reconciliation adjustment, or a lab pull on a transfer
day), the record has to be added directly to the database by someone with
access.

## Reconciliation adjustments

When a cage is closed out and the standing number doesn't reach zero (fish lost
/ escaped during handling that were never individually recorded), book the
remainder as a single **Transfer** line, `transfer_type = external_out`, with a
note explaining the calculation. Do **not** spread it across daily mortality —
that corrupts the daily mortality rate. Estimate its weight from the ABW of the
fish moved alongside it.
