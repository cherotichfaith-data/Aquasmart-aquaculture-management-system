**AquaSmart UI/UX and frontend code review — 10 September 2026**

AquaSmart has a coherent visual foundation, but the data-entry experience needs reliability and navigation work before cosmetic refinement. This review identifies **24 prioritized findings: 7 high-priority (P1) and 17 medium-priority (P2)**. P1 means a core workflow, accurate entry, or recovery is materially at risk; P2 means significant friction, ambiguity, or accessibility weakness.

The review covers all nine entry-form implementations, the rendered entry screens, recent-entry history, approval/rejection UI, shared form/select primitives, responsive layout/navigation, toast/offline status, and entry bootstrap/mutation behavior. Broader source inspection covered shared analytics states and their dashboard/feed/actions consumers, production/settings layout usage, tables, tooltips and report controls. It is a focused UI/UX and frontend review, not a complete backend/security or every-route functional audit.

Evidence was collected from the current local preview using the existing authenticated Chrome session after the in-app browser reached a sign-in wall. Desktop captures are approximately 1536 × 791; phone reflow was inspected at 390 × 844. The deployed site was not assumed to match the checkout. No successful data writes, approvals, rejections, or code fixes were performed. Only the audit artifacts were added.

The strongest existing foundations are consistent primary color and form cards, meaningful field labels, numeric input modes, cage/batch context chips, inline validation messages, a responsive form picker, the conditional mortality warning, batch creation within stocking, an explicit final-harvest confirmation in source, and distinct offline/approval messages in the shared mutation layer. Preserve these while fixing the interaction gaps.

**Reviewed steps and screenshot evidence**

| Step | Surface | Health |
|---|---|---|
| 1 | Feeding desktop | Needs improvement |
| 2 | Empty feeding validation and draft switching | Poor |
| 3 | Water quality | High risk |
| 4 | Feeding on a phone (390 × 844) | Poor navigation; form reflows |
| 5 | Mortality at 100 fish | Mixed |
| 6 | Sampling | Needs improvement |
| 7 | Transfer | Needs improvement |
| 8 | Harvest | Reasonable base; targeted gaps |
| 9 | Stocking | Needs improvement |
| 10 | System setup | High risk on repeated creation |
| 11 | Feed inventory | Needs improvement |
| 12 | Approvals and rejected history | Needs improvement |

**Prioritized findings**

**1. [P1] Restore navigation and farm identity on phones** — Observed · step 4.

At 390px, Data Entry has no menu, dashboard link, farm name, or workspace switcher. The sidebar is hidden below md and hideHeader removes the only menu trigger. Users can change forms or open Approval, but cannot navigate the app normally.

Recommended change: Keep a compact mobile header with Menu, farm identity, and a clear route back to the dashboard. Source: [dashboard-layout.tsx](C:/Users/faith/Downloads/aquasmart1/src/components/layout/dashboard-layout.tsx:181).

**2. [P1] Preserve unfinished entries when changing forms** — Observed · steps 2–3.

A temporary note entered in Feeding disappeared after switching to Water Quality and returning. No warning appeared. The page is keyed by the entire URL and form state is local; carrying the cage ID forward does not preserve the draft.

Recommended change: Persist drafts per user/farm/form, and retain the date and cage context. Offer Restore/discard and warn before abandoning an unsaved draft. Source: [page.tsx](C:/Users/faith/Downloads/aquasmart1/src/app/data-entry/page.tsx:65).

**3. [P1] Keep descriptive feeding-response option labels** — Observed AX + source · step 1.

The UI exposes only 1, 2, 3, 4, 5. FeedingForm supplies “Level {number} - {description}” as multiple React children, but the shared Select replaces every non-string label with its raw value. Staff must remember the scale, even though descriptive labels already exist.

Recommended change: Give SelectItem an explicit text label or safely flatten text children. Verify all consumers with composed labels. Source: [select.tsx](C:/Users/faith/Downloads/aquasmart1/src/components/app-ui/select.tsx:173).

**4. [P1] Allow the water-quality measurement schedule the page requests** — Source-confirmed · step 3.

The form reminds staff to return for a PM reading. Its duplicate key contains only date and depth for the selected cage; it ignores time and parameter. Once a matching record exists, another same-depth reading is blocked even at a different time. Adding a missing parameter later is also blocked.

Recommended change: Define a reading identity including the intended time/session, depth and parameters. Match the client and server rules; show the existing reading with a correction/add-reading action. Source: [water-quality-form.tsx](C:/Users/faith/Downloads/aquasmart1/src/features/data-entry/components/water-quality-form.tsx:201).

