# Elastic UI (EUI) Design Reference — Layout, Containers, Navigation, Display

Condensed usage/guideline notes extracted from the EUI docs site (https://eui.elastic.co/docs/components/), for use as external design guidance when auditing a custom (non-EUI) component library. Prop tables, TypeScript interfaces, and code snippets are intentionally omitted — only stated usage rules and comparisons are kept.

---

# Layout

## Flex (Group / Item / Grid overview)
Source: https://eui.elastic.co/docs/components/layout/flex/

- Use `FlexGroup` for single-row layouts and quick alignment of items.
- Use `FlexGrid` for repeated, wrapping rows of same-width items.
- `FlexItem` is the direct child of a group/grid; it can be omitted when not needed.
- `FlexGroup` and `FlexGrid` support indefinite nesting within themselves.
- Because flex items themselves use `display: flex`, nested layouts keep stretching correctly — but this can cause unintended layout of an item's own children; wrap inner children in a plain `div`/`span` (or drop the flex-item wrapper) if this causes problems.
- The container element can be swapped (e.g. to a semantic `form`) without losing flex layout behavior.

## Flex Group
Source: https://eui.elastic.co/docs/components/layout/flex/group/

- Use for laying out a single row of content; items stretch/grow to match siblings by default.
- Responsive by default — stacks vertically on small screens; disable with a "no responsive" setting when the group exists only for alignment/margins, not real layout.
- Use justify/align settings for common patterns: separating two items, centering a single item, vertical alignment. Items set to not-grow won't stretch.
- Gutter size setting controls spacing between items.
- Enable wrapping when items have minimum widths and need to reflow in a narrowing container.
- Direction setting changes orientation away from the default row.

## Flex Item
Source: https://eui.elastic.co/docs/components/layout/flex/item/

- Must be a direct child of Flex Group/Flex Grid with no intervening HTML wrapper.
- Has `display: flex` itself, which lets nested groups/items keep stretching, but can produce unintended layout for items containing multiple children — wrap those children in a plain element or drop the flex-item wrapper.
- A panel placed inside a flex item automatically expands to fill it vertically.
- "Grow" only applies within Flex Group; Flex Grid ignores it (grid items are always uniform width).
- Items stretch/grow by default; disable growth per item, or assign a 1–10 numeric grow value for proportional widths within a group.

## Flex Grid
Source: https://eui.elastic.co/docs/components/layout/flex/grid/

- More rigid than Flex Group — use for repeatable rows of same-width items.
- Supports 1–4 columns; more than 4 will likely break on laptop screens.
- Responsive by default (stacks on small screens); can disable and manually set column counts per breakpoint.
- No `justifyContent` support since grid columns are always evenly distributed; `alignItems` is still available for vertical alignment.
- `direction="column"` reorders items top-down-then-left-right instead of the default left-right-then-top-down.

## Header
Source: https://eui.elastic.co/docs/components/layout/header/

- Composed from sub-parts: section container, section item (flex item wrapper), section item button (an empty-button variant sized to header height, supports notification dot/badge), logo (linked, fits header height), and header-specific breadcrumbs.
- Can be configured via explicit child components, or declaratively via a "sections" config (which takes precedence over children when both given).
- Header links component provides inline nav links with built-in responsive collapse into a popover list at configurable breakpoints.
- Fixed positioning keeps a header stationary; multiple fixed headers stack automatically. When paired with the page template, content padding adjusts automatically for the fixed header(s); otherwise use the exposed CSS variable to offset content manually.
- Dark theme variant is intended for prominent site-wide navigation, but only supports a limited subset of header sub-components (logo, links, section item button, sitewide search) — other content needs custom styling.
- Use `repositionOnScroll` for popovers opened from a fixed header.
- Multiple headers are appropriate for separating distinct navigation concerns (e.g. product nav vs. app nav).

## Horizontal Rule
Source: https://eui.elastic.co/docs/components/layout/horizontal-rule/

- A styled `<hr>` used as a visual separator.
- Three width variants: full (default), half, quarter.
- Margin sizes range from extra-small to extra-large; margins collapse against adjacent items, which matters when computing total spacing between sections.

## Page Header
Source: https://eui.elastic.co/docs/components/layout/page-header/

- Best used inside the page template's header slot; layout auto-adjusts based on which content is supplied (title, description, tabs, custom children).
- Optional icon can precede the title.
- Right-side items (typically up to 3 buttons) render as a flex row; the first button should be the primary action (usually filled). At larger breakpoints items render right-to-left; on small/mobile screens they collapse to a vertical, left-to-right stack.
- Including tabs forces the bottom border on, to visually separate header from page content. If tabs are shown without a page title, the tabs become the de facto primary heading, with any description shown below to clarify the active tab.
- Responsive behavior can be reversed for how content stacks on small screens; vertical alignment between left/right sections defaults to center for custom content, but switches to top-aligned when a title or tabs are present.
- For non-standard layouts, bypass the opinionated title/description/tabs props and compose with the raw header-section components instead.

## Page Layout Components (Page / Page Body / Page Sidebar / Page Section)
Source: https://eui.elastic.co/docs/layout/page-components/

- Page layouts are modular: parts can be added or removed as needed, but must fit together in a defined structure.
- The outer page wrapper is a flex container that stretches to fill height; width can be restricted to a centered max-width (defaults to 1200px).
- The sidebar component has minimal built-in styling but significantly affects how the rest of the page content should be configured — wrap the remaining content in the page-body wrapper and mark it "panelled" whenever a sidebar is present.
- The section component is effectively a preconfigured panel meant to be a direct child of the page body; disable growth to stop it stretching unnecessarily, and add a bottom border to visually separate stacked sections.
- Main content should consistently use a "plain" background color for body/section. When showing an empty-state prompt inside a section, contrast the prompt's panel color against the section's (e.g. a "subdued" prompt inside a "plain" section) for visual clarity.

## Spacer
Source: https://eui.elastic.co/docs/components/layout/spacer/

- Use in place of a `<br />` tag to add vertical space between items.
- Size options (xs, s, m [default], l, xl, xxl) align to the EUI vertical grid, keeping spacing consistent with the rest of the system.

---

# Containers

## Accordion
Source: https://eui.elastic.co/docs/components/containers/accordion/

- Deliberately minimally styled so teams can customize appearance; the only enforced style is a caret icon signaling expandability.
- Clickable trigger content is separate from the revealed child content, which animates open/closed by height.
- Arrow communicates open/closed state and directs attention to the trigger text; arrow can be positioned or hidden.
- When grouping multiple accordions visually, add a spacer between them since default styling is minimal; use the padding-size setting for internal spacing.
- If disabling an accordion based on user state, pair it with help/error text explaining why.
- If the trigger content includes interactive elements (links, buttons, form controls), change the trigger wrapper element to a `div` — but note accordions otherwise require a focusable button for accessibility, so switching away from a button re-enforces showing the arrow.
- State is normally managed internally, but can be forced open/closed externally with a toggle callback.

## Bottom Bar
Source: https://eui.elastic.co/docs/components/containers/bottom-bar/

- A simple affixed dark bar (usually containing buttons) at the bottom of the page. Use for very long pages or complex multi-page forms.
- For forms specifically, only show it when the form is in a savable state.
- Three positioning modes: fixed (default, pinned to browser window), sticky (in-place but adheres near the viewport edge while scrolling), static (normal DOM flow).
- By default it reserves space for itself by padding the page body equal to its own height; disabling that reduces scrollbar noise but risks overlapping content.
- Includes a default screen-reader landmark heading ("Page level controls") that should be customized to describe the bar's actual controls.

## Card
Source: https://eui.elastic.co/docs/components/containers/card/

- Content-oriented component built on top of Panel; minimally should have a title, description, and icon (customizable).
- Make a card interactive with a click handler or an href — this removes the need for a separate footer button when the whole card should be clickable.
- Two layouts: vertical (default, stacked icon/title/description) and horizontal (icon to the left; restricts use of images, footers, and text alignment options).
- Keep image proportions consistent across a row of cards; images expand to the card's edges. Custom image content without a real `<img>` tag needs explicit full-width styling.
- Footers can hold multiple elements and stay bottom-aligned. Generic "Go"-type footer buttons must carry an aria-label referencing the card's title, since "Go" alone is not descriptive.
- The display/color setting can be set to a flat, borderless/shadowless style to avoid nested-panel visuals, while still showing hover feedback for interactive cards.
- A card requires at minimum a title plus either a description or custom children — both cannot be omitted.

## Flyout
Source: https://eui.elastic.co/docs/components/containers/flyout/

- Use instead of a modal when the action is not transient — i.e. for reviewing/editing contextual detail or complex forms while the user's place in the underlying page is preserved.
- Structure: header (pinned top, navigation), body (scrolls independently, can include a banner/callout), footer (pinned bottom, persistent actions). All inherit consistent padding from the flyout so edges align.
- Three sizes (small/medium/large) scale relative to window size with minimum pixel widths; custom fixed widths are also supported. Set a max-width flag (or custom value) to prevent a flyout from growing excessively on very large screens.
- Overlay mode (default): dims background via a mask, traps focus inside — appropriate for transactional workflows needing full attention.
- Push mode: shifts the page body over instead of covering it, keeping background content visible/clickable; automatically falls back to overlay on small windows. Push flyouts do NOT get automatic focus trapping, escape-to-close, or screen-reader announcement — these must be handled manually.
- Always set an aria-labelledby pointing at the flyout's title for keyboard/screen-reader users. Overlay flyouts auto-manage focus (move in, trap, return to trigger on close); push flyouts do not.
- Supports session-style nesting: a "start" flyout owns the session and history; child/"inherit" flyouts show secondary info within the same session. On small screens, child flyouts stack above the parent rather than appearing side by side.

## Modal
Source: https://eui.elastic.co/docs/containers/modal/

- Best for focusing attention on a small amount of content and prompting a decision (e.g. confirmation). If the content is complex or takes a long time to complete, use a flyout instead.
- Requires a specific nested child-component order; some pieces can be omitted but ordering must be preserved.
- Always set aria-labelledby (referencing the modal's title id) so assistive tech announces it correctly.
- Focus is auto-managed: moves into the modal on open, is trapped while open, and returns to the trigger element on close — customizable if the trigger might be removed from the DOM before closing.
- The confirm-modal variant wraps the base modal for confirmation flows; default button coloring implies a positive/neutral action, switch the button color to danger to signal a destructive operation. Supports a disabled-confirm and loading state to block premature/duplicate submission.
- Forms should wrap only the modal body content; connect a submit button in the modal footer to the form via matching id/form attributes.
- Minimum width is 400px, growing to fit content up to a default max width; always shrinks to fit the window.

## Panel
Source: https://eui.elastic.co/docs/components/containers/panel/

- Use as a general layout helper for containing content; it underlies larger components (Page, Popover, Card).
- Use background color sparingly, favoring the default (uncolored) panel; a fully transparent panel is useful when you only need padding containment, no visual styling.
- Only plain/transparent panels can carry a border and/or shadow; some themes further prevent combining border + shadow on the same panel.
- Rounded corners are the default; can be turned off depending on placement.
- Nesting guidance: don't repeat the same panel style across multiple nested levels — that confuses the visual hierarchy. Vary styles between stacked panels (3+) to guide the user through content relationships.
- Use shadows sparingly — great for drawing focus to a single layer, noisy if applied throughout a stack; limit to one shadowed layer among nested panels.
- Don't wrap every content area in a panel — reserve panel styling for content that needs emphasis.
- Keep sibling panels (e.g. a row of cards) visually consistent with each other, while differentiating primary vs. secondary content through styling emphasis.

## Popover
Source: https://eui.elastic.co/docs/components/containers/popover/

- Use to hide controls/options behind a clickable trigger; keep the popover's task simple and narrowly focused since it's meant for temporary interaction.
- Accessibility rules (stated as hard requirements):
  - Triggers must be anchored to elements that accept keyboard focus.
  - Popovers containing interactive elements must be opened via a click handler.
  - Popovers must never be triggered by hover or focus events.
- Popovers auto-close on an outside click — as a consequence, any work done inside a popover should auto-save rather than require explicit confirmation.
- Avoid nesting a popover inside another popover; use a context menu to swap content within a single popover panel instead.
- Default anchor display is inline-block (can switch to block); position auto-adjusts to available screen space, including flipping along the cross-axis when there isn't room.
- Initial focus can target a specific child for keyboard users — only do this when that target makes sense as a standalone destination or is the popover's primary goal, to avoid a jarring focus jump.

## Resizable Container
Source: https://eui.elastic.co/docs/components/containers/resizable-container/

- Use for layouts where users need to manually resize adjacent content areas via a drag handle between panels.
- Collapsible panels are meant for large, layout-level areas (e.g. a side action panel) ceding space to a main content area.
- Add a tabIndex to the container when it has a fixed height or lots of content, so keyboard users can focus it and scroll with arrow keys.
- If using external controls to collapse panels, be careful not to let all panels collapse simultaneously — the app then needs to account for an empty layout state and keep keyboard navigation usable.
- Users resize by dragging the resizer button, or via arrow keys on a focused resizer button for keyboard access.
- Panels can disable their own overflow scrolling when not needed, and accept standard panel-style props (color, shadow, padding).

## Tabs
Source: https://eui.elastic.co/docs/components/containers/tabs/

- Use tabs to organize related content under one subject via in-page show/hide — tabs should not change higher-level navigation.
- Sizes: small (fits popovers/compact containers), medium (default/general use), large (reserve for primary page navigation, e.g. within a page header).
- An "expand" setting stretches tabs evenly across the available width.
- A bottom border (on by default) separates the tab group from the content below; disable it when the surrounding component (e.g. a flyout) already provides a visual divider.
- Each tab's content should be scoped to information relevant to the current subject.
- Sync the selected tab with the URL hash so selection persists across page loads — but avoid doing this when multiple tab sets exist on the same page (ambiguous which one "owns" the URL).
- Use a real href on tabs that represent primary page content so browser history/back-button works correctly.

---

# Navigation

## Buttons
Source: https://eui.elastic.co/docs/components/navigation/buttons/button/

- Primary/secondary button: unfilled by default (secondary use), filled for the primary action / call-to-action.
- Empty (text-style) button: for tertiary/low-prominence actions like close, cancel, filter, refresh; reduces visual prominence and supports extra-small sizing.
- Icon-only button: for commonly-understood icon actions; requires an aria-label, and should be wrapped in a tooltip for sighted users.
- Sizing: medium is the default/most-common size; small suits confined spaces like popovers and compressed forms; extra-small is for supplementary/tertiary info. Do not mix button sizes within the same group or row — keep consistent height.
- Disabled state: show (don't hide) a button as disabled when the action is unavailable due to permissions/licensing/validation — hiding it risks users never discovering the option exists.
- Loading state: always consider adding a loading state for actions that may be slow; rename the label to a "Loading…"-style state where appropriate.
- Color/semantics: danger buttons indicate destructive actions requiring confirmation; success buttons indicate positive outcomes or unsaved changes. Never rely on color alone for meaning — pair with a label or icon.
- Labels: should clearly state the action, using an action verb plus an object when context alone isn't clear; keep to 3 words or fewer. Prefer concrete verbs ("Create," "Delete," "Add," "Remove," "Save") over vague ones ("OK," "New").
- Combinations: show only one primary (filled) action per layout; pair it with tertiary/empty secondary actions; avoid mixing all three button styles together in one group.
- Placement: in modals/confined spaces, put buttons on the right with the primary action in the bottom-right. In large-form layouts, put the primary action bottom-left, where users finish scanning content.

## Button Group
Source: https://eui.elastic.co/docs/components/navigation/buttons/group/

- Two APIs: a "children" API (pass button components directly — flexible visual layout, works with wrapped tooltips/popovers, shares size/disabled props across children) and an "options" API (radio/checkbox semantics — single selection or multi selection).
- Variants: default (buttons with gutter spacing), segmented (flush, unified row — only plain buttons or icon buttons, not mixed, optional dividers), selection (toggle behavior reflected via pressed-state, each child needs a unique id).
- Selection modes: single = at most one selected; multi = any number selected simultaneously.
- Display styles for selection groups: regular (subdued, for light backgrounds), highlighted (for emphasizing one group among several segmented controls), inverse (light toggle on dark background).
- In compressed forms, use the compressed button size to match surrounding form fields; groups should generally be full-width unless icon-only.
- A "legend" is mandatory for accessibility — rendered as an aria-label on the children-API wrapper, or as a visually-hidden fieldset legend in the options API.

## Split Button
Source: https://eui.elastic.co/docs/components/navigation/buttons/split-button/

- Combines one primary action and one/several secondary actions into a single visual button group; use for a frequently-used primary action alongside related alternatives.
- The primary action renders as a normal text button by default, or icon-only when needed; the secondary action is always icon-only.
- Any icon-only sub-action (primary or secondary) requires an aria-label for screen readers.
- Single secondary action: attach a direct click handler. Multiple secondary actions: use a popover on the secondary action to show a list of options — this auto-applies a down-arrow icon.
- Both primary and secondary actions can carry tooltips.

## Key Pad Menu
Source: https://eui.elastic.co/docs/components/navigation/buttons/key-pad-menu/

- Presents items in a tiled layout with a fixed width that fits three items before wrapping.
- Items can act as links (href) or buttons (onClick); each requires a text label plus icon content.
- When using the "selected" toggle prop, explicitly supply both the true and false states so the attribute is present either way.
- Supports beta badges to flag non-GA items.
- Items can double as form controls (checkbox or radio) via a "checkable" setting.
- If the menu is used for app navigation, wrap it in a `<nav aria-label="...">` for accessibility.

## Filter Group
Source: https://eui.elastic.co/docs/components/navigation/buttons/filter-group/

- Use to wrap filter buttons into a container that reads well against form fields like search.
- Display variants: regular (subdued) and "highlighted" (to distinguish one filter group among several on the same view). Dividers between buttons can be turned off for a cleaner look.
- Adjacent filters can be grouped (borders removed between them) to visually associate related or contrasting filters.
- Set an active-filters flag to give clear visual feedback when a filter is currently applied.
- A toggle mode converts filter buttons from plain click buttons into stateful toggle buttons.
- For long filter lists, wrap the filter button in a popover containing a searchable selectable list rather than listing all options inline.
- Communicate available/active filter counts (integers or percentage strings).
- Default width auto-sizes to content; a full-width setting expands the group, growing buttons proportionally (individually controllable).

## Breadcrumbs
Source: https://eui.elastic.co/docs/components/navigation/breadcrumbs/

- Use to help users track progress in a flow and navigate backward; pair with a page header for lower-level, in-page flows. For app-wide/global navigation, use the header-specific breadcrumbs variant instead.
- If both breadcrumbs and tabs are needed on the same page, defer to the tabs guidance for how to combine them.
- Truncates to a single line by default (max-width applied to all but the last item); can be disabled globally or per item.
- A max-items setting collapses overflow breadcrumbs into a single popover item that reveals the hidden ones; omitting it (or passing 0) shows everything.
- Responsive by default, with default visible-item counts per breakpoint (roughly: 1 on extra-small, 2 on small, 4 on medium+); can be disabled or customized per breakpoint.
- Provide a descriptive aria-label for the breadcrumb set, and make sure the last breadcrumb (current page) is generally not a link.

## Collapsible Nav
Source: https://eui.elastic.co/docs/components/navigation/collapsible-nav/

- A high-level component that creates a flyout-style navigation pane, built on top of the flyout.
- Supports docking — affixing the nav to the window and pushing page content over via left padding — but docking is not possible on small screens since it would leave too little room for page content.
- Nav groups act as structural containers: optional border/background (none, light, dark), optional heading (with icon), and optional accordion-style collapsibility (which requires a title and an initial open/closed state).
- Groups work well containing list-group-style content or simple text.
- The overall pattern (header + collapsible nav + multiple groups with open/closed and pinned state) should be treated as a reference implementation — the app owns how groups are built and how state is stored.

## Context Menu
Source: https://eui.elastic.co/docs/components/navigation/context-menu/

- A nested-menu system for navigating hierarchical structures; typically housed inside a popover anchored to any interactive trigger.
- Structure: an overall container managing multiple panels, individual panel sections (items or custom content), and individual selectable items.
- For simple, non-hierarchical menus, use a single panel standalone without nesting.
- Panels can render arbitrary React content instead of (or alongside) a standard item list; items can include separator lines or fully custom rendering.
- Fixed panel heights make content scrollable while keeping a title/static header visible.
- Give selected items an aria-current="true" state for screen readers. Control initial keyboard focus via an index prop, or disable autofocus entirely.

## Facet
Source: https://eui.elastic.co/docs/components/navigation/facet/

- Facet buttons are for filtering a list by one of several search parameters.
- Support icon nodes and/or quantity counts; support selected, disabled, and loading states.
- The facet-group wrapper should contain multiple facets; layout can be vertical (default, best in narrow/max-width-constrained containers) or horizontal (for wider displays). Gutter size between items is adjustable.
- Keep visual consistency within one facet grouping — either all items show icons, or none do (and icon types, like avatars, should stay consistent within a group).
- Single vs. multi-select behavior is flexible and left to the specific use case.

## Link
Source: https://eui.elastic.co/docs/components/navigation/link/

- Any anchor or button-as-link element designed to sit nicely inside a block of text, with accessibility built in.
- Setting the link to open in a new tab auto-enables an "external" indicator icon so users know a new window will open before they click.
- Color options mirror the design system's semantic palette (text, subdued, accent, primary, success, warning, danger, ghost); "ghost" is reserved for dark backgrounds only since it always renders white text regardless of theme.
- A link with a click handler but no href can be marked disabled, which blocks interaction and strips link styling.
- `javascript:` protocol hrefs are automatically disabled/sanitized as an XSS protection.

## Pagination
Source: https://eui.elastic.co/docs/components/navigation/pagination/

- Some components (e.g. data tables) have pagination built in; use the standalone pagination component for custom paginated UIs.
- Shows up to 5 consecutive pages plus shortcuts to first/last page, given a total page count.
- Lead with filtering/search tools first for any results-style table — pagination is most effective after users have already narrowed thousands of results down to hundreds, not as the primary narrowing tool.
- Always show a result count so users know how many results exist; if the exact count is unknown, say so explicitly (e.g. "Showing first 100 results").
- Offer a "rows per page" control so users can adjust density; keep it to about 2–3 options, and hide the selector entirely if total rows are below the smallest option.
- Suggested default row-count options based on total entries: under 50 → 10 rows + "All"; 51–100 → 10/20/All; 101–200 → 10/20/50; 200+ → 20/50/100; unknown totals → best guess from context.
- Always persist the user's pagination/filter/display-option state — resetting it on navigation is frustrating.
- Avoid infinite scroll; prefer an explicit "load more" action, since infinite scroll breaks state preservation and can disorient navigation.
- Give each pagination control set a descriptive aria-label.

## Side Nav
Source: https://eui.elastic.co/docs/components/navigation/side-nav/

- A responsive menu, usually placed on the left side of a page layout; expands to fill its container width, configured via a structured items list.
- Built-in responsive behavior collapses it into an accordion-style menu on mobile; a mobile title string is required to label the toggle button at small breakpoints.
- Renders as a `<nav>` landmark, so it should carry a heading (or a screen-reader-only heading when no visible heading is wanted).
- Stay consistent app-wide about whether top-level/root items act as section labels vs. clickable links — mixing both patterns in the same app confuses users.
- Nested children reveal progressively by default as users navigate; a "force open" setting can keep them permanently expanded. Expand/collapse arrows only appear on items that have children but aren't themselves directly clickable.
- An "emphasize" setting highlights specific nav sections (e.g. dynamic/user-created items) — since the emphasized background can extend beyond the component's own bounds, the containing element should clip overflow to bound it visually.

## Steps
Source: https://eui.elastic.co/docs/components/navigation/steps/

- Presents procedural content as a numbered outline; best for instructional content that must be followed in a specific order.
- Requires a title and content per step; numbering auto-increments from a configurable start value.
- The standard (vertical) steps component is for in-page procedural content; the horizontal variant is specifically for splitting a form/setup flow across multiple pages, with each step corresponding to one page of form elements.
- Status states: incomplete, complete, warning, danger, disabled, loading, current. For horizontal steps, "incomplete" is the default and "current" marks the active step — the filled/emphasized style is reserved specifically for "current."
- For procedural sub-steps that aren't code blocks, wrap them in the dedicated sub-steps component (typically an ordered list) rather than inventing custom markup.
- Supports custom heading levels so step titles can fit correctly into the surrounding document's heading hierarchy.

## Tree View
Source: https://eui.elastic.co/docs/components/navigation/tree-view/

- Renders recursive/hierarchical data such as a file directory; explicitly not recommended for primary app navigation — use side nav for that instead.
- Takes a structured node list rather than arbitrary children; every node needs a unique id and label, with optional icon (and a different icon for the expanded state). Nesting is expressed via a children property on each node.
- Provide a descriptive aria-label for the whole tree; built-in keyboard navigation supports arrow keys, spacebar, and enter.
- A compressed display mode suits space-constrained layouts — pair it with small icons and extra-small token sizes to keep alignment correct. Expansion arrows can be shown explicitly for parent items, and all parents can be auto-expanded on load if desired.

---

# Display

## Aspect Ratio
Source: https://eui.elastic.co/docs/components/display/aspect-ratio/

- Responsively resizes a single block-level child element to a specified ratio; intended for embeds (e.g. video embeds) that otherwise have fixed intrinsic dimensions.
- For responsively-sized images specifically, prefer CSS `object-fit` over this component.

## Avatar
Source: https://eui.elastic.co/docs/components/display/avatar/

- Typically used to create a user icon; requires a name (used both for computing initials and as the accessible label/tooltip).
- Initials are derived automatically from the name — first character of each word, capped at 2 characters maximum (customizable, but the 2-character cap always applies).
- Shape communicates type: circular for users (default), rounded-square for workspaces/"space" entities.
- Icons can replace initials/images and auto-size/color based on other avatar settings; for multi-colored icons/logos, allow the icon's own colors to show through rather than forcing a single color, while still maintaining contrast with the background.
- The avatar itself is not interactive and is not a keyboard focus stop.
- A "disabled" visual state exists for avatars placed within an otherwise-disabled control/element.

## Badge
Source: https://eui.elastic.co/docs/components/display/badge/

- Use to highlight key single-line information; wrap multiple badges in the dedicated badge-group container for correct wrapping, truncation, and spacing.
- Badges can be clickable (click handler on the badge and/or its icon); when both are set, internal markup restructures to avoid nesting interactive elements improperly.
- Color + "fill" setting together control intensity — filled is more intense/saturated, non-filled (the default) is lighter.
- Content is single-line only — text truncates rather than wraps; truncated text is exposed as a title attribute for a native tooltip on hover.
- Icons can sit on the left or right (right is default).
- Badges work well as repeated health-status indicators in table-like contexts for visual consistency.
- Distinct badge styles/labels exist to communicate pre-GA feature maturity: Technical Preview (experimental, unsupported), Beta (near-GA, not production ready), GA (production ready) — each should use the matching label/tooltip to set correct user expectations.

## Banner
Source: https://eui.elastic.co/docs/components/display/banner/

- Use for broad, product-level announcements (new features, promotions, onboarding nudges) — not for errors/warnings/confirmations, which belong in a callout instead (callouts are for inline, contextual feedback tied directly to page content).
- Show no more than one banner per page at a time; if multiple announcements compete, pick the single highest-priority one.
- Supports at most two action buttons — one primary, one secondary (secondary only appears alongside a primary). Primary button can be filled or unfilled; filled should be used sparingly, as an opt-in emphasis.
- Requires a media element; since the banner stretches media to fill its slot, undersized custom images will appear blurry.

## Beacon
Source: https://eui.elastic.co/docs/components/display/beacon/

- Use to draw visual attention to a specific location/element on screen.
- Strongly recommended to pair with the Tour component — standalone, a beacon is just a visual cue that may lack context for the user.

## Callout
Source: https://eui.elastic.co/docs/components/display/callout/

- Used to display important messages directly related to on-page content; color conveys semantic meaning.
- Color/type usage: Info = general information. Success = confirms an action completed — use sparingly, since callouts are mostly meant to flag problems, not successes. Warning = something isn't behaving correctly but didn't cause termination of the task. Danger = a terminal/error issue (task didn't complete, though the operation may not fully halt).
- Always provide a title; prefer the structured title/text content over generic children (children exist mainly for backward compatibility).
- Limit to one primary action per callout, with a secondary action only when genuinely needed.
- Use custom icons sparingly — only when they add real context and match the callout's color.
- Minimize the number of callouts shown on a single page; when several are needed, stack them by priority: error, then warning, then info, then success.
- For permanent, lower-emphasis UI elements, use the small size variant.
- Use the "announce on mount" behavior when a callout appears dynamically from a user action or needs immediate attention.

## Code (inline / block)
Source: https://eui.elastic.co/docs/components/display/code/

- Inline code component is for snippets within/alongside text; the code-block variant is for multi-line code with adjustable font/padding.
- Both are intended strictly for static, read-only code — for editable code or long output (e.g. API responses), use a real code editor component instead, not these.
- Syntax highlighting covers many languages via PrismJS (including ES|QL via a plugin); omitting a language shows formatted-but-unhighlighted code.
- JSX/TSX need their own distinct language setting — don't reuse the plain JS/TS setting for React code.
- White-space handling can wrap automatically (default) or preserve exact formatting without wrapping. Large code blocks can be virtualized to reduce render overhead (requires a fixed overflow height and forces the non-wrapping whitespace mode).

## Comment List
Source: https://eui.elastic.co/docs/components/display/comment-list/

- Built on top of the Timeline component; use to display comments or logged actions performed by a user or a system.
- Structure: a list container plus individual comment items, each of which flexibly adapts its layout to whichever pieces of content are supplied.
- Comment elements: a timeline avatar (default user icon, custom icon, or full avatar — custom icons are especially useful for indicating system-generated updates), an event icon before the username for visual context on the action type, metadata (username + event description + timestamp), user-performable actions in the comment header (group multiple actions behind a popover + context menu rather than listing them inline), and a flexible content area for the message body or custom components.
- Accessibility: the list itself needs a descriptive aria-label/aria-labelledby, and each comment's timeline avatar needs its own aria-label.

## Description List
Source: https://eui.elastic.co/docs/components/display/description-list/

- Use for listing paired title/description information.
- Row layout (default): standard stacked title-then-description pairs.
- Column layout: inline title/description columns; use the "responsive column" variant to fall back to row layout on small screens. Column widths can be customized via ratio (e.g. description 3x wider than title).
- Inline layout: compact, blob-like format suited to things like JSON-style key/value display; renders at a smaller text size due to its condensed nature.
- A "reverse" text style flips which of title/description is visually prominent — useful for key/value displays where the value should stand out over the label (does not apply to inline layout).
- Vertical gutter (row spacing) and horizontal gutter (column spacing) are independently adjustable; not all spacing controls apply to every layout type.

## Drag and Drop
Source: https://eui.elastic.co/docs/components/display/drag-and-drop/

- Consider carefully before using drag-and-drop — it's often less suitable than standard form inputs because of the spatial-orientation demands it places on users, which can be a real barrier for some.
- Screen-reader users generally can't get the same nuanced control from keyboard-based drag interaction as from a mouse.
- Icon-only drag handles need an explicit "Drag handle"-style aria-label.
- If draggable items contain interactive children (buttons, links), restrict dragging to a dedicated handle and explicitly mark the item as having interactive children, so keyboard/screen-reader access to those children keeps working.
- Use a portal when dragging within a container that has its own stacking context (modals, flyouts) so the dragged item positions/renders correctly.
- Nested drag-and-drop between hierarchy levels isn't supported by the underlying library — consider a different underlying library if that's required.

## Empty Prompt
Source: https://eui.elastic.co/docs/components/display/empty-prompt/

- Use as a placeholder for empty content: first-time onboarding, permission restrictions, no search results, data-loading errors, license-upgrade prompts — generally for replacing an entire page or content section that has no data.
- No single element is strictly mandatory, but every prompt should have at minimum a title (as a real heading element) and/or a description; most also benefit from one or more call-to-action buttons plus optional supplementary footer content.
- Vertical layout (default): for minimal content (roughly a title + up to two paragraphs); works with an icon, an illustration, or no graphic at all; stays center-aligned for brief messaging.
- Horizontal layout: use when there's a long description, multiple calls to action, and a footer; requires an illustration and suits longer, side-by-side content.
- Graphics should communicate meaning first — use a single illustration per page to avoid clutter, and avoid icons with no semantic connection to the content.
- When offering multiple actions, list primary action(s) first and secondary actions as lower-emphasis (empty-style) buttons.
- When several empty states might appear together, avoid stacking multiple primary actions or multiple icons/illustrations at once — keep secondary actions and minimal iconography unless one particular state needs emphasis.
- Add a "Learn more" link after the description when there's no call-to-action, or place it in the footer alongside a primary action.

## Health
Source: https://eui.elastic.co/docs/components/display/health/

- Use to show the comparative health of listed objects (servers, HTTP status codes, nodes, indexes, etc.).
- Combines a color dot with text specifically because icons alone are vague/bulky and color alone is not sufficient — color plus text gives a lightweight but still recognizable combination that works in most situations.
- Text size is adjustable (xs/s/m or inherit) to match the surrounding context.

## Icons
Source: https://eui.elastic.co/docs/components/display/icons/

- Glyphs (small monochrome icons) should almost always use the default medium size (16x16). App logos and machine-learning icons are typically shown larger (32x32+) and can be multi-colored.
- Custom SVGs should sit on a square canvas and preferably match one of the standard sizes (16x16 or 32x32).
- Icons inherit text color by default; custom coloring should generally use the design system's named color palette rather than arbitrary CSS colors, unless the color is user-initiated (e.g. a chosen graph color). Multi-colored icons can be forced to inherit the parent's text color instead of their native colors.
- For custom single-color SVG glyphs, strip explicit fill attributes and rely on CSS color inheritance; multi-color logos needing theme support need different handling.
- Provide a descriptive title for meaningful icons; icons with no title default to being hidden from assistive tech (decorative). When importing an SVG as a component, use aria-label rather than title.
- Icon sets are purpose-specific: glyphs (generic UI icons named by appearance/function), Elastic logos (restricted to actual Elastic products, dark-mode aware), app logos (multi-color, represent specific Elastic apps), and ML job-creation icons (32x32 only).

## Illustrations
Source: https://eui.elastic.co/docs/components/display/illustrations/

- Theme-adaptive SVGs — each illustration ships light and dark variants, and the matching one is inlined automatically based on the active theme.
- Sourced from a separate illustrations package, so the catalog can grow independently of the core design-system library.
- Default accessible label comes from the illustration's title; supply more descriptive alt text when the illustration conveys real meaning, or an empty alt string when it's purely decorative (hides it from assistive tech).
- A full-width setting (on by default) makes the SVG stretch to its container; disable it to keep the illustration at its native size.

## Image
Source: https://eui.elastic.co/docs/components/display/image/

- Use for placing a static image on a page, optionally with a caption.
- Alt text should be meaningful and help non-visual users understand the image's purpose in context; use an empty alt string for decorative images or ones already described by surrounding text.
- Sizing options (s/m/l/xl/original/full-width/custom) set the max length of the image's longest edge and scale proportionally; only sizes larger than a small source image will actually enlarge it.
- SVGs without explicit width/viewBox may fail to render — set an explicit size to fix this; combining full-screen mode with SVGs also needs an explicit width.
- Captions are supported directly via a caption setting.
- Floating an image left/right within text should be reserved for large text blocks (particularly inside the Text component, which auto-clears floats); pair floats with margin for spacing.
- Full-screen click-to-expand is opt-in; use a dark full-screen icon color when the image itself has a light background, for contrast.

## List Group
Source: https://eui.elastic.co/docs/components/display/list-group/

- Presents list-group items in a neatly formatted list; a bordered style is available.
- Items can act as links (with active/disabled states); external links (opening in a new tab) automatically show an indicator.
- Supports a secondary icon-button action per item (e.g. pin, favorite, delete).
- For constrained spaces, enable tooltip-on-truncate and/or line-wrapping to avoid losing content to truncation.
- Item color defaults to plain text color but can be changed (e.g. to a primary or subdued tone) at the group or per-item level.
- A "pinnable" variant adds pin indicators so items can be organized into pinned/unpinned subsets — the pinned state and list data are owned by the consuming app; the component only handles the UI interaction.

## Loading (indicators overview)
Source: https://eui.elastic.co/docs/components/display/loading/

- Use loading indicators sparingly, and prefer showing actual progress over an infinite spinner whenever possible.
- Multiple simultaneous loaders are fine when different sections load progressively; if the whole page loads at once, use one larger indicator instead of several small ones.
- Component-to-use-case mapping: a specific branded loader for full-page/product-level loading screens; a "logo" loader only for very large panels like full-screen pages (accepts any icon as the logo); a chart-specific loader specifically for indicating a visualization is loading; a generic spinner for most general-purpose loading contexts.

## Progress
Source: https://eui.elastic.co/docs/components/display/progress/

- Indeterminate by default; becomes a real determinate progress bar once given a max and current value.
- Size controls the bar's vertical height (xs/s/m/l); it always stretches to 100% of its container's width.
- Positioning: static (default), absolute (parent needs relative positioning), or fixed (wrap in a portal when placed over a fixed header, to avoid z-index conflicts).
- Supports the design system's base colors, the visualization color palette, or arbitrary CSS colors; the value-text label auto-renders in a high-contrast version of the chosen color.
- Can double as a simple bar chart when paired with a label and value-text (auto-appended percent sign, or fully custom text).

## Skeleton
Source: https://eui.elastic.co/docs/components/display/skeleton/

- Placeholder components for content that hasn't loaded yet; serve three purposes — meaningful content preview, preventing layout shift, and accessible loaded/loading announcements for screen-reader users.
- Variants: text (multiple lines), title (heading placeholder), circle (mainly for avatars), rectangle (custom width/height/border-radius).
- Always set a descriptive "content aria label" describing what's loading — without it, multiple skeletons trigger redundant, contextless announcements for assistive-tech users.
- For multiple skeletons tied to one loading operation, wrap them in the dedicated multi-skeleton loading wrapper so there's a single parent-level loading state — this avoids a queue of separate "now loaded" announcements firing individually, which is described as annoying for screen-reader users.
- Loading/loaded announcement text is customizable, with a lower-level escape hatch available for full control over the live-region behavior.

## Stat
Source: https://eui.elastic.co/docs/components/display/stat/

- Use to display a prominent text/number value — good for single-value visualizations, dashboard summaries, and communicating trends over time.
- Structure is a title (the value) plus a description (the label); description renders above the title by default, but the order can be reversed.
- Alignment can be left (default), center, or right.
- Title uses the Title component's size scale; large is the default, though the documentation recommends generally sticking to a curated subset of the available sizes rather than the very largest/smallest extremes.
- Title color is customizable but limited to a curated color set to preserve adequate contrast.
- Supports a loading state that replaces the title with an animated placeholder for async data.

## Text
Source: https://eui.elastic.co/docs/components/display/text/

- A generic catch-all wrapper that applies standard typography styling/spacing to plain HTML.
- Accepts only raw (X)HTML as direct children — avoid wrapping content in extra divs/spans, and avoid nesting other components directly inside it, since that disrupts the styling.
- To improve line-length readability, disable growth to cap the wrapper's max width.
- Size options below the default (medium) are available; all sizes are calibrated to a 4px baseline grid for consistent line-height rhythm.
- Color can be applied to specific inline spans (via a text-color helper) or uniformly to the whole block via the wrapper's own color setting.
- Alignment can likewise be applied to individual text elements or uniformly to the whole text block.

## Timeline
Source: https://eui.elastic.co/docs/components/display/timeline/

- General-purpose vertical timeline renderer that works for any type of timeline content, given an array of items.
- Two more specialized components build on top of it: Steps (for instructional/ordered content, optionally with progress indication) and Comment List (for user/system comment or log-action threads) — prefer those when the content actually fits those specific patterns.
- Content guidance per item: wrap single-line text in the Text component; use a Panel or Split Panel for multi-line content; pass other component types (e.g. editors) with no wrapper at all.
- Use consistently-sized icons across timeline items for visual consistency.
- Requires a descriptive aria-label (or aria-labelledby referencing an external label) on the overall timeline.

## Title
Source: https://eui.elastic.co/docs/components/display/title/

- Styles page/section/content headings; can wrap any markup but usually wraps an actual heading tag.
- Unlike the Text component, Title is margin-neutral, making it more suitable for general layout composition (where you want to control spacing yourself).
- Size scale: xxxs, xxs, xs, s, m (default), l.
- Optional uppercase text-transform is available.

## Toast
Source: https://eui.elastic.co/docs/components/display/toast/

- Small, bottom-right notifications for ephemeral, "just happened" feedback (e.g. save completed) — never for historical/past actions, and never used as a page-load greeting.
- Avoid showing multiple toasts at once; let users absorb one message before the next appears.
- Don't use a toast for content too complex to fit its constrained space — summarize instead and link out to details for anything long (e.g. long error messages).
- Keep content brief — typically a single line; toasts display for ~10 seconds and should be readable within 6–7 seconds.
- Message-writing convention for common actions: state the object type, the object name (if short) in single quotes, and a past-tense verb; omit "successfully" since it's implied; for multiple objects, state the count rather than listing every name (e.g. "User 'Casey Smith' was added", "4 visualizations were deleted" — not "Your object has been saved").
- At most two actions per toast (one primary, one optional secondary); if more actions or a forced interruption is needed, use a modal instead.
- Color usage: primary = general info, success = task completed, warning = something misbehaving but not terminal, danger = something went wrong / task incomplete.

## Tooltip
Source: https://eui.elastic.co/docs/components/display/tooltip/

- Use for short, non-essential contextual info — typically naming or describing something in more detail; not suitable for interactive content. If interactivity (or anything beyond text) is needed, use a Popover instead.
- Always prefer the styled tooltip component over the native HTML title attribute — native tooltips are unstyled, don't work on touch devices, and have inconsistent screen-reader support across browsers.
- Content must be plain text only — tooltip content is not reachable by keyboard, so any interactive content inside one (links, buttons, inputs) is inaccessible and violates WCAG.
- Tooltip anchors must be focusable elements; when wrapping a non-interactive tag (span, plain text), add explicit keyboard-focus support, or better, use an inherently interactive element like a button.
- Uses aria-describedby by default to link trigger to content; if the tooltip text exactly duplicates the trigger's own accessible label, suppress the redundant screen-reader announcement.
- For disabled EUI buttons, use an aria-disabled-style state (not a hard HTML disabled attribute) so the trigger remains keyboard-focusable and its tooltip still works; for other elements, pair aria-disabled with pointer-events:none.
- Position is a suggestion — it auto-adjusts near screen edges; default anchor offset is 16px, adjustable.
- The icon-tip variant wraps an icon specifically to explain a UI option/feature — but explanations should be surfaced inline in the UI first, with an icon-tip only as a last resort when that's not possible.

## Tour
Source: https://eui.elastic.co/docs/components/display/tour/

- Appropriate for three scenarios: brand-new users, novice users building proficiency, and existing users being onboarded to new features/redesigns.
- Tours should be a learning aid, not an intrusive interruption — prefer asking users if they want a tour rather than just showing it to them.
- Be selective with tour content — avoid stating the obvious/basic, since low-value content makes users dismiss tours; prefer linking out to documentation for anything that needs more than a short explanation, rather than writing long step text.
- Concise, genuinely useful step content is the goal — verbose text risks feeling unhelpful and can discourage engagement with future tours.
- Structurally, a tour can wrap target elements directly, or anchor to a DOM node via ref/function/selector; sequences can guide the user through required page actions, or run as independent, stateless steps paired with app-managed state.
