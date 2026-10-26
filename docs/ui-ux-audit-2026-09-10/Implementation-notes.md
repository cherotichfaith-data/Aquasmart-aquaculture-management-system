# AquaSmart UI/UX fixes — 10 September 2026

Implemented against the audit in `AquaSmart-UI-UX-Review.md`. Changes are local and have not been deployed. No farm production, approval, rejection, or inventory records were changed during verification.

## First priority: navigation and data-entry safety

- Restored mobile navigation on compact-header pages. The header shows the farm name and a Switch farm link.
- Added account + farm + form draft storage to all nine forms, restoration notices, explicit discard, seven-day expiry, and clearing after successful online or offline saves. Drafts stay on the current device and are not submissions.
- Carried a manually chosen working date across entry forms within the browser session. Repeated saves retain the working date.
- Repaired composed select labels (including the feeding-response descriptions), native ref forwarding, blur handling, accessible attributes, and full-width controls.
- Matched water-quality duplicate detection to the server's date/time/depth/parameter identity. AM and PM readings and different parameters remain valid. Offline readings carry the same matching metadata.
- Replaced UTC-derived date and time defaults with device-local calendar and clock values. Quarter-hour defaults round down, avoiding an accidental rollover into the next day.
- Required bootstrap queries now fail visibly instead of returning successful empty options. Recent-history requests show loading/error/retry states.
- Made system type and growth-stage selections controlled so reset, draft restoration and submission agree.

## Second priority: validation and corrections

- Added required markers, accessible required states, conditional feeding guidance, and clickable validation summaries. Invalid submissions focus registered native selects.
- Fixed numeric dissolved-oxygen classification, added checking/unavailable feedback, and removed the premature “measurement logged” message.
- Added early notices for existing entries. Transfer history is advisory: separate movements on the same day are permitted.
- Replaced the approval payload editor with entry-specific fields, named options, enums, date/time inputs, units, integer steps and bounded numeric inputs. Internal timestamps are hidden; water-quality timestamps are rebuilt when their visible date or time changes.
- Clarified unopened whole bags versus loose feed in grams, including approval tables. New feed counts reject fractional unopened bags.
- Added a correct-and-resubmit action for rejected entries. The source rejection remains immutable; the correction returns to pending review through the existing validation RPC. Farm and origin identities are pinned to the source. A stable correction id handles retries.
- Required a rejection reason in both the review UI and API.
- Prevented filter/page changes while an approval edit is active and stopped counts from displaying a misleading zero during loading/error states.

## Third priority: efficient, consistent entry

- Unified entry/approval navigation with role-aware options, mobile selection, farm/cage/batch context and page-link semantics.
- Added water-quality time/depth/units, readable parameter names, feed-name fallbacks, record-state labels and a submission-history link to recent cards.
- Scoped offline history by farm and cage. Added live water-quality, system and feed-inventory history queries; selected-cage request failures no longer fall back to unrelated prefetched rows.
- Added Save & next cage for feeding, mortality, sampling, stocking, harvest and water quality. Advancement occurs only after a successful save, preserves the working date, and stops at the last cage. Transfer keeps its origin/destination workflow.
- Cleared default positive measurements instead of presenting unsaved zeroes. Blank system depth/volume remain absent rather than becoming zero. Feeding still supports an explicitly entered zero with a reason.
- Allowed 0.001 kg sampling precision and displayed live sample average weight in g/fish. Renamed the expected-weight check to refer to the selected date.
- Reduced note-area height, made selects fill their columns and kept mobile save actions visible near the bottom of the viewport.
- Removed nested main landmarks and tab semantics from route links; improved heading order, collapsed-sidebar names, current-page state and tooltip descriptions.
- Restored background-refresh and last-updated indicators.

## Verification

- `node --test tests/ui-ux-regressions.test.cjs`: 8 passing tests covering timezone boundaries, water-quality duplicate identity, correction authorization/state/identity, and approval-editor options and units.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run lint`: no errors; one pre-existing warning in `planned-activities-timeline.tsx` about the `loadActivities` effect dependency.
- `git diff --check`: passed.
- Browser: verified native error focus, descriptive select options, draft restoration after reload and tab navigation, draft discard on a fresh mount, mobile drawer and farm context, 0.125 kg sampling input and a calculated 12.50 g/fish average for 10 fish.
- Browser: also verified the shared approvals layout, opening a rejected entry in the named-field correction editor, disabled filters during editing, and cancelling without saving.
- Screenshots: `fixed-mobile-sampling.png` and `fixed-approval-editor.png`.

## Limits and operational choices

- Dates and times follow the operator device timezone. The farm schema currently has no timezone setting; traveling operators must set their device to the farm's timezone. This change preserves the existing backend wall-clock timestamp convention rather than silently reinterpreting historical timestamps.
- Approval/correction writes were tested with mocks, not against live production records. Existing database RPCs remain authoritative for validation and permissions. No schema migration is required by these fixes.
- This is not a completed production build/deployment or a full assistive-technology certification. The existing dev server retained an older approval bundle; the updated approvals screen and correction editor were verified in a fresh isolated local preview. That test server was stopped after verification.