**5. [P1] Use farm-local dates and times** — Source-confirmed · all dated forms.

toIsoDate uses toISOString, so the default date is UTC. At 00:30 in Nairobi it resolves to the previous calendar day. Water Quality also extracts UTC hours for an unlabeled local Time control, introducing a three-hour offset in this timezone.

Recommended change: Use an explicit farm timezone for default dates, display and persistence. Label the timezone and handle rounding across midnight consistently. Source: [form-utils.ts](C:/Users/faith/Downloads/aquasmart1/src/features/data-entry/components/form-utils.ts:3).

**6. [P1] Do not present failed loads as an empty farm** — Source-confirmed · entry bootstrap.

Systems, batches and feeds fall back to successful empty arrays when fetching fails. An existing farm can therefore show “Set up your first system,” “No batches found,” or “No feed types.” The user may try to recreate existing resources instead of retrying.

Recommended change: Preserve error/loading/empty distinctions. Offer Retry with existing cached context; show setup only after a successful empty response. Source: [queries.server.ts](C:/Users/faith/Downloads/aquasmart1/src/features/data-entry/queries.server.ts:82).

**7. [P1] Keep System Setup selections synchronized after saving** — Source-confirmed · step 10; save not executed.

Type and Growth Stage use defaultValue with the custom Select's internal state. form.reset changes React Hook Form values, but does not reset the Select's internal value. After creating a nondefault type/stage, the visible selection can differ from the next submitted value.

Recommended change: Use controlled value bindings for both selectors and verify two consecutive creations with different types/stages. Source: [system-form.tsx](C:/Users/faith/Downloads/aquasmart1/src/features/data-entry/components/system-form.tsx:176).

**8. [P2] Make required and conditional fields apparent before submission** — Observed + source · steps 1–2, 5–11.

The header says required fields must be completed, but most labels have no indication of which fields are required. Feeding Type and Response become required only when amount is positive; Notes is required at zero. These conditions are revealed through errors rather than guidance.

Recommended change: Mark optional fields consistently, expose required semantics, and add conditional help adjacent to the amount/response/notes fields. Consider an explicit “Not fed” choice. Source: [feeding-form.tsx](C:/Users/faith/Downloads/aquasmart1/src/features/data-entry/components/feeding-form.tsx:58).

**9. [P2] Focus the first actionable error** — Observed + source · step 2.

Submitting empty Feeding produced cage-unit, cage-number and notes errors, but focus jumped to Notes. Select controls do not receive the Controller field ref/onBlur. This defeats first-invalid-field focus and consistent onBlur validation for dropdowns.

Recommended change: Forward the native select ref and blur handler, register them with the form, and focus Cage Unit first. Add an error summary for longer forms. Source: [select.tsx](C:/Users/faith/Downloads/aquasmart1/src/components/app-ui/select.tsx:130).

**10. [P2] Fix water-quality feedback before relying on it** — Source-confirmed + observed copy · step 3.

The DO classifier accepts only a number, while Controller onChange receives a string from the numeric input; coercion occurs at validation, not in the watched input. The inline rating is therefore likely absent during ordinary typing. Separately, “Morning measurement logged” appears before a reading is saved.

Recommended change: Normalize watched numeric values and show classification loading/unavailable states. Change the unsaved hint to “Morning reading selected” and reserve “logged” for a confirmed save. Source: [water-quality-form.tsx](C:/Users/faith/Downloads/aquasmart1/src/features/data-entry/components/water-quality-form.tsx:152).

**11. [P2] Surface duplicate conflicts while entering context** — Source-confirmed · feeding, mortality, transfer, harvest, stocking.

Duplicate queries run as cage/date change, but conflicts are generally disclosed only in onSubmit. The form remains available for full entry, then rejects the work. Mortality/transfer/harvest/stocking use broad daily guards with no visible correction route.

Recommended change: Show an early existing-entry notice, its date and summary, and a View/Edit action. Validate whether daily totals or separate events are intended before changing uniqueness rules. Source: [feeding-form.tsx](C:/Users/faith/Downloads/aquasmart1/src/features/data-entry/components/feeding-form.tsx:245).

**12. [P2] Reuse the original form controls in approval editing** — Source-confirmed · step 12; no pending entry to exercise.

The approval editor iterates arbitrary payload keys, converts names to labels and chooses text/number based on the original value. It exposes fields such as batch_id, feed_type_id and transfer destinations as raw IDs, with no original selectors, conditional rules or date pickers.

