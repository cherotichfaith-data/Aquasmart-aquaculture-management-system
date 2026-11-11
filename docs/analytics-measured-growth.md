# Analytics calculation rules

Recorded growth and eFCR use the shared database function
`private.analytics_measured_intervals`, exposed through the farm-authorized
`api_analytics_performance` RPC. Batch performance, growth analysis, harvest
eFCR and Reports growth/eFCR summaries consume those intervals.

- Stocking weights, weighed receipts into empty cages, samplings and complete
  weighed departures supply recorded measurement points. A partial transfer's
  weight does not establish the ABW of fish remaining in a cage.
- Without a reliable entry weight, the first sampling establishes the baseline.
  A single baseline does not establish growth. No opening weight is inferred
  from a source batch or growth model.
- Growth is closing biomass minus opening biomass, plus measured departures
  and minus measured receipts between the points. Negative growth is retained.
  Intervals with unknown movement weights, unresolved count corrections or
  invalid balances are excluded, without discarding other valid intervals.
- Matching feed covers the opening measurement day through the day before
  the closing measurement. Feed after the latest measurement is not included.
- Monthly actual growth includes intervals whose closing point falls in that
  month. Cycle to date includes valid intervals through the selected cutoff.
  Historical cutoffs never use later measurements.
- eFCR is total matched feed divided by total measured growth, and stays blank
  without valid intervals or with non-positive net measured growth. Totals
  aggregate feed and growth; they do not average individual eFCR ratios.
- Expected growth is a model benchmark over the same measured intervals as
  recorded growth. Forecasts and feed plans remain explicitly modeled outputs.
- The visible Feed used column remains the reporting period's recorded feed
  total. eFCR's matching inputs are internal and have no separate table columns.

Monthly batch membership includes batches active at any point in that month
or with records in the month, including closed batches that meet that rule.
Cycle-to-date charts and tables use the same historical batch set.
Empty labels remain visible. Stock-loss percentages accumulate from entry
through the cutoff, with the workbook's discrepancy netting and corrected
positive denominator.

These are data-driven rules, with no special batch-name overrides.
