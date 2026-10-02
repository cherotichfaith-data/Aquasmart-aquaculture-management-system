# Elastic UI (EUI) — Patterns & Content Reference

Condensed design-rule notes from the EUI docs site, extracted for use as external
design guidance when auditing this app's UI (not related to the `@elastic/eui`
React package, which this codebase does not use).

Source root: https://eui.elastic.co/docs/

---

## Patterns

### Error messages

Source: https://eui.elastic.co/docs/patterns/error-messages/

- Always tell the user exactly what went wrong, and any action they can take to fix it. Missing or poorly written error messages create frustration and read as low product quality.
- **Primary errors** (block the task, expected page can't be shown): redirect the user to a dedicated error page. Example given: 403 permission denied.
- **Secondary errors** (block the task, but the expected page can still be shown): display an error banner and reload without losing the user's existing input/information. Example given: 504 API/cluster unresponsive.
- **Validation errors** (incorrect entry format): display an error summary, highlight the specific fields causing the error, and reload without losing entered data. Example given: 400 bad request.
- **Warnings** (issues elsewhere in the app that don't block the current task): surface them as informational, less urgent than blocking errors.
- Never surface a raw error code to the user (e.g. don't just show "error 504") — translate what it means into plain language.
- Prefer preventing errors in the first place: use clear instructions and interface design to stop problems before they occur.

### Help content

Source: https://eui.elastic.co/docs/patterns/help-content/

- Give "the right content at the right time" — focus help text on what the user needs for their *next* step, not everything they could know.
- Avoid information overload: too much help text confuses rather than assists.
- Consider what the user already knows vs. what they still need to learn before deciding how much to explain.
- Don't push all help content into the user's face by default — distinguish critical information (show directly) from context-specific or user-type-specific content (let the user opt in, e.g. via a recognizable icon/interaction).
- Anticipate errors and questions — provide guidance proactively, before the user hits the problem, not only as a reaction after it happens.
- Short inline definitions are especially useful during onboarding or in the first few steps of a new feature, when terminology is unfamiliar.

### Health and Severity

Source: https://eui.elastic.co/docs/patterns/severity/

- Distinguish the two indicator types: **Health** describes the status of an element (e.g. node, environment, host) that is inherently positive or negative. **Severity** indicates an increasing level of risk.
- Severity has 6 generic levels, each with a default color token:

| Level | Name | Purpose | Color |
|---|---|---|---|
| 0 | Unknown | Unknown/unassigned, no positive or negative meaning | Blue grey `#E3E8F2` |
| 1 | Good/Success | Healthy elements, positive outcomes | Green `#24C292` |
| 2 | Regular/Neutral | Usual/acceptable state, needs recognition but not emphasis | Sky blue `#B5E5F2` |
| 3 | Warning | Starting level of concern, needs attention | Yellow `#FCD883` |
| 4 | Risk | Mid-level risk, potential escalation | Orange `#FF995E` |
| 5 | Danger | Highest danger, needs immediate attention | Red `#EE4C48` |

- The level names are intentionally generic — different products/contexts can relabel them with dedicated terminology while keeping the same color/severity ordering, so behavior stays consistent even when wording differs.
- The system provides text tokens, background tokens (base/light/filled variants), and severity color tokens so an indicator's meaning stays consistent everywhere it's reused.

### Nested drag and drop

Source: https://eui.elastic.co/docs/patterns/nested-drag-and-drop/

- For simple (non-nested) lists, a plain draggable/droppable list pattern is sufficient.
- For complex scenarios — moving items between different nesting levels — a simple drag-and-drop wrapper is not enough; it has real limitations (can't move items across nesting levels).
- Accessibility requirement for complex trees: **do not** try to mimic mouse dragging using only keyboard arrow keys. Instead, provide an explicit **"Move" action** (e.g. a contextual menu item) so keyboard/screen-reader users have a non-spatial way to relocate an item.
- Use accordion-style nested containers with roving tabindex (one tab stop per level, arrow keys move focus within it) to keep a nested tree navigable by keyboard.
- Takeaway for a non-EUI app: any nested drag-and-drop UI needs a keyboard-accessible non-drag fallback ("Move to…") — drag alone is not an accessible interaction for reordering across hierarchy levels.

### Tables

Source: https://eui.elastic.co/docs/patterns/tables/ (404 — no general "Tables" overview page currently published; only the pagination sub-page below exists)

- No additional layout/column/row-action/empty-state guidance is currently published on a general Tables overview page — treat this pattern as pagination-only in EUI's current docs.

### Tables — pagination

Source: https://eui.elastic.co/docs/patterns/tables/table-pagination/

- Default page size should be **25 rows** — a balance between a usably long list and performance concerns, for basic/content-management-style tables.
- Pagination controls should be configurable by the user rather than a fixed, unchangeable page size.
- These are baseline defaults for simple tables only — large data grids or more complex tables may reasonably need different pagination behavior.

---

## Content (writing/style guidelines)

### Voice and writing style

Source: https://eui.elastic.co/docs/content/style/

- Address users directly; avoid overusing possessive markers like "yours."
- Use contractions and active voice.
- Avoid complex language and phrasal verbs — many users are non-native English speakers.
- Use "I"/"my" only when giving the user full ownership of a statement (e.g. legal agreement text). Use "we" when describing an action Elastic (the product) is taking on the user's behalf.
- Never use a verb or determiner alone without a noun in buttons/action menus — prefer "Save dashboard" over bare "Save," "this setting" over bare "this."
- Keep terminology, spelling, capitalization, punctuation, and abbreviations consistent throughout.
- Shorten content to what's meaningful and scannable without losing clarity; delete unnecessary/vague wording, especially most adverbs.
- Never blame the user for an error — give guidance and encouragement instead.
- Give specific values/timeframes instead of vague estimates: "This operation can take up to 5 minutes" rather than "Wait a few minutes."
- Overall stance: user-focused, plainspoken, inclusive, empathetic, timely, informative, action-oriented; use action verbs in UI copy.

### Tone (adapting tone to context)

Source: https://eui.elastic.co/docs/content/adapt-tone/

- **Stimulating** tone (product tours, new-feature announcements): exclamation marks allowed but sparingly; explain how the feature benefits the user; pair text with visuals. Motivational, excited, enthusiastic.
- **Informational** tone (menus, titles, settings, tooltips, help text, buttons, links, event logs, confirmation modals — the most common tone in an interface): use the minimum words needed; write for scanning so users can quickly find what matters; use action verbs for controls/settings, clear nouns for menus/form fields.
- **Supportive** tone (errors, licensing/billing issues, vulnerability content, warnings, upgrade/deprecation notices): be more action-oriented than usual — give a direct path forward. Focus on what went wrong, don't be apologetic. Help the user understand how it happened, how to prevent it, and how to fix it. Always give a clear action, or explicitly state that no action is needed. Reassuring but serious/urgent register.
- **Stern** tone (danger warnings, unsupported actions): use stronger words that highlight the negative consequences; format the content so the risk visually stands out. Deterring, cautionary, advisory register.

### Language

Source: https://eui.elastic.co/docs/content/language/

- Use American English spelling in UI copy: -ize/-yze not -ise/-yse (organize, authorize, analyze); -or not -our (flavor, color, behavior); -ense not -ence (license, defense, pretense); -og not -ogue (dialog, catalog, epilog).
- Use sentence case by default for navigation, titles, headers, and buttons (not Title Case).
- Capitalize branded/product/solution names (e.g. "Elastic Observability"); capitalize acronyms (URL, API); don't capitalize generic/common-noun usage (e.g. "our serverless architecture").
- Ellipsis (`…`): only for truncated text or a wait/in-progress state — never to indicate a list or a set of capabilities.
- Exclamation marks: avoid, with rare exception for genuinely exciting news (and even then, sparingly).
- Use the Oxford comma before the final item in a list.
- Periods: use with descriptive text, messages, notifications, and complete-sentence list items; omit from headers, titles, placeholders, and incomplete-sentence list items.
- Use contractions when they make the text flow more naturally (didn't, can't).

### Accessibility (in content/copy)

Source: https://eui.elastic.co/docs/content/accessibility/

- Use clear structure and meaningful wording so a user can tell within seconds whether a feature/flow is relevant to them.
- Add alt text to all images, icons, and media files; alt text should be concise and describe what can't otherwise be seen/heard. Example: replace "Image of in progress rule creation form" with "User is setting up a new threshold rule."
- Use plain, jargon-free language even for technical actions. Example: replace "Update the sourcerer selection to be the default detections data view" with "Choose the default Security data view."
- Never use vague link text like "click here" or "read more" — screen readers list links out of context, so link text must stand alone. Example: replace "Click here for more information" with "Learn more about indices."
- Avoid device-specific verbs ("type," "select," "click" as a universal instruction) — prefer device-agnostic verbs: "enter" instead of "type," "choose" instead of "select" (click is acceptable specifically for mouse actions, see Word choice).
- Never use directional language that assumes a specific layout or visual access — no "above," "below," "left," "right." Example: replace "Complete the form below" with "Complete the following form."

### Inclusivity

Source: https://eui.elastic.co/docs/content/inclusivity/

- Write for international/non-native-English audiences: use short sentences, plain language, active voice, present tense.
- Avoid negated phrasing — rewrite to the positive. Example: replace "You cannot access without signing up" with "Sign up to access."
- Choose words with a single, unambiguous meaning.
- Avoid ambiguous date formats like `04/05/06`; use an unambiguous format such as `11/17/1987`.
- Use diverse, globally representative examples.
- Avoid idioms, regional expressions, sports metaphors, and pop-culture references — they don't translate universally.
- Latin abbreviations — replace: "e.g." → "for example"; "etc." → "and more" / "and so on"; "i.e." → "that is"; "via" → "by way of" / "through."
- Use gender-neutral language: singular "they/their" for pronouns; "folks" instead of "guys"; "humanity" instead of "mankind"; "police officer" instead of "policeman."
- Avoid violent/aggressive or ableist terms. Specific replacements: "abort" → stop/cancel/end; "boot" → start/run; "execute" → run/complete; "hack" (noun) → tip/workaround; "hack" (verb) → configure/modify; "hit" (verb) → click/press; "kill" → cancel/stop; "terminate" → stop/exit.
- Avoid buzzwords and superhero terminology generally.

### Word choice

Source: https://eui.elastic.co/docs/content/word-choice/

Preferred terms and when to use them:
- **add** — establishing a new relationship; common in create-then-add flows.
- **cancel** — stop an action without saving pending changes.
- **can't** — indicate the user lacks the ability to do something.
- **create** — building an object from scratch; always followed by an object noun. Never write "create new."
- **delete** — data the user can no longer retrieve afterward.
- **edit** — preferred over "change" or "modify" (better for localization).
- **enter** — user enters text; don't use "type."
- **later** — when referring to a later product version.
- **open** — opening an app/program; don't use "launch."
- **press** — for keyboard keys; don't use "hit."
- **remove** — ending a relationship without permanently deleting the underlying data.
- **select** — preferred over "choose."
- **use** — preferred over "utilize" / "make use of."
- **view** — preferred over "see" (more inclusive).

Terms to avoid, with replacements:

| Avoid | Use instead |
|---|---|
| e.g. | for example / such as |
| i.e. | that is |
| via | with / by using / through |
| above | link text, "previous," or "preceding" |
| below | link text or "following" |
| abort | shut down, cancel, stop |
| as well as | and |
| blacklist | blocked list |
| boot | start, run |
| bottom left/right | lower left/right (hyphenate as adjective) |
| choose | select |
| disable | turn off, block, hide (or "inactive"/"unavailable"/"deactivate"/"deselect" — never use for something that's broken) |
| enable | turn on, allow |
| easy / easily | omit or rephrase |
| execute | run, start |
| hack (noun) | tip, work-around |
| hack (verb) | configure, modify |
| hit (noun) | visits |
| hit (verb) | select, press |
| hear / hear about | learn |
| impact (verb) | affect |
| in order to | to |
| invalid | not valid, incorrect |
| just | omit before commands |
| launch | open |
| ok (as a button label) | an action-specific label, e.g. "Delete rule" |
| normal / normally | usual, typical, usually, typically, generally |
| please | omit, except when the user must wait or do something inconvenient |
| simple / simply | omit or rephrase |
| sorry | reserve for genuinely serious error messages only |
| success | omit or rephrase |
| terminate | stop, exit |
| type | enter |
| top left/right | upper left/right (hyphenate as adjective) |
| utilize | use |
| whitelist | allow list |

Avoid nominalizations (turning a verb into a noun phrase): use "choose" not "make a choice"; "register" not "complete your registration"; "investigate" not "conduct an investigation."

Use-with-caution terms (context-dependent, not banned):
- **app/application** — only when needed for clarity.
- **begin** — fine for "begin a procedure/analysis/installation."
- **can** — use for capability, but rewrite as a direct action if possible.
- **click** — acceptable specifically for mouse actions; otherwise use a device-agnostic verb.
- **clone** — a copy that stays linked to the original.
- **copy** — a copy added to the clipboard, pasteable.
- **duplicate** — a copy created immediately, in the same location.
- **kill** — use "cancel" or "stop" unless the literal underlying command is `kill`.
- **may** — permissibility.
- **might** — possibility.
- **start** — fine for "start a program/engine/timer."
- **unable** — not being able to perform an action.

---

## Fetch status

- Patterns fetched successfully: Error messages, Help content, Health and Severity, Nested drag and drop, Table pagination (5/6 target pages).
- Patterns not found: general `/docs/patterns/tables/` overview page returned HTTP 404 — only the `table-pagination` sub-page exists under Tables.
- Content section: all 6 sub-pages fetched successfully (Voice and writing style, Tone, Language, Accessibility, Inclusivity, Word choice).