Recommended change: Use a typed editor for each entry type, sharing labels, schema and reference selectors with data entry. Keep structural/derived fields out of the editor. Source: [approvals-client.tsx](C:/Users/faith/Downloads/aquasmart1/src/app/approvals/approvals-client.tsx:440).

**13. [P2] Keep feed-inventory units consistent through review** — Source-confirmed · steps 11–12.

Entry labels opened_bags as “Open Feed (g)” and recent history also uses grams. Approval labels the same value “Opened bags” without a unit. A manager could read a weight as a count. The entry form also permits fractional “Amount of Bags” while the summary calls them closed bags.

Recommended change: Use “Unopened bags” and “Loose/open feed (g)” consistently. Explain or constrain fractional bag counts and show a calculated total in kg before submission. Source: [approvals-client.tsx](C:/Users/faith/Downloads/aquasmart1/src/app/approvals/approvals-client.tsx:149).

**14. [P2] Unify Approvals with the app's navigation and permissions** — Observed + source · step 12.

Approvals uses a standalone main instead of DashboardLayout, removing the sidebar and farm identity. Its tab list is duplicated, always includes Feed Inventory, and drops cage/batch context on return. It does not use the compact phone form picker.

Recommended change: Share the same layout and tab configuration, preserve context and role filtering, and maintain a visible farm name on review screens. Source: [page.tsx](C:/Users/faith/Downloads/aquasmart1/src/app/approvals/page.tsx:51).

**15. [P2] Give rejected entries an explicit recovery path** — Observed + source · step 12.

Only pending entries are editable. Rejected entries show status and an optional review note, but no “Correct and resubmit” action. Users must locate the original form and recreate the entry. An optional rejection note can leave them without a reason.

Recommended change: Provide a prefilled correction/resubmission flow linked to the rejected record, retain history, and require or strongly prompt an actionable rejection reason. Source: [approvals-client.tsx](C:/Users/faith/Downloads/aquasmart1/src/app/approvals/approvals-client.tsx:188).

**16. [P2] Make recent entries usable for verification** — Observed + source · steps 1, 3, 11.

Water-quality cards show raw parameter names and values without measurement units, time or depth. Feed-inventory cards in the captured state have no feed title: title reads only feed_type_label with no fallback. Cards offer no detail/correction action and dates are not distinguished as measured versus submitted.

Recommended change: Add readable parameter labels and units, measured-at/depth, feed-name fallback from feed_type_id, clear date labels, and a detail link. Group WQ parameters by reading. Source: [recent-entries-list.tsx](C:/Users/faith/Downloads/aquasmart1/src/features/data-entry/components/recent-entries-list.tsx:430).

**17. [P2] Keep recent-history scope and loading states truthful** — Source-confirmed · recent entries.

Scoped loading/errors can fall back to a small prefetched sample, making an empty result look definitive. Water Quality has no scoped fetch in useScopedRecentRows. The queued badge counts every pending entry of the type even when displayed cards are filtered to one cage; pending reads are not farm-filtered.

Recommended change: Query the selected scope for every type, distinguish Loading/Unavailable/Empty, filter queue data by farm and cage, and derive badge counts from the displayed scope. Source: [recent-entries-list.tsx](C:/Users/faith/Downloads/aquasmart1/src/features/data-entry/components/recent-entries-list.tsx:250).

**18. [P2] Improve consecutive-entry workflow** — Source-confirmed · all operational forms.

After saving, most forms preserve the cage but reset the date to today and numeric values to zero. During historical entry across multiple cages, the date silently changes and staff must repeatedly reselect the next cage. Feeding also retains the prior response, which can be copied unintentionally.

Recommended change: Retain an explicitly chosen working date, provide Save and next cage, and clearly state which values carry forward. Reset observational values unless the user chooses to reuse them. Source: [feeding-form.tsx](C:/Users/faith/Downloads/aquasmart1/src/features/data-entry/components/feeding-form.tsx:277).

**19. [P2] Use blank values for unmeasured quantities** — Observed + source · steps 5–11.

Mortality/sampling/transfer/harvest/stocking start with zero despite requiring positive counts or weights. System depth/volume are optional yet default to zero, so “not measured” becomes a measurement. Mortality also cannot record an explicit zero-death observation.

Recommended change: Use empty placeholders for unmeasured values. Decide whether zero mortality needs an explicit “Checked: none” record and keep it distinct from no entry. Source: [system-form.tsx](C:/Users/faith/Downloads/aquasmart1/src/features/data-entry/components/system-form.tsx:42).

**20. [P2] Show useful measurement checks at entry time** — Source-confirmed · steps 3, 6.

