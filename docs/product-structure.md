# AquaSmart Product Structure

## Research Basis

This structure is aligned to the operational pattern used by Aquanetix:

- mobile/data capture for fast field entry
- a manager web dashboard for daily decisions
- a separate analytics/reporting layer for history, exports, and review

Primary references:

- https://aquanetix.co.uk/aquaculture-software-benefits-platform.html
- https://aquanetix.co.uk/aquaculture-software-services.html
- https://aquanetix.co.uk/aquaculture-software-faq.html

## Product Layers

### 1. Operate

These screens answer live operational questions and should be the manager's default workflow.

- `Dashboard`
  - What needs attention today?
  - Core KPIs, system exceptions, advisory actions, recent activity
- `Feed`
  - Are we feeding correctly today?
  - Feed variance, appetite issues, FCR trend, stock cover, low-oxygen constraints
- `Growth`
  - Are fish growing to plan?
  - ABW trend, growth projection, capacity readiness, latest growth snapshot
- `Mortality`
  - Where are losses happening?
  - Event logging, survival trend, alert review, cause breakdown
- `Water Quality`
  - Is the environment limiting performance?
  - Status, alerts, sensor freshness, parameter trends, environmental indicators

### 2. Analyze

This layer is for historical review, compliance, exports, and scheduled reporting.

- `Reports`
  - What happened over a period?
  - Performance, feeding, mortality, growth, water-quality reporting

### 3. Capture

This layer is for entering raw farm events and should stay fast and task-oriented.

- `Data Capture`
  - What happened in the farm?
  - Systems, stocking, feeding, mortality, sampling, transfer, harvest, water quality, incoming feed

### 4. Configure

- `Settings`
  - Farm profile, thresholds, and configuration

## Feature Rules

### Keep As Top-Level Pages

- dashboard
- feed
- growth
- mortality
- water quality
- reports
- data capture
- settings

### Keep As Embedded Features, Not Top-Level Pages

- feed inventory
  - belongs inside `Feed`
- stock status and biomass tracking
  - belongs inside `Dashboard`, `Growth`, and reports
- activity log and traceability timeline
  - belongs inside `Dashboard` and record-level reports
- production metric drilldowns
  - belongs inside `Reports`, `Feed`, and `Growth`

### Avoid Reintroducing

- a standalone transactions page
- a standalone production metrics page
- duplicate KPI pages that restate feed, growth, or mortality with different chart wrappers
- export shells that duplicate the report components themselves

## Important Questions Each Page Must Answer

- `Dashboard`
  - Which cages need action now?
- `Feed`
  - Which cages are above or below ration target, and do we have enough stock?
- `Growth`
  - Are we on target for ABW and next move or harvest timing?
- `Mortality`
  - Are losses rising, and where is survival deteriorating?
- `Water Quality`
  - Are oxygen, temperature, or other parameters constraining feeding and growth?
- `Reports`
  - What happened over the selected period, and what do we export?
- `Data Capture`
  - How do staff record the event with minimal friction?

## Missing Features Worth Adding Later

- personnel performance views tied to who recorded and who fed
- unit history view per cage with one-click operational timeline
- scheduled feedings and planned task queue
- notes and photos linked to events and systems
- forecast surfaces for feed needs and harvest readiness

These should be added inside the existing page structure, not as new top-level routes.
