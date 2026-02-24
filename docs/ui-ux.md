# AquaSmart UI/UX Documentation (Current)

## Scope
- Documents the current UI and UX as implemented in the Next.js app in this repo.
- Covers unauthenticated marketing and auth flows plus all authenticated dashboard modules.
- Sources: app routes in app/, shared UI in components/, and global styles in app/globals.css.

## Global Experience

### Access states
- Unauthenticated: root route renders Marketing Landing Page with sign-in CTA.
- Authenticated: root route renders Dashboard home.
- Auth flows: /auth (sign in/up), /auth/verify-success (post email verification), /auth/auth-error (temporary block).

### App shell (authenticated)
- DashboardLayout defines a two-column shell: left sidebar plus right content area.
- Sidebar: fixed, collapsible on desktop, slide-in drawer on mobile with overlay; active route is highlighted.
- Header: sticky top bar with role badge, theme toggle, notification dropdown, user menu (Settings, Log out).
- Main content: padded container with subtle page fade-in animation.

### Navigation map
| Nav label | Route | Purpose |
| --- | --- | --- |
| Dashboard | / | KPI overview and operations summary |
| Data Entry | /data-entry | Create operational records |
| Inventory (Fish and Feed) | /inventory | Stock and feed tracking |
| Feed Management | /feed | Feeding analytics and anomaly detection |
| Sampling and Mortality | /sampling | ABW trend and growth planning |
| Water-Quality Monitoring | /water-quality | Water parameter monitoring and compliance |
| Transactions and Activity Log | /transactions | Audit trail and operator activity |
| Reports and Analytics | /reports | Exportable performance reports |
| Settings | /settings | Farm info and thresholds |

## Visual Design System

### Typography
- Primary font: DM Sans (global).
- Monospace: IBM Plex Mono (code or numeric accents).
- Serif: Lora (available but not heavily used).
- Auth page overrides with Inter via inline CSS import.

### Color system (CSS variables)
Light theme:
- Background: #f0f8ff
- Card: #ffffff
- Foreground: #374151
- Primary: #22c55e
- Secondary: #e0f2fe
- Accent: #d1fae5
- Border: #e5e7eb
- Muted: #f3f4f6
- Destructive: #ef4444
- Sidebar: #e0f2fe
Dark theme:
- Background: #0f172a
- Card: #1e293b
- Foreground: #d1d5db
- Primary: #34d399
- Secondary: #2d3748
- Accent: #374151
- Border: #4b5563
- Muted: #1e293b
- Destructive: #ef4444
- Sidebar: #1e293b

### Surfaces and components
- Card-based layout with rounded corners (radius 0.5rem) and subtle shadows.
- Tables with sticky headers and responsive column hiding.
- Charts rendered with Recharts (line, area, bar, composed).

### Motion and effects
- Subtle fade-in on main content.
- Hover transitions on cards, buttons, and tables.
- Dithering shader backgrounds on Landing and Auth pages.
- Reduced motion respected via global CSS media query.

## Shared UI Patterns

### FarmSelector (stage, batch, system)
- Dropdown trio for stage, batch, and system filters.
- Validates selections against available options and resets to "all" when invalid.

### TimePeriodSelector
- Popover trigger with preset ranges: day, week, 2 weeks, month, quarter, 6 months, year.

### Notifications and toasts
- Global toast system plus header notification dropdown.
- Notifications are generated from realtime Supabase changes on water quality and inventory thresholds.
- Unread count badge in header; dropdown allows mark all read and clear.

### Export patterns
- CSV exports in dashboards, reports, and data tables.
- PDF exports via print flows for report modules (where implemented).
- File names include date ranges for traceability.