Sampling accepts 0.001 kg in its schema, but its input step is 0.01 kg, so native browser validation can reject an otherwise schema-valid value. There is no preview of the entered sample's ABW. “Expected ABW Today” actually projects to the selected date. WQ numeric fields lack per-parameter physical bounds in the UI.

Recommended change: Align input precision with schema, show calculated sample ABW and label projections by selected date. Add valid measurement bounds without blocking merely abnormal but possible readings. Source: [sampling-form.tsx](C:/Users/faith/Downloads/aquasmart1/src/features/data-entry/components/sampling-form.tsx:300).

**21. [P2] Standardize field widths and reduce avoidable vertical space** — Observed + source · steps 1–11.

Native selects are content-width while date/number inputs fill the grid, producing uneven alignment and small selection areas. Nested padding and always-visible note boxes put the mobile save button below the first screen. Stocking's batch-create button sits apart from the batch field.

Recommended change: Use full-width selectors inside field columns, group context fields together, place Add batch beside its selector, and consider collapsible optional notes plus a reachable save area. Source: [select.tsx](C:/Users/faith/Downloads/aquasmart1/src/components/app-ui/select.tsx:151).

**22. [P2] Use navigation semantics consistently** — Source-confirmed · all entry tabs.

Route links are marked as tabs without a corresponding tabpanel, aria-controls or roving keyboard behavior. The page also nests a main landmark inside DashboardLayout's main and jumps from h1 to h3. Assistive navigation does not match the visual organization.

Recommended change: Use a labeled nav with aria-current for route links, or implement the full tabs interaction model. Keep a single main landmark and a coherent heading hierarchy. Source: [data-entry-interface.tsx](C:/Users/faith/Downloads/aquasmart1/src/features/data-entry/components/data-entry-interface.tsx:269).

**23. [P2] Name collapsed navigation controls** — Source-confirmed · shared sidebar.

Collapsed sidebar links remove their text and have no aria-label. The tooltip is a sibling with no aria-describedby relationship. The collapsed Log out button also loses its accessible text. This affects the shared layout across the application.

Recommended change: Give icon-only links and logout permanent accessible names; expose aria-current on the active route and correctly associate any tooltip. Source: [sidebar.tsx](C:/Users/faith/Downloads/aquasmart1/src/components/layout/sidebar.tsx:288).

**24. [P2] Restore data freshness feedback across analytics** — Source-confirmed · broader codebase.

DataFetchingBadge and DataUpdatedAt deliberately return null, although dashboard, feed and recommended-action components call them. Background refresh and data age become invisible where these components are expected to communicate them.

Recommended change: Restore subtle refreshing/last-updated indicators near the relevant data, particularly when retaining old results during requests or reconnecting after offline work. Source: [data-states.tsx](C:/Users/faith/Downloads/aquasmart1/src/components/shared/data-states.tsx:8).

**Accessibility and evidence limits**

Observed issues include the missing phone navigation, the validation focus sequence, and absent descriptive option text. Source-level risks include incomplete tab semantics, unnamed collapsed navigation controls, nested main landmarks, and dynamic alerts without consistent live-region treatment. Visible focus styling, associated form labels/error descriptions, native selects and numeric input modes are positive foundations. This review does not certify WCAG compliance: screen-reader behavior, contrast ratios, touch ergonomics, browser zoom, iOS keyboard behavior, and every responsive breakpoint still need dedicated testing. Pale warning/error text is a contrast risk to measure, not a claimed measured failure.

Saving and offline-sync transitions were reviewed in source only. No test records were created. Pending approval editing, final-harvest confirmation, first-farm setup, network-failure fallbacks, and two successive system creations were not exercised end-to-end. Current database constraints and deployment parity were not verified. A workspace-selection interruption and a browser “computer went to sleep” network error occurred during capture; the preview recovered. Those environment interruptions are not counted as confirmed application defects.

**Recommended implementation order**

1. Restore mobile navigation and farm identity; preserve unsaved drafts and working context.
2. Fix shared Select labels/ref/control behavior, UTC defaults, WQ duplicate identity, and error-versus-empty bootstrap states.
3. Make required fields, existing entries and correction actions visible early. Reuse typed forms for approval edits and unify units.
4. Improve recent-entry detail/scoping and repeated cage entry; then standardize widths, spacing and responsive approval presentation.
5. Add meaningful regression coverage for navigation with a draft, morning/afternoon WQ entries, farm-local midnight, select labels/reset, failed bootstrap, and approval units. Validate using isolated test data.

**Verification performed**

