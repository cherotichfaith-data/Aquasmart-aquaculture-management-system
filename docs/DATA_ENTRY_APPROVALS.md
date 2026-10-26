# Data entry approvals

Ported from the local PostgreSQL AquaSmart approval workflow to aquasmart1's existing Supabase authentication, farm membership and production triggers.

## Available workflow

- Feeding, mortality, sampling, stocking, transfer, harvest, water quality and feed inventory submit only to a durable pending queue; once the migration is applied there is no direct write path.
- Administrators and farm managers can approve or reject individual entries, optionally recording a review note. Other write roles can see their own submissions.
- A still-pending entry can be revised in place from the Approvals / My submissions view: admins and farm managers may edit any entry in their farm, an operator only their own. Editing re-runs the full submission checks; approved and rejected entries can no longer be changed.
- Submission and editing reject a future-dated observation, an entry that duplicates an approved or still-pending record for the same slot (feeding is per feed type; water quality per parameter, time and depth), and a mortality, harvest or transfer whose fish count exceeds the system's current live balance. Mass mortality still requires a total weight.
- Review supports status/type filters, pagination, refresh, a record preview and bulk decisions. Physical feed inventory observations require individual review.
- Approval rechecks farm/system/batch/feed scope and writes the official record, existing trigger effects and review decision in one transaction. A failed bulk decision rolls back the entire selection.
- Approved/rejected history retains the final submitted payload, submitting user/time, reviewing user/time, note and official record ID. Terminal history cannot be overwritten or deleted.
- Offline retries use their stable local identifier, including feed counts. Reusing an identifier with different data is rejected.
- Database grants prevent older authenticated clients from bypassing the queue through direct writes once the migration is installed.

## Differences from the source application

This ports the approval workflow for the eight operational forms aquasmart1 already has. System setup and other master data retain their current workflow. The source application's physical fish-count reconciliation and feed-movement ledger are separate features and are not introduced here. Existing aquasmart1 feed counts continue to become inventory snapshots when approved; there is no new observation-only/reconcile choice.

Pending entries are visible in Approvals / My submissions, but aquasmart1's existing official dashboards, stock totals and reports remain approved-only. The source application's provisional KPI views, threaded correction-request notes and broader audit-log UI are not part of this port. In-place editing of a pending entry is supported (see the workflow list above); the source application's field-level validation warnings are surfaced only as blocking errors here.

## Activation

There is no feature flag. Once the code is deployed and `supabase/migrations/20260909115856_data_entry_approvals.sql` is applied, the eight record routes submit only to the pending queue and the migration revokes the direct write grants, so the queue is the only write path — the same design as the source application.

Because there is no dark-launch switch, the code and the migration must go out together. The target database is **AQUASMART [Production]** (`dxihivdoxulrwxdwiemh`); no remote migration was applied during development.

Cutover, coordinated across every deployment that writes to that database:

1. Merge and deploy the code so every writing deployment is on the queue-only record routes.
2. Pause data entry and apply only this migration through the normal process. Do not reset the database or push unrelated pending migrations.
3. Resume. Open Data Entry → Approvals and verify one real, authorized observation through submission, edit and review. Pending stocking must be approved before dependent feeding or transfers can use the new cohort.

Steps 1 and 2 should be close together: between a deployment that expects the queue and the migration that creates it, `submit_production_entries` does not exist and data entry fails; between the migration and a deployment still doing direct writes, the revoked grants make data entry fail. Rolling back means a reviewed migration that restores the direct write grants and keeps the pending/history table so submitted observations are not lost.

## Verification

`supabase/tests/data_entry_approvals.sql` uses synthetic fixtures inside a transaction and rolls them back. Its global counts are scoped to the fixture farm and systems, so it can run against a database that already holds unrelated data (for example the local `supabase_db_aquasmart1` stack). It was last run against that local stack with the approval migration applied.

Coverage includes all eight entry types, official-record isolation, manager-only review, viewer/anonymous denial, cross-farm isolation, immutable history, repeated submissions and approvals, conflicting retries, physical-count bulk exclusion, derived fields, database trigger execution, stale scope revalidation, atomic rollback, the future-date / duplicate / live-count / mass-mortality checks, and pending-entry editing by the submitter, a manager and (denied) a viewer.

TypeScript and ESLint verification commands:

```powershell
npx tsc --noEmit --incremental false
npm run lint
```

Run the SQL test only in a disposable database with the application schema and approval migration installed. Do not run synthetic fixtures against production.