### Form patterns
- React Hook Form plus Zod validation.
- Default values prefilled (often today's date).
- Inline validation messages.
- Submit button shows spinner when pending.

### Loading and empty states
- Skeleton blocks for cards and charts.
- "No data available" messages in tables and charts.
- Empty state copy is consistent and plain.
- Error states show a destructive banner or inline card with a retry action.
- Background refetch shows a small "Updating..." badge and keeps current data visible.
- Data freshness timestamps show "Updated X ago" on data-heavy panels.

### Keyboard shortcuts
- Cmd/Ctrl + K opens Quick Actions.
- Cmd/Ctrl + N opens Data Entry.
- Cmd/Ctrl + Shift + F jumps to Feeding entry.
- Cmd/Ctrl + Shift + S jumps to Sampling entry.
- Bottom-right Shortcuts button surfaces the cheat sheet.

## Page-by-Page Documentation

### Landing Page (/, unauthenticated)
- Hero section with layered gradient and dithering background.
- CTA button "Sign In" routes to /auth.
- Features grid with icon cards: KPIs, inventory, water quality, sampling, reporting, operations intelligence.
- Footer with product tagline.

### Authentication (/auth)
- Full-screen layout with animated background and glassy card.
- Sign in and sign up modes with toggle link.
- Email and password validation:
  - Email must be valid format.
  - Password must be >= 8 chars on sign up.
- Inline toasts for errors, success, and offline states.
- Theme toggle (light/dark) in top-right.
- Back to home link under email field.

### Auth Verify Success (/auth/verify-success)
- Confirmation card with check icon and "Email Verified".
- Auto-redirect to dashboard after 2.5 seconds.

### Auth Error (/auth/auth-error)
- Message card indicating auth section blocked.
- Auto-redirect to home after 2 seconds.

### Dashboard (/, authenticated)
Top-level structure:
- Header card: title, farm name, Refresh and Export (XLSX) actions.
- Sticky filter bar: FarmSelector plus TimePeriodSelector plus "Add Data" dropdown with quick entry shortcuts.
- KPI Overview: KPI cards with trend sparkline and link to Production Drilldown.
- Feed Efficiency and Mortality Monitoring:
  - PopulationOverview charts: eFCR trend (area) and Mortality trend (area).
  - HealthSummary cards for Water Quality and Fish Health with progress bar and status tone.
- Operations Table:
  - Dense systems table with filters: All, Top 5 (best eFCR), Bottom 5 (worst), Missing data.
  - Sticky headers and responsive columns.
  - Row click opens a side sheet with summary, live inventory snapshot, flags, and quick actions.
- Production Summary Metrics: 5 KPI cards for stock, mortality, transfers, harvest.
- Recent Activity: timeline list of last 5 events by type.
- Recommended Actions: priority cards with due date and "Schedule" link.

### Data Entry (/data-entry)
Layout:
- Left sidebar of entry types, right panel with form plus recent entries table.
- Sidebar items: System, Stocking, Mortality, Feeding, Sampling, Transfer, Harvest, Water Quality, Incoming Feed.

Forms and fields:
- System: name, type, growth stage, depth, volume, length, width, diameter (conditional by type).
- Stocking: system, batch, date, fish count, total weight, ABW, stocking type (empty or already stocked).
- Mortality: system, batch (optional), date, fish count, total weight (optional), ABW (optional).
- Feeding: system, batch (optional), date, feed type, amount (kg), response (very good, good, bad).
- Sampling: system, batch (optional), date, sample count, total sample weight (kg), ABW (optional).
- Transfer: origin system, destination system, batch (optional), date, fish count, total weight, ABW (optional).
- Harvest: system, batch (optional), date, fish count, weight (kg), harvest type (partial or final).
- Water Quality: system, date, time, water depth, optional measurements (temperature, DO, pH, ammonia, nitrite, nitrate, salinity, secchi). At least one measurement is required.
- Incoming Feed: date, feed type, quantity (kg).

Recent entries:
- Each form shows a relevant recent entries table with date, system, and key metrics.

### Inventory Management (/inventory)
Tabs: Fish Inventory, Feed Stock, Reconciliation.

Fish Inventory:
- KPI cards: current stocking, mortality-adjusted total, forecast harvest count (30 days), latest biomass.
- Trend panel:
  - Metric switch (population, mortality, biomass).
  - Time window dropdown (30, 90, 180 days).
  - Summary stats (latest, peak, average, min).
  - Chart type: area for population and biomass, bar for mortality.
- Daily timeline table:
  - Search by date, filter by mortality or biomass, sort by date, page size selection.

Feed Stock:
- KPI cards: feed types, on-hand kg, avg daily consumption, days of supply, reorder recommendation.
- Reorder management:
  - Threshold days input.
  - Alert if below threshold.
  - Purchase order list stored in localStorage with status updates.
- Incoming feed shipments table with feed details and dates.

Reconciliation:
- KPI cards: systems reconciled, flagged variances, reconciliation date.
- Table comparing recorded vs physical counts.
- Flags variance when >= 5 percent.
- Physical count inputs are stored in localStorage.
- CSV export for reconciliation report.

### Feed Management (/feed)
Filters:
- FarmSelector for stage, batch, system.
- Time period picker.
- Target eFCR input stored in localStorage.

KPI summary:
- Weighted protein percent.
- Weighted crude fat percent.
- Current eFCR.
- Target gap indicator (positive or negative).

Sections:
- Feed efficiency metrics: line chart of eFCR with target reference line.
- Nutrition analysis: bar chart for protein percent and crude fat percent by feed type.
- Feeding trends and anomalies:
  - Line chart for actual vs expected feeding.
  - Anomaly table with z-score and deviation.
  - CSV export for anomaly rows.
- Attention table: feeding records with fair or poor response.
- Incoming feed inventory table filtered by selected period.

### Sampling and Growth (/sampling)
Filters:
- FarmSelector plus time period.
- Target harvest ABW input.
- Manual daily gain override.

KPI cards:
- Total samples, latest ABW, ABW variability (CV), average sample size, days to target.

Sections:
- ABW trend and growth projection:
  - Line chart for observed ABW.
  - Expected ABW line and optional target reference line.
  - Projected target date shown when available.
- Sample quality calculator:
  - Textarea for comma-separated weights.
  - Outputs mean, standard deviation, CV, and validation status (>= 10 samples).
- Sampling records table with sample size coloring (good if >= 10).

### Water Quality Monitoring (/water-quality)
Filters and actions:
- FarmSelector and time period.
- Parameter selector for trend chart.
- Export CSV and PDF buttons.

Data integrity:
- Error banner listing failed data sources if any query fails.

Primary sections:
- Exceeded systems table:
  - Shows systems breaching DO or ammonia thresholds.
- Thresholds panel:
  - Inputs for low DO and high ammonia.
  - Save thresholds action with toast feedback.
  - Current DO and ammonia status cards (green, yellow, red).
  - Latest derived rating card.
- Trend chart:
  - Selected parameter trend.
  - Optional overlay lines for feeding and mortality.
- Compliance table:
  - Shows latest measurement events with system, timestamp, and operator.
- Predictive alerts:
  - 3 day forecast based on trend slope.
  - Recent alert feed from notification system.

### Production Drilldown (/production)
- Back button to dashboard.
- FarmSelector and time period filters.
- KPI snapshot mirrors dashboard cards.
- Systems table mirrors dashboard table for deep dive.
- Optional context card from KPI drilldown query params.

### Reports and Analytics (/reports)
Filters:
- FarmSelector (compact).
- Template selector (weekly, monthly, seasonal) which adjusts date range.
- Date range inputs.
- CSV export dropdown for inventory, transactions, and KPI data.

Tabs:
- Performance: summary cards, performance trend, system biomass comparison, benchmark status, and detailed records with CSV/PDF export.
- Feeding: feed amount trend, eFCR trend, summary cards, and detailed records with CSV/PDF export.
- Mortality: mortality trend, cause breakdown, summary cards, and detailed records with CSV/PDF export.
- Growth: ABW and biomass trends, summary cards, and detailed records with CSV/PDF export.
- Water Quality: compliance summary and detailed measurement table with CSV/PDF export.

### Transactions and Activity Log (/transactions)
Filters:
- Event type, operator, time period, reset.
- FarmSelector for stage, batch, system.

Sections:
- Summary cards (clickable) for totals and key events.
- Consolidated activity feed table:
  - Single timeline with type, system, operator, and change details.
- Operator activity table:
  - Totals by operator with CSV export.
- System performance by activity:
  - Correlates activity volume with mortality and eFCR and flags high operator turnover.

### Settings (/settings)
Sections:
- Farm Information: name, location, owner, email, phone, role.
- Alert Thresholds: low DO, high ammonia, high mortality.
- Save Settings button with loading state.
- Success and error banners after save.

## Notifications and Alerts
- Generated from Supabase realtime inserts for water quality and daily inventory.
- Severity levels: warning or critical.
- Delivered as toast notifications and stored in header dropdown with read state.
- Alerts include low DO, high ammonia, high mortality, and feeding rate deviations.
- Critical toasts include "View" actions that deep-link to the relevant dashboard or report.

## Performance Behaviors
- Charts lazy-render when scrolled into view to reduce initial paint cost.
- Long activity feeds use virtual scrolling to keep render time stable on large datasets.
- Search inputs debounce to avoid re-filtering on every keypress.

## Responsive Behavior
- Sidebar becomes a slide-in drawer on mobile.
- Tables hide less critical columns at smaller breakpoints.
- Sticky filter bars are used on key analytical pages for quick filter access.
- Landing and auth pages use full-height responsive cards.

## Accessibility Notes
- Buttons and inputs use clear labels and aria attributes on filter controls.
- Table rows in the systems table are keyboard accessible (Enter and Space).
- Reduced motion preference is respected via global CSS.
