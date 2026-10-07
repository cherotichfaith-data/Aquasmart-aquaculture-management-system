# Production workbook history

Open Analytics → Production inputs (`/analytics/inputs`) for the current working sheets. The original read-only workbook archive remains at `/analytics/workbook`. Select the farm, source version and month. Monthly source records are separate from daily events, so importing a workbook does not duplicate feed, mortality, stocking or harvest in live KPIs.

The initial Kimbwela file contains 131 assigned cage/month records, 17 distinct batch labels and 20 months (February 2025–September 2026). Its filename says August but Inputs!C19 is 30 September 2026. The import follows the internal reporting date. Nulls and zeros remain distinct. The original file is not modified.

Source cell references are retained for raw inputs and cached Growth Model outputs. Model outputs are labelled calculated or entered; cached results are not approved operational facts. The workbook has broken reference, lookup and division calculations. In particular, Cage Correction and Biomass movement contain #REF! errors. These are recorded in source quality metadata rather than converted to zeros.

Production is dxihivdoxulrwxdwiemh. The TB mirror pijcykcuxnbdpmqqokgo was inspected for comparison; it has a different schema and conflicting names/stock values. No automatic cross-project synchronization was introduced. The shared Kimbwela farm UUID has the production name Tanlake Samaki and mirror name Tanganyika Blue. Batch 08.26a versus 08.26 and September batch IDs need reconciliation before any operational merge. Monthly stock inputs can represent adjustments or movements and are not automatically new stocking events.

Managers/admins can save the monthly stocking count, stocking ABW in grams and growth scenario. Analytics loads these farm-specific defaults; URL controls remain temporary overrides. The initial farm defaults are 100,000 fish/month and 2 g, from Inputs!C58:C59. Aquasmart's main growth scenario remains in use; this does not claim numerical equivalence to the workbook's TB curve or broken dependent calculations.

## Future workbook imports

Run the read-only extractor with Python and openpyxl:

```text
python scripts/extract-production-workbook.py SOURCE.xlsx output.json FARM_UUID import.sql
```

Review the source reporting date, farm, source quality and extracted totals. Apply the generated SQL to the intended production project through an authorized administrative connection. The script does not connect or execute SQL. Importing the same content hash twice is a no-op. New source versions remain separately selectable. Do not put source files or generated JSON/SQL in public assets or commit farm data.

Continue using Data entry for daily activity and Analytics for live performance, harvest, feed, stock profile and forward planning. Workbook history is a reference archive, not a reconstructed daily ledger. Excel formulas, emergency feeding controls, and workbook-specific growth scenarios have not been ported wholesale.

## Validation

The schema migration was applied and its local filename matches Supabase migration history. TypeScript and targeted ESLint passed. Database checks verified a farm member reads the imported rows, a manager can update planning settings, and an unrelated user cannot read or update them. Test updates were rolled back. A repeat import retained 131 rows.

Existing database security advisories were observed outside these tables, including functions executable by anon with SECURITY DEFINER. This change does not remediate unrelated database policies or functions.

## Monthly inputs and planning inputs

Production inputs now opens a monthly cage/batch table prefilled by `api_monthly_production_inputs` from daily stocking, mortality, feed and sampling records. It also includes cage/batch pairs with positive inventory during the month. The latest measured ABW is in grams; the sampling date is available in row details. Mortality percentage uses opening stock plus stocked and incoming fish as its denominator.

Managers, administrators and system operators can add or edit reviewed monthly rows. Viewers and analysts have read-only access. `production_monthly_review` stores the values, reviewer, timestamp and revision. Saving an unchanged prefilled value freezes it as part of the review; blank fields follow daily records. A revision check prevents overwriting a newer save. Farm membership, cage/batch ownership and numeric constraints are enforced in the database.

By explicit user choice, reviewed monthly values do not replace live Analytics totals and never create operational events. Planning inputs is a separate view on the same page; its saved defaults feed the existing live model. The imported workbook and its history remain unmodified and out of the primary workflow.

Validation: farm-scoped source totals, manager/operator save, viewer write denial, unrelated-user read denial, optimistic concurrency, zero/blank values and transaction rollback tested against production; TypeScript and targeted lint checks run locally.

## Cage feed planning

`/analytics/inputs/feed-planning` is separate from monthly reviews and annual stocking defaults. Farm managers/admins save immutable plan versions in `cage_feed_plan`; all farm members can read their farm's saved plans. Normal daily records are never changed. The source RPC checks membership before accessing private analytics facts and is not callable by anon.

The source date defaults to the day before the selected calendar month (capped to today for future plans). It reads the last inventory for each active cage at that cutoff, retaining only positive stock and its actual batch. Measured ABW is the last sampling for the same cage/batch/cycle on or before that date. Missing samples remain blank. Managers confirm or edit starting fish, ABW and sampling date, and may exclude a cage. Farm defaults continue to use the existing model; TB is scoped to this tool.

Model `tb-workbook-v1` uses the workbook Lookup Sheets K45:K53, C4:C12 and C15:C23. Weight selects one phase for the entire period. Calendar-month mortality is rounded as in Excel; end ABW compounds daily growth; feed is net biomass gain × eFCR. Custom 1–62-day periods use compounded survival on a 30-day basis, an explicit app assumption. There is no within-period harvest/transfer or emergency-ration forecast. Average daily feed is a budget average, not a daily schedule. Source and confirmed values plus calculated outputs are saved, so later source changes do not rewrite plans.

Verification: `node scripts/test-feed-model.cjs`. Workbook September example returns 161.73695891037454 kg; October example returns 193.27631375178277 kg. Database transaction tests checked manager create/read, viewer write denial, immutable snapshots and nonmember isolation, then rolled back. Browser checks confirmed 18 pairs, 03.25 only in 2E, missing 1B sample blocks saving, and stock/ABW edits recalculate immediately. No test plan was retained.

UI simplification (7 October 2026): Monthly inputs and its server action were removed. The legacy inputs route redirects to Feed planning unless Farm defaults is selected; the workbook archive route redirects to Feed planning. Saved-plan history navigation and history-list queries were removed. Existing stored records are not deleted by this UI change.
