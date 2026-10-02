# EUI Design Reference — Utilities & Data Visualization

Condensed design guidance extracted from Elastic UI (EUI) docs, for use as external
reference when auditing this app's UI. This is design guidance only — not about the
`@elastic/eui` React package (this app doesn't use it). Component-prop/API details are
intentionally omitted.

---

## Section 1 — Utilities

### Accessibility
Source: https://eui.elastic.co/docs/utilities/accessibility/

- General principle: if content (especially content providing functionality/interactivity) is important enough for screen-reader users, it should probably be visible to all users — avoid screen-reader-only "secret" functionality.
- Screen-reader-only wrapper content requires a single child element, and must use a "show on focus" behavior when the wrapped element is itself focusable (so keyboard users can see it, not just hear it).
- Live regions: default role is `status` with `aria-live="polite"` for non-intrusive announcements. Live regions must exist in the DOM on initial page load, not be conditionally rendered later — screen readers may miss regions inserted after load.
- Follow standard ARIA role-to-`aria-live` mapping conventions (e.g. `alert`/`assertive` for urgent, `status`/`polite` for routine).
- A "live announcer" pattern should auto-clear its message after a timeout (~2000ms is a reasonable default) and should announce both on mount and on message change.
- A stricter "screen-reader-live" pattern should announce only on message change (not on initial mount), and should support moving focus to the region when text changes, for step-by-step flows.
- Skip links should target the main content region's id, and fall back to the page's `<main>` landmark if that id is missing.

### Auto sizer
Source: https://eui.elastic.co/docs/utilities/auto-sizer/

- Use an auto-sizing wrapper when a component (e.g. virtualized lists/tables) needs explicit pixel dimensions to fill available space in its parent, since such components can't rely on natural CSS flow.
- Supports three patterns: constrain height only, width only, or both — pick the minimum constraint needed rather than always locking both axes.
- No specific numeric sizing conventions are prescribed; this is a structural/layout pattern, not a spacing rule.

### Color palettes
Source: https://eui.elastic.co/docs/utilities/color-palettes/

- Use **qualitative** palettes for comparing discrete/categorical data series.
- Use **quantitative (sequential)** palettes for data on a continuum (e.g. health/status ranges, large geographic or demographic datasets).
- Use **divergent** palettes when interpolating between two opposite halves of a spectrum (e.g. negative→positive, bad→good).
- Color-blind-safe categorical palette is capped at **10 colors**; beyond 10, add another alternate group of 10 rather than inventing arbitrary new hues.
- When placing text on top of palette-colored backgrounds, use a brightened/text-safe variant of the palette for adequate text contrast — don't put text directly on the base saturated colors.
- Palette colors should be contrasted against the current theme's "empty shade" (i.e., the neutral background), not assumed against white.
- **Only the semantic "status" palette (e.g. good/warning/danger) is guaranteed to have proper contrast ratios.** For any other palette, add a secondary, non-color signal (text, icon, pattern) for screen-reader/color-blind users — don't rely on color alone.

### Container queries
Source: https://eui.elastic.co/docs/utilities/container-queries/

- Media queries answer "how wide is the *screen*?" — they break down for reusable components placed in varying layout contexts (sidebars, cards, grids).
- Container queries answer "how much space do *I* have?" — use them for reusable components (cards, tables) whose ideal appearance depends on their container's width, not the viewport.
- Use container queries when a component must react to layout changes (e.g. a sidebar expanding) independent of the browser viewport.
- Prefer container queries over ad hoc JS-driven layout classes to reduce React re-renders triggered by resize handlers.
- Handle layout transforms triggered by container-query breakpoints in CSS/CSS-in-JS wherever possible, not JS, for performance.
- No fixed breakpoint values are standardized — breakpoints are chosen per-component based on that component's own content needs (example given: `(width > 400px)`).

### CSS utility classes
Source: https://eui.elastic.co/docs/utilities/css-utility-classes/

- Display utilities (`block`, `inline`, `inline-block`, `full-width` inline-block) exist for one-off layout fixes.
- Vertical-alignment utilities (`top`, `middle`, `bottom`, `baseline`) exist for aligning inline/inline-block elements relative to surrounding text/content.
- These utility classes are meant for **micro-adjustments** to existing components, not as a primary styling system — reach for real component/layout styles first.

### Copy
Source: https://eui.elastic.co/docs/utilities/copy/

- Copy-to-clipboard controls should use a two-state tooltip: a "before" message signaling the action is available, switching to an "after" confirmation message (e.g. "Copied") once the copy succeeds — don't leave the user without confirmation feedback.
- Copy affordances need a proper accessible label (e.g. `aria-label`) so the action is announced to assistive tech, not just visually implied by an icon.

### Delay
Source: https://eui.elastic.co/docs/utilities/delay/

- When repeatedly updating an ARIA live region, delay rendering by a **minimum ~500ms** before showing new content, to avoid overwhelming screen readers with rapid-fire announcements.
- Loading indicators / conditionally-rendered elements should stay visible for a **minimum ~1000ms** once shown, even if the underlying condition resolves faster — this avoids "flicker" where a spinner flashes and disappears too quickly to register.
- General principle: enforce minimum visibility/display durations to prevent jarring UI flicker during fast state transitions.

### Error boundary
Source: https://eui.elastic.co/docs/utilities/error-boundary/

- Put error boundaries at **high levels** of the tree where you can't vouch for lower-level code's error handling (e.g. around lazy-loaded/async components) — not around every small component.
- Ideally users should *never* see the boundary's fallback: components that can throw during render should catch and render their own specific error message first; the boundary is a last-resort safety net, not the primary error UX.
- While a component is in an error state, hide or disable any controls that would trigger further server-side writes, to avoid corrupting state through a broken UI.
- Alternatively, make the component itself "error aware" so it can self-manage which controls to hide, rather than delegating that to the boundary.
- Keep error-boundary fallback styling/behavior consistent across the whole product rather than ad hoc per boundary.

### Focus trap
Source: https://eui.elastic.co/docs/utilities/focus-trap/

- Use a focus trap to prevent keyboard focus from leaving a defined area — essential for modals, flyouts, and other temporary overlays so Tab order stays inside the dialog.
- Focus traps matter especially for portal-rendered content, where DOM order no longer matches visual/logical order.
- Support "click outside closes/disables the trap" as an interaction option for dismissible overlays.
- Consider blocking pointer events on everything outside the trap while it's active (full modal isolation) vs. allowing outside interaction, as a deliberate choice.
- When multiple iframes are present, focus should not silently escape between them — trap across frames if that's a risk.
- Delay a trap's "close" callback on mouseup (rather than mousedown) to avoid conflicting with the toggle button that opened it (prevents immediate re-open/close race).
- On close, return focus to the element that originally triggered the overlay — don't leave focus lost on `<body>`.

### Highlight and mark
Source: https://eui.elastic.co/docs/utilities/highlight-and-mark/

- Search-result highlighting should support matching against a single term or multiple terms, and support "highlight all occurrences" as a mode.
- Support a case-sensitivity (strict-match) toggle for highlighting.
- Use the semantic `<mark>` element for simple highlighted text so it's identifiable to assistive tech, not just a styled `<span>`.
- Provide optional screen-reader helper text alongside highlighted matches so the highlighting is announced, not only visually implied.

### HTML ID generator
Source: https://eui.elastic.co/docs/utilities/html-id-generator/

- Generate unique, collision-free ids for any DOM element that needs one for ARIA relationships (`aria-labelledby`, `aria-describedby`, `for`/`id` form pairs, etc.) rather than hardcoding ids.
- Support prefixes/suffixes so generated ids stay human-readable and traceable to their component/purpose.
- A single generator instance can be reused to mint multiple related ids that share a common base — useful for grouping ids belonging to one component instance.
- In component code, memoize the generated id so it's stable across re-renders and only changes on full unmount/remount (or explicit new args) — unstable ids break ARIA references.
- Stable, predictable id generation is itself an accessibility requirement: ARIA relationships silently break if ids regenerate unexpectedly.

### I18n
Source: https://eui.elastic.co/docs/utilities/i18n/

- All default UI strings — including ARIA labels (e.g., on icon-only buttons) and visible text (e.g., "1 of 24" pagination indicators) — should be externalized as translatable tokens, not hardcoded.
- Support variable interpolation inside localized strings (e.g. `"Signed in as {name} ({email})"`) so dynamic values can be injected without breaking translated sentence structure.
- Route numeric values through a dedicated locale-aware number formatter rather than interpolating raw numbers, so digit grouping/decimal conventions match the user's locale.
- Note: no explicit pluralization or RTL guidance was given on this page — treat as a gap to handle separately if relevant.

### Inner text
Source: https://eui.elastic.co/docs/utilities/inner-text/

- When you need the flattened text content of a component whose children may include nested/mixed sub-components, extract it via a ref-based utility rather than manually walking the DOM — useful for things like generating a `title` attribute or accessible name from rendered content.

### Mutation observer
Source: https://eui.elastic.co/docs/utilities/mutation-observer/

- No explicit "when to use" design guidance is given beyond the mechanical description (a wrapper for watching DOM mutations to an element and its children). Treat as a low-level tool for cases where you must react to arbitrary DOM changes.

### Outside click detector
Source: https://eui.elastic.co/docs/utilities/outside-click-detector/

- Use an outside-click detector to trigger a handler (typically dismiss/close) when the user clicks outside a wrapped element — the standard pattern for closing popovers, menus, and non-modal overlays.
- Caveat: native `<select>` elements can normalize browser events in ways that prevent outside-click detection from firing reliably — test dismiss behavior around native form controls specifically.

### Overlay mask
Source: https://eui.elastic.co/docs/utilities/overlay-mask/

- An overlay mask should obscure/de-emphasize the main content to direct attention to the modal/flyout it accompanies — don't use overlays casually; per Nielsen Norman Group guidance (cited), weigh the cost of interrupting/blocking the user's context before defaulting to a modal.
- Always provide a visible, keyboard-accessible close control on anything shown behind an overlay mask.
- Pair the mask with a focus trap so keyboard focus and dismissal behavior are coordinated.
- Z-index relative to navigation headers is a deliberate choice: overlay **above** the header for modals (header should be obscured); overlay **below** the header for flyouts (header should stay visible/usable).
- Default to a fade-in animation on the mask; allow disabling it when performance or motion-sensitivity requires.

### Portal
Source: https://eui.elastic.co/docs/utilities/portal/

- Render fixed/floating elements (modals, tooltips, toasts) into a portal appended to `<body>` to sidestep ancestor `z-index`/`overflow: hidden` stacking-context traps.
- If anchoring a portal relative to a specific sibling DOM node, be aware that node could be removed by an unrelated component update — portal placement needs to account for component lifecycle, not just initial mount.
- For portal-rendered interactive overlays (custom flyouts, etc.), accessibility requires deliberate wiring: a focus trap to keep keyboard focus inside; an outside-click handler tied to the overlay mask for dismissal; a window-level Escape-key listener for keyboard dismissal; and `aria-labelledby` pointing at a heading id so screen readers announce the overlay's purpose on open.
- Conventionally include a close button in the top-right corner as a discoverable visual affordance, and use shared panel/theme styling so portal content still looks like it belongs to the app.

### Pretty duration
Source: https://eui.elastic.co/docs/utilities/pretty-duration/

- Never show raw timestamps/date-math strings to end users — always convert start/end date ranges (whether absolute ISO timestamps or relative "now-15m"-style expressions) into a human-friendly phrase.
- Support a configurable set of "quick range" presets (e.g. Today, This week, Week to date, etc.) so common ranges render as recognizable labels rather than computed dates.
- Make the human-readable date format itself configurable, since appropriate formatting varies by context/locale.

### Provider
Source: https://eui.elastic.co/docs/utilities/provider/

- Use exactly **one** app-level theme/style provider at the root; nested/duplicate providers should be disabled automatically since they cause conflicting styles.
- Default color mode (light/dark) should follow the OS-level preference when not explicitly set — don't force light mode by default.
- Separate "global reset styles" from "utility classes" as independently toggleable layers, so an app can opt out of either without losing the other.
- Respect an OS/browser-level high-contrast preference by default (mirroring the `prefers-contrast` media feature) rather than requiring a manual app setting.
- When multiple stylesheet systems coexist, control style-injection order explicitly (e.g. via a dedicated `<meta>` anchor) so app styles can reliably override or be overridden as intended.
- Prefer setting shared component-level defaults (e.g. consistent table/popover/tooltip/focus-trap/flyout behavior) once at the provider level over repeating the same prop on every instance.

### Resize observer
Source: https://eui.elastic.co/docs/utilities/resize-observer/

- Use a resize observer (rather than a mutation observer) specifically when you need to react to an element's **content box dimensions changing**, not general DOM structure changes — it's the more efficient, purpose-built tool for size tracking.
- Prefer it over polling or window-resize listeners for tracking a specific element's own size.

### Scroll
Source: https://eui.elastic.co/docs/utilities/scroll/

- Accessibility requirement: any independently scrollable region must be keyboard-focusable (`tabindex="0"`) so keyboard-only users can scroll it — this satisfies the "scrollable-region-focusable" a11y rule (a common automated-audit failure otherwise).
- Apply minimal/themed scrollbar styling to inner-page scroll containers (panels with `overflow: auto`) rather than leaving default OS scrollbars, but keep this lightweight — it's meant for small "inner" scroll regions, not full-page scroll.
- For vertical-only scroll containers, an optional "shadow mask" variant fades the top/bottom edges to visually signal more content is available above/below; when using it, add internal padding so the shadow doesn't visually overlap real content.
- Horizontal scroll should be used **sparingly** — mainly in full-height layouts or item grids — and, like vertical, should get side padding plus shadow masking to avoid the mask overlapping content.
- A "full height" utility (stretch to parent height, `overflow: hidden`, flex-grow in flex contexts) is the standard way to make a panel fill available vertical space.

### Text diff
Source: https://eui.elastic.co/docs/utilities/text-diff/

- Use semantic HTML for diff output by default: `<del>` for deletions, `<ins>` for insertions, unchanged text unwrapped — this keeps the diff meaningful to assistive tech even before any custom styling.
- Diff output should be wrapped in an appropriate contextual container (body text, code block, etc.) matching where the diff is shown — it's not meant to stand alone.
- Diff comparison detail is a performance trade-off: a higher comparison timeout yields a more detailed/accurate diff at the cost of compute time; a low default (~0.1s) favors responsiveness.

### Window events
Source: https://eui.elastic.co/docs/utilities/window-events/

- Manage window-level (`document`/`window`) event listeners declaratively so they're automatically removed on unmount — manually-attached global listeners are a common source of leaks ("silently responding to events in the background for the life of the app").
- To prevent one global listener from firing for events meant for a specific nested component, call `event.stopPropagation()` at the lowest, most specific level that actually handles the event — don't rely on checking `event.target` deep in a global handler.
- Reserve window-level listeners for interactions that genuinely can't be captured on a specific element (e.g. global mouse-position tracking, global Escape-key handling) — default to element-level handlers otherwise.

---

## Section 2 — Data Visualization

### Dashboard good practices
Source: https://eui.elastic.co/docs/dataviz/dashboard-good-practices/

- **Proximity/closure**: place related charts physically close together; charts sharing a data type or a conceptual link shouldn't be scattered across the dashboard — grouping reduces the user's effort to connect them.
- **Visual hierarchy**: use spatial positioning (Gestalt principles) to signal importance — primary/headline charts should be visually prominent; secondary/supporting charts arranged to build a narrative from main insight to supporting detail, not randomly scattered.
- **Color coordination across charts**: when multiple charts on the same dashboard show related data, use matching colors for the same series/category across all of them — this lets the color itself act as an implicit legend and removes the need to re-label or re-explain on every chart.
- **Metric + detail pairing**: pair a big-number/metric chart with a detailed line chart of the same underlying data, using the same color, to visually link summary and detail without extra labeling.
- **Design questions to answer before building a dashboard**: Who is the audience and what's their domain skill level (sets how much explanatory text/depth is needed)? What time constraints do viewers have (favor at-a-glance clarity over dense layouts)? What are the primary vs. secondary goals (drives which charts get prominence)?
- **Core purpose test**: a dashboard should present the most important information needed to achieve one or more objectives, consolidated on a single screen for at-a-glance monitoring — if it requires scrolling/hunting to get the key read, it's failing this test.
- No prescribed numeric limits on chart count, sizing ratios, or grid dimensions are given — these are treated as context-dependent, not fixed rules.

### Accessibility features (charts)
Source: https://eui.elastic.co/docs/dataviz/accessibility-features/

- Every chart should get an accessible name: either a visually-hidden label string, or a reference to an existing visible heading/element — don't leave charts with no accessible name.
- If using a hidden label, it can be exposed at a specific heading level (h1–h6) so it fits correctly into the page's heading outline, rather than defaulting to plain-paragraph semantics.
- Provide a chart description (hidden text or reference to existing descriptive text) in addition to the label — the label names the chart, the description explains what it shows.
- Don't rely solely on an auto-generated default summary — the automatic summary is minimal (reports only the chart type(s)), so add a real `ariaDescription` for anything beyond a trivial chart.
- For hierarchical/part-to-whole charts (sunburst, treemap, icicle, flame, mosaic, waffle), provide a visually-hidden **data table** as a text alternative — chart shape alone is not screen-reader-accessible for these types.
- For area/bar/histogram (XY) charts, use **texture fills** (not just color) to distinguish series — critical for color-blind and low-vision users, and for grayscale printing.
- For goal/gauge charts, use labeled bands (not just color-coded regions) to give each threshold segment a semantic name, so status isn't communicated by color alone.
- Gap noted: this page does not give numeric color-contrast ratios or chart keyboard-navigation patterns — cross-reference general WCAG contrast guidance (e.g. 3:1 for graphical objects) separately since EUI's own docs don't restate it here.

### Chart types — Time series
Source: https://eui.elastic.co/docs/dataviz/types/time-series/

- Use time-series charts to show trends or comparisons across categories over a continuous time axis.
- Prefer **line charts over bar charts** when the changes between points are small — bars visually understate/overstate subtle deltas more than a continuous line does.
- Set the x-axis scale type explicitly to "time" (not linear/ordinal) so spacing between points reflects actual elapsed time, including gaps.
- Use a time-aware tick formatter (e.g. "nice" day-based formatting) rather than raw date strings, so axis labels stay readable at different zoom levels.

### Chart types — Categorical
Source: https://eui.elastic.co/docs/dataviz/types/categorical/

- Use categorical (bar/column) charts to compare values across distinct, discrete categories — not continuous time.
- Avoid line charts for categorical data — a line implies continuity/trend between points and risks being misread as a time series when categories are actually discrete and unordered.
- Rotate labels/orientation (e.g. horizontal bars) when category labels are too long to fit legibly on a vertical axis.
- Sort categories meaningfully (e.g. descending by value) rather than leaving them in arbitrary/source order — this materially improves pattern recognition.
- Use consistent, abbreviated tick formatting across axes (e.g. "k" for thousands) so labels stay compact and scannable.
- Map the categorical dimension to the x-axis and the quantitative measure to the y-axis as the default convention.

### Chart types — Part-to-whole comparisons
Source: https://eui.elastic.co/docs/dataviz/types/part-to-whole-comparisons/

- Pie/donut charts should be used only when: there are **6 or fewer slices**, the largest values are roughly at 25%/50%/75% split points, or one category clearly dominates the rest.
- Do not use pie charts to let users compare the precise size of similar slices — humans are bad at comparing angles/areas precisely; use a bar chart instead when close comparisons matter.
- Avoid pie charts with more than 6 slices, with negative values, or when comparing multiple pie charts against each other — use a stacked percentage bar chart instead for multi-dataset comparison.
- Never explode/enlarge individual slices for emphasis — this distorts the part-to-whole proportion and misleads the reader.
- Keep slice labels inside (or just outside) each slice, with the value appended to the label.
- When there are many small slices or long labels, switch to a legend/table format with right-aligned numeric values instead of in-chart labels.
- Slice ordering convention: start the first/largest slice at 12 o'clock, arrange the largest going clockwise, then place the remaining slices counterclockwise in descending size order — except when categories have an inherent order (e.g. low→high, good→bad), in which case preserve that natural order instead.
- Group small leftover slices into an "Other" category, but check whether "Other" ends up being the largest slice — if so, it undermines the chart's meaning and should be reconsidered.
- Use sunburst/treemap types for hierarchical part-to-whole relationships and overall composition — not for showing trends over time or precise value-to-value comparisons.

### Chart types — Metric chart
Source: https://eui.elastic.co/docs/dataviz/types/metric-chart/

- Use a metric/KPI chart to answer a single current-state question (e.g. "how many visitors are online now?") — it communicates one number's current value, optionally with qualitative status via color or a progress bar.
- Always apply a value formatter to limit digit precision: a 7-digit raw number like $3,364,726 should be abbreviated to ~4 significant digits plus a suffix, e.g. "$3.365M" — long/unformatted numbers undercut the "glanceable" purpose of the chart.
- Add a subtitle or unit label when the raw number needs clarification (what it's counting, what period it covers).
- Color can be purely aesthetic, or functional — mapping value ranges to a color scale to convey qualitative status (good/warning/bad) at a glance.
- Progress-bar variants always use a **zero baseline** — non-zero baselines are not supported, so don't design around a "progress from X" concept for this chart type.
- If showing an inline trend sparkline within a metric tile, cap its visual height at roughly **50% of the metric tile's total height**, so it stays a secondary detail, not the focal point.
- At small tile sizes, the subtitle should hide first (responsive degradation); the title and the main value should never hide — those are the non-negotiable minimum content.
- No fixed minimum pixel size is prescribed for metric tiles — sizing is left to context, but content degrades gracefully (subtitle first) as space shrinks.
- Do not use a metric chart when you need: precise trend analysis (use a line chart instead), comparison of many same-scale indicators (use a bar chart instead), detailed row-level data (use a table instead), or lengthy explanation (use plain text instead).

### Sizing (charts)
Source: https://eui.elastic.co/docs/dataviz/sizing/

- Sparklines are quick visual summaries where exact values don't matter — cap them at a **maximum of 12 data points** and a **single series only**.
- Strip sparklines down to the minimum: no axis ticks, no axis labels, no tooltip, no grid lines, no legend — any chrome beyond the line itself works against the "glanceable summary" purpose.
- A sparkline must never stand alone — the surrounding text/layout must supply the context (what it's measuring, over what period) since the chart itself carries none.
- When a chart has to live in a small container/panel, don't just shrink it — simplify the underlying data representation (e.g. move the legend from the side to below the chart to reclaim horizontal space, and add annotations to compensate for lost labeling detail).
- No fixed pixel minimums, aspect ratios, or responsive breakpoints are prescribed for general charts — sizing guidance here is about content simplification, not fixed dimensions.

### Theming (charts)
Source: https://eui.elastic.co/docs/dataviz/theming/

- For multi-series charts distinguishing different (unordered/categorical) data, use a **color-blind-safe palette of contrasting colors** — this also avoids implying a false ordering/magnitude between series that a sequential palette would suggest.
- For sequential **quantities** (e.g. low→high amounts), use a single-hue progression from light (low) to dark (high), and bucket values into discrete intervals rather than a smooth continuous gradient — discrete steps read more clearly than a gradient.
- For **trend/divergent** data (values that move in two directions from a midpoint, e.g. negative vs. positive), use a two-color divergent scheme with the darkest shades at each extreme and a neutral midpoint.
- Support conditional light/dark theme objects for charts so chart backgrounds/gridlines/text match the app's active theme rather than hardcoding one mode.
- Custom brand palettes should be layered as an override/partial theme on top of the default color-blind-safe theme, rather than replacing the accessible defaults wholesale — preserves the accessibility guarantees by default.
- General restraint principle: **too many colors in a single chart creates noise and hinders quick comprehension** — use color strategically to distinguish categories and highlight key indicators, not decoratively.

---

## Coverage summary

- Utilities section: 23 pages fetched (accessibility, auto sizer, color palettes, container queries, copy, CSS utility classes, delay, error boundary, focus trap, highlight and mark, HTML ID generator, i18n, inner text, mutation observer, outside click detector, overlay mask, portal, pretty duration, provider, resize observer, scroll, text diff, window events). The `/docs/utilities/` index itself returned 404; its page list was instead recovered from the accessibility page's section navigation.
- Data visualization section: 6 pages fetched (dashboard good practices, accessibility features, sizing, theming, and 3 chart-type pages discovered via the time-series page's sidebar nav: categorical, part-to-whole comparisons, metric chart). The `/docs/dataviz/types/` index itself was not fetched directly — its sub-pages were found via cross-links.