- TypeScript: `npx tsc --noEmit --incremental false` passed.
- ESLint: `npm run lint` completed with zero errors and one existing warning in [planned-activities-timeline.tsx](C:/Users/faith/Downloads/aquasmart1/src/features/dashboard/components/planned-activities-timeline.tsx:59) about the missing `loadActivities` effect dependency.
- Browser: nine initial form screens, empty feeding validation, draft-loss reproduction, phone reflow, conditional mortality warning, and approval/rejected history inspection.
- These checks validate the review context; passing TypeScript/lint does not establish usability or data-write correctness.

**Screenshots with step notes**

**Step 1: Feeding desktop — Needs improvement**

Consistent visual structure, but response descriptions are missing, fields have inconsistent widths, and required/conditional fields are unclear.

![Step 1: Feeding desktop](C:/Users/faith/Downloads/aquasmart1/docs/ui-ux-audit-2026-09-10/01-feeding.png)

**Step 2: Empty feeding validation and draft switching — Poor**

Errors appear inline, but focus skips the cage selectors. An unsaved note was lost after changing forms and returning.

![Step 2: Empty feeding validation and draft switching](C:/Users/faith/Downloads/aquasmart1/docs/ui-ux-audit-2026-09-10/02-validation.png)

**Step 3: Water quality — High risk**

The initial screen claims a morning reading is logged before saving. Source review finds UTC defaults and a duplicate guard incompatible with PM readings at the same depth. Image shows the top of the longer form.

![Step 3: Water quality](C:/Users/faith/Downloads/aquasmart1/docs/ui-ux-audit-2026-09-10/03-water-quality.png)

**Step 4: Feeding on a phone (390 × 844) — Poor navigation; form reflows**

Single-column fields and the compact form picker fit, but the app menu and farm identity disappear. Save is below the initial viewport.

![Step 4: Feeding on a phone (390 × 844)](C:/Users/faith/Downloads/aquasmart1/docs/ui-ux-audit-2026-09-10/04-mobile-feeding.png)

**Step 5: Mortality at 100 fish — Mixed**

The threshold warning and weight requirement react to the entered count. The warning gives a useful next task but no direct save-and-water-check continuation. No record was saved.

![Step 5: Mortality at 100 fish](C:/Users/faith/Downloads/aquasmart1/docs/ui-ux-audit-2026-09-10/05-mortality.png)

**Step 6: Sampling — Needs improvement**

Clear labels and historical ABW in recent cards. Source review finds input precision mismatch and no live ABW for the entered sample.

![Step 6: Sampling](C:/Users/faith/Downloads/aquasmart1/docs/ui-ux-audit-2026-09-10/06-sampling.png)

**Step 7: Transfer — Needs improvement**

Origin and destination are separated clearly. Same-origin/destination and daily duplicates are disclosed late, with no early existing-entry action.

![Step 7: Transfer](C:/Users/faith/Downloads/aquasmart1/docs/ui-ux-audit-2026-09-10/07-transfer.png)

**Step 8: Harvest — Reasonable base; targeted gaps**

Compact initial form. Source includes a final-harvest confirmation and cycle summary; those conditional states were reviewed in code, not submitted in the browser.

![Step 8: Harvest](C:/Users/faith/Downloads/aquasmart1/docs/ui-ux-audit-2026-09-10/08-harvest.png)

**Step 9: Stocking — Needs improvement**

Batch creation is available, but its button is separated from the batch selector and pushes the form down. Date/quantity defaults and daily-duplicate behavior need attention.

![Step 9: Stocking](C:/Users/faith/Downloads/aquasmart1/docs/ui-ux-audit-2026-09-10/09-stocking.png)

**Step 10: System setup — High risk on repeated creation**

Naming help and a live name preview are useful. Optional dimensions begin at zero; uncontrolled type/stage selectors can diverge after reset (source finding).

![Step 10: System setup](C:/Users/faith/Downloads/aquasmart1/docs/ui-ux-audit-2026-09-10/10-system-setup.png)

**Step 11: Feed inventory — Needs improvement**

Open-feed grams and closed-bag counts are visible, but captured recent cards have blank feed titles. Approval labels do not preserve the grams unit. Image shows the upper portion of the long form.

![Step 11: Feed inventory](C:/Users/faith/Downloads/aquasmart1/docs/ui-ux-audit-2026-09-10/11-feed-inventory.png)

**Step 12: Approvals and rejected history — Needs improvement**

Status summaries and review notes are supported. Shared navigation/farm context disappears, rejected rows have no correction action, and pending editing uses raw payload fields (source finding).

![Step 12: Approvals and rejected history](C:/Users/faith/Downloads/aquasmart1/docs/ui-ux-audit-2026-09-10/12-approvals.png)


