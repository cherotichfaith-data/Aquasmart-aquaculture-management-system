# EUI Components Reference — Forms, Data Grid, Tables, Templates, Editors & Syntax

Condensed usage/guideline rules extracted from Elastic UI (EUI) documentation, for use as external design guidance auditing a Next.js aquaculture farm-management app (9 data-entry forms, several sortable/filterable data tables, dashboard). Prop tables, TypeScript interfaces, and code snippets are intentionally omitted — only stated usage prose is captured.

Note: `Forms > Layouts > Usage` (https://eui.elastic.co/docs/components/forms/layouts/usage/) is covered in a separate existing note and is skipped here.

---

## Date & Time — Auto Refresh
Source: https://eui.elastic.co/docs/components/forms/date-and-time/auto-refresh/

- No prose usage guidance found on this page (pure props/API reference). Contextual notes only: `EuiSuperDatePicker` uses this internally for automatic refresh; it is paused by default; `EuiAutoRefreshButton` is a more compact variant; `EuiRefreshInterval` is for standalone form inputs.

## Date & Time — Date Picker Range
Source: https://eui.elastic.co/docs/components/forms/date-and-time/date-picker-range/

- Build a date range control by composing two individual date pickers into `startDateControl` / `endDateControl` rather than a dedicated range widget.
- Apply date-specific configuration (min/max, format, etc.) to the individual date pickers, not the range wrapper.
- If you need relative time, suggested ranges, or refresh intervals, use the "super" date picker instead of a plain range picker.
- Support inline (non-popover) display for calendars directly on the page; drop the shadow styling when inline.
- Make `minDate`/`maxDate` dynamic — update them live based on the current start/end values so users get immediate feedback on allowable ranges.

## Date & Time — Date Picker
Source: https://eui.elastic.co/docs/components/forms/date-and-time/date-picker/

- Labels: avoid long labels but don't sacrifice clarity; push extra detail into help text/tooltips instead of the label.
- Labels: say what the field *is* in the label; don't try to put everything in the label — it becomes hard to scan.
- Hint/help text: place outside the field so it's always visible; keep to a maximum of two sentences.
- Hint text should explain *why* the info is being asked for, clarify expected input, or tell users where to find the requested information.
- Placeholder text: give a simple example of expected syntax/value; don't lead with "for example" / "e.g."; never use placeholder text that adds no value (e.g. "Type here").
- Placeholders supplement labels and help text — they are not a replacement for either, and should be omitted if they add nothing.
- In search-style inputs, be specific about what can be entered / searched for.

## Date & Time — Super Date Picker
Source: https://eui.elastic.co/docs/components/forms/date-and-time/super-date-picker/

- Accept both datemath strings (`now`, `now-15m`) and ISO absolute dates for start/end values.
- Quick-select interactions fire the change callback immediately; Absolute/Relative/Now tab changes require an explicit Update click unless the update button is disabled.
- Cap the "recently used ranges" list at around 10 items to keep it usable.
- In quick-select-only mode, surface the selected time period somewhere else in the UI since the input fields are hidden.
- If managing refresh state independently and only need auto-refresh (no time range picking), consider the dedicated auto-refresh component instead of the full super date picker in that mode.
- Time zone display is informational only — it does not affect internal date handling/calculations.

## Forms Layout — Compressed Forms
Source: https://eui.elastic.co/docs/components/forms/layouts/compressed-forms/

- Reserve compressed forms for space-constrained, editor-style contexts (creating/editing content inline) — not for a page whose main purpose *is* the form.
- Do not mix compressed and non-compressed controls in the same form; apply `compressed` to every control in the form consistently.
- Use the column-compressed display to put labels and inputs side-by-side for maximum space efficiency.
- Keep help text brief and validation-focused in compressed/horizontal layouts; for longer explanations, use a tooltip on the label (e.g. via a question icon) instead of inline help text.
- Always use the compressed form variant for controls that live inside a popover.
- Any control not wrapped in a form-row-equivalent still needs an `id`, and labeling attributes (`htmlFor`, `aria-label`) must be applied carefully to preserve screen-reader support.

## Forms Layout — Form Control Layout (building blocks)
Source: https://eui.elastic.co/docs/components/forms/layouts/controls/

- No prose usage guidance found; page is a props/API reference for internal "building block" layout components used for visual consistency.

## Forms Layout — Described Form Groups
Source: https://eui.elastic.co/docs/components/forms/layouts/described-groups/

- Use this pattern to group associated form controls/rows and show explanatory text alongside the group (description column next to fields).
- On mobile, the two-column description/field layout collapses to a stacked layout automatically.
- If expanding beyond the ~800px default max-width, apply full-width to the group, its rows, and the individual fields together.
- Use the ratio setting to rebalance description vs. field column width — bias toward the field column (narrower description) when the field needs more room.
- Use a real heading element for the group's title text, for accessibility.
- The description column enforces a minimum readable width so it can't be squeezed illegibly.

## Forms Layout — Form Control Buttons
Source: https://eui.elastic.co/docs/components/forms/layouts/form_control_buttons/

- Only use a form-control button inside a form control layout wrapper — this keeps visual consistency with other inputs.
- Appropriate when you need an interactive element (opens a popover, triggers an action) that should still look like part of the input.
- Use value/placeholder-like content on the button so it reads similarly to a normal input.
- When the button represents a dropdown toggle, mark the parent layout as a dropdown so icon spacing accounts for it correctly.

## Forms Layout — Labels
Source: https://eui.elastic.co/docs/components/forms/layouts/label/

- Prefer the row-level `label` as the primary way to give a form element an accessible name.
- When wrapping a control that already renders its own visible label (switches, buttons, links), tell the row not to duplicate the label.
- For implicit/custom labeling, either duplicate the label text into `aria-label` or point `aria-labelledby` at the label element's id.
- Use a fieldset (with `<legend>`) for grouped controls (e.g., checkbox/radio groups) when individual control labels don't give enough context on their own.
- Test complex/custom label implementations with an actual screen reader before shipping.

## Forms Layout — Prepend / Append
Source: https://eui.elastic.co/docs/components/forms/layouts/prepend-append/

- Use dedicated prepend/append content wrappers to keep consistent styling; plain strings are auto-wrapped.
- Make a prepend/append interactive (button-like) only when a single click action is needed — interactions here are limited to one action.
- When the form row has a label, that label auto-associates with the control as expected.
- Passing an id to the layout/control lets non-interactive prepend/append text auto-render as a semantic `<label>`.
- If both prepend and append are present and only one should act as the label, explicitly suppress labeling on the other.
- For standalone controls without an id (no form row), supply `aria-label`/`aria-labelledby` yourself for accessibility.

## Forms Layout — Rows
Source: https://eui.elastic.co/docs/components/forms/layouts/row/

- Use the form-row pattern to associate a control with its label, help text, and error text; group several rows inside a form wrapper.
- Always provide a label when possible; if you truly can't use the label prop, fall back to `aria-label` or `aria-labelledby` pointing at an external label node.
- Form elements default to a fairly narrow max-width (~400px) — use full-width sparingly, typically for isolated controls like search bars or sliders, not as a blanket default.
- Full-width can be set once at the form level to cascade to all rows/controls instead of setting it per-row.
- For inline/horizontal forms, use a flex layout and collapse (don't grow) items like trailing buttons.
- Rows without a visible label still need an "empty label space" placeholder in inline layouts to keep alignment with labeled siblings.
- Size individual inline controls through their flex-item width/grow, not the input itself — inputs resize automatically.
- Use a centered row-content mode when the row wraps non-form-control content that needs vertical centering against neighboring controls.

## Forms Layout — Validation
Source: https://eui.elastic.co/docs/components/forms/layouts/validation/

- Mark invalid state and attach error content at the row/form level (not ad hoc styling on the input).
- Support multiple simultaneous error messages by passing them as a list, not a single string.
- Allow suppressing the aggregated error callout when it's redundant with inline messaging.
- Required-but-blank fields should get simple, minimal error copy.
- Error messages must be actionable: say what's wrong and how to fix it (e.g. name the duplicate value).
- Be as specific as possible — e.g., name the actual forbidden character rather than a generic "invalid input" message.
- Keep error language clear so users immediately understand what's required next.

## Forms — Numeric Field
Source: https://eui.elastic.co/docs/components/forms/numeric/

- Wrap number fields in the standard form-row pattern for accessible label/help/error association.
- When `min`/`max`/`step` are set, the field validates natively and shows its own error state — don't duplicate that validation separately.
- Keep labels short and clear; push extra explanation into help text.
- Help/hint text: outside the field, always visible, max two sentences; use it to explain why the info is needed, the expected format, or where to find it.
- Placeholder is a syntax/format example only, never a label/help-text substitute; don't start it with "for example"/"e.g." and don't use content-free filler like "Type here."
- In a search context, be specific about the kind of numeric value expected.

## Forms — Range Sliders
Source: https://eui.elastic.co/docs/components/forms/numeric/range-sliders/

- Use a range slider only when the exact value doesn't matter much; if precision matters, add a visible numeric input alongside it (or use a plain number field instead).
- Always show the min/max labels — technically optional, but needed so users understand the range.
- Show the current value (tooltip-style) for single-handle sliders, optionally prefixed/suffixed with units; don't do this for dual-handle sliders since two tooltips don't fit.
- Dual-range sliders show the filled range by default; read their value via the change callback, not a native DOM value, since two-value range inputs aren't part of the HTML5 spec.
- Offer a companion input for entering a precise value directly when exactness matters.
- Keep tick marks usable: maintain a minimum ~5px per tick, and reduce tick density responsively at narrow widths.
- Give tick labels simple, screen-reader-friendly text, or provide an explicit accessible label separate from the visual tick label.
- When using colored severity/level indicators alongside the slider, connect them to the slider via `aria-describedby` pointing at the help text.

## Forms — Color Picker
Source: https://eui.elastic.co/docs/components/forms/other/color-picker/

- Accept both hex and RGB(a) as valid text-entry formats; return both formats as output.
- Custom swatches must be provided in hex or RGBa.
- Use "fixed" palettes for categorical data and "gradient" palettes for continuous data.
- Turn on the alpha channel control only when opacity is a meaningful part of the value being picked.
- Use inline display (no input/popover chrome) when the picker is the primary content of its container rather than a form field.
- Add a "clear to default" affordance only when clearing the color has real semantic meaning in your use case.
- Customize the empty-state placeholder text when the default "Transparent" label isn't appropriate for your context.

## Forms — File Picker
Source: https://eui.elastic.co/docs/components/forms/other/file-picker/

- No prose usage guidance found; page is a pure props/API reference.

## Forms — Color Palette Picker
Source: https://eui.elastic.co/docs/components/forms/other/palette-picker/

- Use to let users choose a palette for data visualizations (maps, charts).
- Match palette type to data structure: fixed/categorical palettes for categorical data, gradient palettes for continuous data.
- Prefer the interactive picker over a read-only display component whenever the palette is actually being applied/selected (reserve the display-only variant for showing the currently active palette, not for selection).
- Require an `onChange` handler — the picker is meant to drive an actual selection, not just render.

## Forms — Search & Filter: Expression
Source: https://eui.elastic.co/docs/components/forms/search-and-filter/expression/

- Every expression needs both a description (left, "what") and a value (right, "the setting") to make sense.
- Make an expression clickable (button-like) only when it's actually editable.
- Color only applies to the description half of the expression, not the value.
- When chaining multiple expressions together, let them wrap inline at natural/logical break points rather than forcing a rigid single line.
- Switch to a column layout when descriptions/values are variable-length or long, instead of cramming them into an inline sentence.
- In column layout, right-align the description column and keep consistent width across the group.
- Use the invalid/error state to flag a bad expression — it overrides any custom color with the error color and icon.
- Truncate string description/value with the truncate option; for non-string (node) content, truncate the sub-children directly instead.

## Forms — Search & Filter: Search Bar
Source: https://eui.elastic.co/docs/components/forms/search-and-filter/search-bar/

- When a field is typed as a date, its query values must be quoted (e.g. `created:'2019-01-01'`).
- Placeholder text should be specific about what can be searched, not generic; phrase it as the action the user is performing ("find…", "search…"), not the field's mechanics, and avoid ellipses.
- If you hide the built-in error tooltip, you must wire up `aria-describedby` yourself so screen readers still announce validation errors.
- Hints/help text: outside the field, always visible, max two sentences, explaining why/what/where.
- Keep labels short — push detail into help text.
- This is Elasticsearch-Query-DSL-flavored search syntax; for a simpler generic search need, use the basic search field component instead.

## Forms — Search & Filter: Basic Search Field
Source: https://eui.elastic.co/docs/components/forms/search-and-filter/search/

- Wrap in the standard form-row pattern for accessible label/help/error association.
- Use the search-submit callback for Enter-triggered search; enable incremental mode if you want search-as-you-type instead.
- Keep labels concise; use help text for the rest.
- Hint text: outside the field, visible always, max two sentences, explains why/expected-format/where-to-find.
- Placeholder: example value or syntax only, not a label replacement; omit if it adds nothing; avoid generic filler.
- In search fields specifically, hint at what's searchable and phrase placeholders as the user's action rather than describing the field.

## Forms — Selection Overview (choosing the right control)
Source: https://eui.elastic.co/docs/components/forms/selection/overview/

- Fewer than ~7 options where all should be equally visible at once → radio group.
- Up to ~12 options where only the *selected* option needs visibility → basic select (native), preferred over custom widgets for its built-in accessibility/affordances.
- Up to ~12 options needing custom rendering per option → "super select," but only reach for it when actually necessary; a plain select remains more accessible.
- More than ~12 options → need a searchable/filterable widget (combo box or selectable), not a plain select/radio group.
- Fewer than ~7 options for *multi*-select with all choices visible → checkbox group.
- For most multi-select needs beyond a small checkbox group → the "selectable" list component, optionally with a search box for many options or without one for fewer.
- When selected values must stay visible and unselected options hidden (rather than shown as a filterable list) → combo box, not selectable-with-pills.
- Need the ability to explicitly exclude an option (not just include) → only the selectable component supports this.
- Need to let users type in a brand-new value not in the list → only the combo box supports this.
- General principle: native form controls (select/radio/checkbox) are more familiar and generally more accessible than custom-built equivalents — default to native unless a custom widget's capability is actually required.

## Forms — Select (Basic)
Source: https://eui.elastic.co/docs/components/forms/selection/basic-select/

- Use for choosing among roughly 7–12 options; below ~7, prefer a radio group instead (all options visible at once).
- Labels: short and clear, with detail pushed to help text/tooltips.
- Hint text: outside the field, always visible, max two sentences.
- Placeholder text describes the expected value/format; don't lead with "for example"/"e.g." and avoid generic filler like "Type here."
- Placeholder supplements the label/help text, never replaces them.
- Wrap in the form-row pattern for accessible label/help/error association.

## Forms — Checkbox & Checkbox Group
Source: https://eui.elastic.co/docs/components/forms/selection/checkbox-and-checkbox-group/

- Use checkboxes for multiple selections from a small list; for longer lists, consider a dropdown-style control instead.
- Checkboxes can also serve as on/off toggles, as an alternative to a switch.
- Always give a checkbox a label — it enlarges the clickable target and is required for screen-reader access.
- Use the indeterminate state for hierarchical/parent checkboxes when only some children are checked.
- Labels: 1–2 descriptive words, sentence case, positive/active phrasing ("Use logs" not "Do not include logs"); keep structure consistent within a group (all fragments, all sentences, or all numbers — don't mix); no ending punctuation except a clarifying question mark.
- Add a legend to a group when the individual labels alone don't give enough context; legend text should be a noun phrase describing the choice set, not a repeat of the options or an instruction.
- Use the compressed variant to tighten row spacing when space is limited.

## Forms — Combo Box
Source: https://eui.elastic.co/docs/components/forms/selection/combo-box/

- Use when there are many options and users need to search, when users need to select multiple options, or when users should be able to add their own custom value.
- Labels short/clear; help text/tooltip for the rest; complete sentences with end punctuation when help text is descriptive prose.
- Hint text outside the field, always visible, max two sentences, explaining why/format/where.
- Placeholder gives a real example, not "for example"/"e.g." phrasing, and is additive to (not a substitute for) label/help text; keep brief; be specific in search-bar contexts.
- Because the ability to add a custom option isn't obvious, explain it in help text when that capability is enabled.
- Provide `aria-label`/`aria-labelledby` when the combo box is rendered without a visible label.

## Forms — Radio & Radio Group
Source: https://eui.elastic.co/docs/components/forms/selection/radio-and-radio-group/

- Ideal for a small set of options (more than 2, ideally no more than 6); beyond that, use a dropdown-style selector instead.
- All radios in one group must share the same name attribute so they behave as a single group.
- Always give each radio a label, for a larger click target and screen-reader support.
- Labels: 1–2 words, positive/active phrasing describing the result of selecting it, sentence case, consistent structure across the group, no repeated words across options, no title case, no ending punctuation (question marks OK if clarifying).
- Add a legend when individual option labels don't sufficiently describe the group as a whole; legend should be a descriptive noun phrase, not a repeat of the choices or an instruction.

## Forms — Selectable
Source: https://eui.elastic.co/docs/components/forms/selection/selectable/

- Not meant for primary navigation, but fine for building the contents of a popover-style navigation menu.
- Single-selection mode can allow zero-or-one selected, or force exactly one always selected.
- Exclusion mode (allowing an explicit "off"/excluded state, not just checked/unchecked) is opt-in and cycles on → off → unset; the fully "mixed"/indeterminate state can only be set programmatically, not reached by user clicks.
- Search matches against the option label by default; supply a separate searchable label when the visible label isn't what should be matched.
- Constrain width via CSS when used inside a popover so it doesn't expand/contract with content.
- Defaults to a capped visible height (~7.5 items); allow it to stretch and fill its container when appropriate.
- Turn off virtualization in tests so all options render to the DOM.
- Long text truncates at the end by default.
- If virtualization is on, every row must be the same height, or scroll position calculations break.
- Hide the check/cross selection icons when they're not meaningful for your use case.

## Forms — Super Select
Source: https://eui.elastic.co/docs/components/forms/selection/super-select/

- Wrap in the form-row pattern for accessible label/help/error association.
- Use custom input/dropdown display to show richer content (descriptions, multi-line text) than a native select allows.
- Use placeholder content (can be a full React node matching your custom display) for the no-selection state.
- Labels short/clear; help text for the rest; hint text outside the field, max two sentences, explaining why/format/where.
- Placeholder is an example/format hint, not a label replacement; avoid "for example"/"e.g." and generic filler; omit if it adds nothing.
- In search contexts, be specific and phrase around the user's action.

## Forms — Switch
Source: https://eui.elastic.co/docs/components/forms/selection/switch/

- Use a switch instead of a checkbox specifically when the label's semantics describe a true binary on/off state.
- Always pass a label for a larger click target and screen-reader access.
- If the switch's state is itself used as the visible label text, connect it via `aria-describedby`; only hide the visible label when the switch is otherwise described (e.g. by its form row).
- Labels: use a static noun naming the feature being toggled (e.g. "Malware protection"), or an action verb ("Use A", "Show B") backed by help text; for lists of existing items, use past tense ("Log enabled").
- Don't phrase labels as conditionals ("If enabled…"); don't use vague verbs with no object; don't dynamically rewrite the label text to reflect current state.

## Forms — Text Fields (Basic)
Source: https://eui.elastic.co/docs/components/forms/text/

- Wrap in the form-row pattern for accessible label/help/error association.
- Labels short but clear; extra detail goes in help text/tooltips, not the label.
- Help text outside the field, explaining why/expected-format/where-to-find; max two sentences.
- Placeholder shows expected format/example, never replaces label+help text; avoid "for example"/"e.g." and content-free filler ("Type here"); keep short; omit if it adds nothing.
- Only fall back to using the label itself as placeholder text when space is severely constrained and the UI is very simple.
- In search-bar placeholders, be specific about searchable content, phrase around the user's action, and avoid ellipses.

## Forms — Inline Edit
Source: https://eui.elastic.co/docs/components/forms/text/inline-edit/

- Use the inline-edit text variant for single-line text updates outside a full form context; use the title variant when the editable content is a heading (preserves semantic heading level).
- Drive the value as a controlled prop, handling change/cancel via callbacks.
- Validate on save: return false from the save callback to stay in edit mode with a validation message, true/undefined to return to read mode.
- Show placeholder text in both read and edit modes to indicate what's being edited.
- Default to read mode; only start in edit mode when that's genuinely the right default for the context.
- Support a locked read-only mode that still displays the value without allowing edits.
- Because there's no visible form label on the underlying input, an accessible input label is required.
- For the title variant, specify the correct semantic heading level (or a non-heading span) to keep document structure correct.

## Forms — Password Field
Source: https://eui.elastic.co/docs/components/forms/text/password/

- Wrap in the form-row pattern for accessible label/help/error association.
- Default behavior masks input as a standard password field.
- Offer the visibility-toggle ("dual") variant so users can reveal/hide the password — called out as more user-friendly and more accessible than a plain masked field.
- Label should simply say what the field is; put anything extra in help text.
- Hint text: max two sentences, outside the field, explaining why/format/where.
- Placeholder is an additive example, not a replacement for label/help text; avoid "Type here"-style filler.

---

## Data Grid — Overview
Source: https://eui.elastic.co/docs/components/data-grid/

- Use a data grid instead of a basic table for large tabular datasets with many columns of uniform/structured data, especially when column schemas and sorting matter for comparing values.
- The grid's strength is rendering large amounts of data compactly, not content-authoring — it's optimized for display/interaction, not for building rich content areas.
- Cells are forced into truncation to stay compact; use cell popovers to reveal full content and any per-cell actions rather than trying to show everything inline.
- Assign schemas to drive both how a column renders and how it sorts, instead of hand-rolling per-column render/sort logic.
- Use leading/trailing "control columns" for repeatable per-row UI like checkboxes or action buttons.
- Let the toolbar (when enabled) be the mechanism for users to reorder/show/hide columns rather than building a separate custom control for that.
- Virtualization kicks in automatically once the grid is height/width constrained into a scrollable container — you don't need to manually manage it in that case.

## Data Grid — Custom Body Rendering
Source: https://eui.elastic.co/docs/components/data-grid/advanced/custom-body-rendering/

- Treat custom body rendering as an escape hatch for advanced cases only — use it when the default virtualized rendering genuinely can't produce the row layout you need, not as a default approach.
- If you take on custom rendering, you also take on full responsibility for the grid's required semantics/ARIA structure and for keeping keyboard focus/navigation accessible.
- You must manually slice the dataset by the current start/end row range to simulate pagination yourself.
- Custom rendering must respond to column visibility/order changes (hidden/reordered columns) using the visible-columns info the grid provides.
- Trigger any custom-grid-body prop updates from inside an effect hook, not directly during render, for correct lifecycle behavior.

## Data Grid — In-Memory
Source: https://eui.elastic.co/docs/components/data-grid/advanced/in-memory/

- Push as much as performance allows into in-memory mode — use the highest available level (full in-memory sorting) whenever feasible, since it's explicitly called out as in the app's best interest.
- The in-memory levels are progressive (schema-detection only → + pagination → + sorting); pick the lowest level that meets your needs, but understand each level builds on the one before it.
- Enabling in-memory automatically improves schema auto-detection accuracy from available data.
- Without schemas or without in-memory sorting enabled, the grid falls back to naive JS sorting, which handles numeric data and React-element content poorly — don't rely on default sort for anything beyond simple strings.
- Once you commit to in-memory operations at one level (e.g. pagination), you cannot go back to server-side calls for subsequent operations — all downstream operations must stay in-memory too.
- Exclude specific columns from in-memory processing via the skip-columns mechanism when needed (e.g. action columns).
- Even with in-memory enabled, the application still owns and must persist the sort-column state itself; the grid only calls back when sorting changes.

## Data Grid — Ref / Imperative API
Source: https://eui.elastic.co/docs/components/data-grid/advanced/ref/

- When a modal/flyout opened from a cell closes, explicitly restore focus back into the grid — otherwise keyboard/screen-reader users are left stranded with no focus target.
- Column reordering/hiding changes the meaning of column index — track actual visible position, not the original column order, when addressing cells.
- Validate that row/column indices are in range before calling focus/popover methods; out-of-range indices throw.
- Let the grid resolve the correct row location automatically for focus/popover targeting rather than manually computing positions under pagination/sorting.
- Be aware that a "visible row index" concept (current page position) is distinct from "absolute data row" — pick the right one depending on whether pagination/sorting is active.

## Data Grid — Cells & Popovers
Source: https://eui.elastic.co/docs/components/data-grid/cells-and-popovers/

- Support cell copy (focus + no selection + copy shortcut) copying the cell's visible/rendered text, not the raw underlying value.
- As soon as any per-cell actions are configured, the cell automatically becomes expandable — this is required so keyboard/screen-reader users can still reach those actions.
- Only the first couple of cell actions show inline beside the expand control by default; the rest move into the popover; be cautious about increasing the inline-visible count.
- For simple popover customization keyed off schema/column, prefer a lightweight "details" flag approach over building a fully custom cell-popover renderer.
- If you build a custom popover and deliberately omit the default cell actions, you must re-implement those actions inside your custom popover — otherwise users lose access to them, which is confusing.
- Only disable a column's cell expansion when you know its width and content length are fixed/bounded; disabling expansion on columns with variable/uncontrolled width plus multiple interactive elements risks trapping focus in truncated, inaccessible content.
- Control columns (row-action columns) are a reasonable place to disable expansion, since their content is bounded by design.
- Use the shared cell-context mechanism to keep cell-render functions static/stable and cut down on unnecessary re-renders, rather than recreating render callbacks from component state each time.

## Data Grid — Container Constraints
Source: https://eui.elastic.co/docs/components/data-grid/container-constraints/

- When embedded in a constrained container (e.g., a dashboard panel), the grid automatically hides some controls and switches to a stricter flex layout based on available width.
- Configure the width threshold at which grid controls enable/disable, rather than relying purely on the automatic default.
- Inside a flex layout, add `min-width: 0` to the containing flex item to avoid the grid breaking that layout.
- Never toggle a grid's height between a fixed value and unconstrained/auto — treat height constraint as fixed for the life of the instance; if you must change it, force a remount.
- Virtualization for performance requires constraining height and/or width (or letting the grid overflow naturally in a scrollable parent) so only visible cells render.
- Use overscan (extra rows/columns rendered beyond the visible area) to keep keyboard tab navigation smooth and reduce visual flashing during scroll — but don't overscan excessively, since that itself hurts performance.

## Data Grid — Schema & Columns
Source: https://eui.elastic.co/docs/components/data-grid/schema-and-columns/

- Supply known column schema up front at data-ingestion time rather than relying on auto-detection when you already know the data types.
- Prefer the built-in schemas (boolean, currency, datetime, numeric, json) before reaching for a fully custom schema detector.
- Custom schema detectors unlock non-alphabetical, type-aware sorting/rendering beyond the defaults.
- Columns default to equal width filling available space unless an explicit initial width is set — set initial widths deliberately for anything that shouldn't be evenly divided.
- Disable resizing on columns where the user shouldn't be allowed to change width.
- Disable the column header action menu entirely for columns that shouldn't offer sort/hide/move actions; or selectively enable/disable individual actions with custom labels/icons.
- On footer/aggregation cells with no real content, turn off cell expansion for usability (no pointless expand affordance on empty footer cells).
- Control columns (checkboxes, row-action buttons) intentionally cannot be resized, sorted, or reordered by the user, and are pinned to the leading/trailing edge of the grid.

## Data Grid — Style & Display
Source: https://eui.elastic.co/docs/components/data-grid/style-and-display/

- Memoize/constant-ize grid style objects outside the component to cut down on re-renders.
- Rows need a minimum height (34px) to render even a single line of text — anything smaller is clamped up to that minimum.
- If the toolbar's density selector is enabled, users can override whatever padding/font-size density the developer set as default — treat developer-set density as just the initial default, not a hard constraint, once that control is on.
- Font-size overrides only work correctly on content that inherits font size or uses relative units — fixed-size child content won't respect the override.
- When customizing line height, make sure it actually matches your real cell content's line height, or row-height calculations will be wrong.
- Use a scroll anchor (start/center) when rows have auto/variable height, to prevent the visible scroll position from jumping unexpectedly as heights are measured.
- Persist user-chosen density/row-height preferences (e.g. to localStorage or a backend) via the relevant change callbacks so choices stick across sessions.
- Let users disable the row-height override control specifically if you don't want them changing engineer-set row heights, even while keeping density adjustable.

## Data Grid — Toolbar
Source: https://eui.elastic.co/docs/components/data-grid/toolbar/

- Toolbar visibility can be toggled wholesale (boolean) or configured per individual control.
- Even when a control is visually hidden, keep it focusable by keyboard/screen-reader users rather than removing it from the tab order entirely.
- If disabling the fullscreen toggle, make sure the grid still fits its container well enough that the remaining controls stay usable.
- For custom controls added to the toolbar, use the matching left-side or right-side control primitives so custom buttons look visually consistent with the built-in ones.
- Keep the set of available toolbar controls consistent across every data grid instance in the app — inconsistent control sets between grids causes user frustration.
- Reserve a fully custom toolbar layout for genuinely unusual needs (rearranging default buttons between sides, interspersing custom controls among default ones, custom responsive behavior) rather than as a default approach.

---

## Tables — Overview (which table to use)
Source: https://eui.elastic.co/docs/components/tables/

- Use the basic table for asynchronous data, or for static datasets that don't need built-in pagination/sorting.
- Use the in-memory table for smaller, synchronous datasets where you want pagination, sorting, and search handled for you automatically.
- Drop down to the raw custom table building blocks only when the table needs fully custom behavior — and understand that doing so means you own data handling, accessibility, and mobile UX yourself.
- The higher-level opinionated table components handle mobile row selection, row actions, row expansion, and mobile UX automatically, which you lose if you go fully custom.
- General framing: tables get complicated fast, which is why EUI offers both a simplified path and a fully flexible path depending on how much control you actually need.

## Tables — Basic Table
Source: https://eui.elastic.co/docs/components/tables/basic/

- Minimum requirement is an items array plus a columns definition describing structure/data extraction per column.
- Use built-in data-type hints for automatic formatting (e.g. numeric right-alignment) instead of a custom render function where possible.
- When a custom render function outputs plain text, mark it as text-only so it wraps properly instead of overflowing.
- For long/explanatory column headers, use the header-tooltip mechanism rather than putting arbitrary rich content directly in the header.
- For row selection, either let it be fully automatic (uncontrolled initial-selection) or fully controlled (external selected state + change callback) — don't mix approaches.
- Only 2 row actions are shown inline; anything beyond that collapses into a popover, and only the first 2 actions marked "primary" stay visible.
- Give each row action a distinct short name and a separate descriptive explanation — reuse the same text for both only when a distinct description genuinely isn't possible.
- For expandable rows, provide the expanded content per row and make sure every row has a stable unique id.
- Use row-level prop injection (conditional classes) for things like highlighting a row rather than special-casing render logic.
- If any column defines a footer, columns without one still render an empty footer cell to preserve layout — don't leave footers inconsistent across columns.
- Default table layout is fixed; switching to auto layout breaks text truncation, so keep fixed layout (with explicit column widths) when you need truncation to work.
- Default mobile-responsive breakpoint can be customized or disabled; enable horizontal inline scrolling for dense tables (this also forces auto layout).
- Pagination/sorting props only control what's displayed — for large/server-driven datasets, your backend must actually perform the sort/paginate operation; the table doesn't do it for you.
- Every row must have a genuinely unique id — duplicate ids break sorting and can silently show fewer rows than expected.

## Tables — Custom Table Building Blocks
Source: https://eui.elastic.co/docs/components/tables/custom/

- When building a fully custom table, you must implement selection and filtering behavior entirely yourself — nothing is provided automatically.
- Provide an explicit mobile-header label per cell so the mobile card view has something to show as the field name.
- To support mobile sorting in a fully custom table, add the dedicated mobile header wrapper and mobile sort item components — this isn't automatic.
- Control per-cell text behavior explicitly: force single-line truncation, or allow non-text children by turning off the text-only assumption.
- Use a sticky header on long tables so column context stays visible while scrolling.
- Use a sticky scrollbar on tables taller than the viewport so the horizontal scrollbar stays reachable at the bottom of the screen.

## Tables — In-Memory Table
Source: https://eui.elastic.co/docs/components/tables/in-memory/

- Column `name` values must be referentially stable (or memoized) across renders, or sorting/comparison logic silently breaks.
- Row selection requires both an item-id accessor and a selection configuration — neither alone is sufficient.
- Choose uncontrolled selection (initial-selected) for simple cases, or fully controlled selection (external state + change callback) when you need to drive selection externally.
- Enabling search gives you a search bar with configurable query syntax.
- Default search syntax is the advanced query-language format; switch to plain-text search mode if your data contains characters that format would treat specially (quotes, parentheses, etc.).
- When the displayed value differs from what should actually be sorted on, supply a function to extract the real sort value rather than sorting on the rendered content.
- Control pagination state (page index/size) externally when the underlying data updates frequently, to avoid an unwanted pagination reset.
- Use the "panelled" style when the table sits outside another EUI container (like a panel or flyout) to give it enough visual contrast on its own.
- Enable sticky header on tables that may exceed the viewport height.

## Tables — Layout Guidelines
Source: https://eui.elastic.co/docs/components/tables/layout-guidelines/

- Enable horizontal scroll with auto table layout to avoid columns getting compressed when content overflows, rather than letting the table squeeze itself illegibly.
- Disable the mobile card view only when the table has 3 or fewer columns and there's a clear UX reason to keep tabular layout on small screens; otherwise keep the responsive card view on.
- Validate table layouts at 400px, 600px (with a flyout open), 1200px, and 2000px — these are the specific widths called out for testing.
- Use `em` units for text-content column widths and `px` units for fixed/static-size elements (e.g., small plots/sparklines).
- For constant-size columns (icon indicators, toggles), set width/minWidth/maxWidth to the same fixed value.
- For columns with a known/predefined set of values (e.g. status badges), set minWidth to fit the longest possible value without truncating.
- For columns holding open-ended user-provided content, size width/min/max based on whatever length constraint exists at the database level.
- Column headers must be concise and must never truncate; use a header tooltip (with a question-mark icon) for supplementary context instead of cramming it into the header text.
- Text alignment: left-align normal text; right-align numbers, metrics, and actions; center-align booleans and icons.
- Never truncate numeric, boolean, or monetary values. Long text columns may truncate after 4 lines, with maxWidth set to prevent them growing further.
- The actions column must be sticky and must be the last column in the table.

---

## Templates — Page Template
Source: https://eui.elastic.co/docs/components/templates/page-template/

- Always start a page with the top-level page-template wrapper, which centralizes shared settings like padding, borders, width restriction, and panel styling.
- The visual stacking order of header/section/empty-state content follows the order those pieces are passed in — order them deliberately.
- A sidebar must be a direct child of the template (not nested elsewhere) because the template needs to clone/adjust it for layout purposes.
- Sidebars stick to the top and scroll independently by default; opt out of stickiness explicitly if that's not wanted.
- When a sidebar is combined with a width-restricted layout, keep a bottom border (full or extended) on the relevant section for visual consistency.
- Use the template's built-in bottom-bar component rather than a hand-rolled one, to avoid overlap bugs with the sidebar across breakpoints.
- Make sure at least one section is allowed to grow so short page content still aligns correctly against a bottom bar.
- Use the template's empty-prompt component for empty/pre-setup states — it automatically centers both vertically and horizontally.
- If your page has a fixed external header, the template auto-computes padding offset for it; override that only if the automatic calculation is wrong for your case.

## Templates — Page Template Guidelines
Source: https://eui.elastic.co/docs/components/templates/page-template/guidelines/

- Use the namespaced sub-components (header/section/etc.) rather than building equivalents by hand, so top-level props and alignment propagate correctly.
- Center whole-page empty/loading/error states both vertically and horizontally.
- Use the built-in empty-state component (auto-centered) rather than manually styling an empty state from scratch.
- When the page is empty, hide UI controls that wouldn't do anything useful yet (filters, etc.) instead of showing disabled versions of them.
- Use the full empty-prompt pattern to replace an entire empty page — don't just swap in a line of text.
- For permission-denied empty states, give specific language about the restriction and link to an admin contact when one exists.
- Don't duplicate the same information between the page header and the empty-state content below it.
- Always give an empty state a clear call to action — an ambiguous empty message with no action is explicitly called out as unhelpful.
- Use exactly one empty prompt per page; never stack multiple empty prompts, since that pushes real content out of view.
- For errors that should coexist with existing content (not replace the whole page), use a callout instead of an empty-prompt/full-page pattern.
- Treat tab panel content as its own full-page-equivalent surface — apply the same empty/loading/error prompt pattern within a tab if that tab's content is empty/loading/errored.
- Keep loading and error state visuals aligned with each other so the transition between them doesn't feel jarring (avoid elements popping in/out between states).

## Templates — Sitewide Search
Source: https://eui.elastic.co/docs/components/templates/sitewide-search/

- Search matching and result highlighting is driven by whatever options are supplied — it highlights the matching portion of the option label automatically.
- No built-in keyboard shortcut (e.g. Cmd+K) is provided — implement any global shortcut yourself if wanted.
- You are responsible for handling the interaction when the component reports back which option was selected.
- Only show a solution/application logo icon when the result links to that application itself (e.g. a top-level "Dashboard" app entry) — not for lower-level items within it.
- Only show a space avatar when more than one space actually exists.
- Reserve the bottom-line metadata text for lower-level, specific items (e.g. an individual dashboard), not top-level entries; use predefined metadata types where available instead of freeform text.
- Use the responsive popover-button props to shrink the control on smaller screens.
- Color mode defaults to the nearest theme provider; override explicitly if the search control and its popover need independent color modes.

---

## Editors & Syntax — Markdown Editor
Source: https://eui.elastic.co/docs/components/editors-and-syntax/markdown/editor/

- Use for markdown-authoring experiences where users create text/code/image content.
- Switch the editor to read-only during async operations (e.g., while a comment is submitting) so users understand it's temporarily locked, rather than leaving it silently editable.
- Configure or strip out default plugins (emoji, checklists, tooltips, etc.) to match what your use case actually needs.
- Use the editor's built-in error prop to surface syntax problems as part of the live editing experience.
- Errors surfaced by the editor are meant to be ephemeral, in-context editing feedback — they are explicitly not a substitute for real form validation; don't rely on them as your only validation layer.
- Control editor height explicitly (fixed pixels or a "full" fill mode) instead of leaving it unbounded.
- Leave auto-expanding preview enabled (the default) so the preview pane doesn't get its own scrollbar.
- Customize the toolbar to add custom buttons/content when the default toolbar doesn't cover your needs.

## Editors & Syntax — Markdown Format (read-only rendering)
Source: https://eui.elastic.co/docs/components/editors-and-syntax/markdown/format/

- Use this specifically for read-only display of markdown content; use the markdown editor component instead when the content needs to be editable.
- Rely on its automatic substitution of raw HTML output (links, code blocks, horizontal rules) into the equivalent styled components rather than hand-styling them yourself.
- It wraps output in the standard text component for styling — expect text-level styling controls (size, color) rather than free-form CSS.
- By default it only renders links that start with `https:`, `http:`, `mailto:`, or `/`, as a security measure against untrusted link schemes — be aware relative links without a leading `/` (e.g. bare `editor` or `../../foo`) won't render as links unless you opt in to allowing document-relative links.

## Editors & Syntax — Markdown Plugins
Source: https://eui.elastic.co/docs/components/editors-and-syntax/markdown/plugins/

- Structure a custom plugin as three separate pieces — the UI/toolbar component, the parsing-plugin logic, and the processing-plugin logic — passed to the editor/formatter as separate lists.
- The parsing plugin list determines whether input is treated as valid syntax and drives feedback to the app; the processing plugin list is what turns parsed nodes into actual rendered output.
- Inline-syntax parsers need a locator function for performance; block-syntax parsers don't need one but can span multiple lines, while inline syntax cannot span lines.
- Inline tags render within paragraph-level containers, block tags render within inline-level containers (a distinction worth getting right when authoring custom syntax).
- A parser must consume exactly the full matched string it claims — partial/loose matching breaks token registration.
- A processing plugin must key off the same type identifier that its matching parser used, or the two won't connect.
- Custom parsers should be inserted at a deliberate position relative to existing built-in parsers (e.g., explicitly before the plain-text parser) so precedence is correct.
- Default plugins can be excluded wholesale via a single exclude option, removing their syntax recognition, rendering, and toolbar button all at once.
- Omit a plugin's toolbar button entirely if the intent is that users can only produce that syntax by typing it, not via a UI affordance.
