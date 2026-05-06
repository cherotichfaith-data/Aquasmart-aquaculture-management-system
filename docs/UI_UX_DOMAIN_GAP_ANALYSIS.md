# Comprehensive UI/UX and Aquaculture Domain Gap Analysis - AquaSmart

**Date**: May 4, 2026  
**Focus**: UI/UX Design, Visualizations, Aquaculture Metrics, Domain Completeness  
**Status**: Early-stage SaaS with foundational architecture but significant domain/UX gaps  

---

## EXECUTIVE SUMMARY

AquaSmart has a **well-built technical foundation** with modern Next.js architecture, solid form implementations, and offline capability. However, it suffers from significant gaps in:

1. **Aquaculture domain coverage** — Missing critical industry workflows and metrics
2. **Visualization depth** — Limited to basic line charts, missing comparative/statistical analysis
3. **Dashboard intelligence** — Static KPI display, no customization or anomaly detection
4. **Data quality** — Unstructured data entry (free-text causes), missing validation
5. **Visual design** — Color semantics confused, inconsistent component styles
6. **Operational workflows** — Disease tracking, equipment management, compliance missing

**What's Working:**
- Modern, responsive UI architecture (Next.js + MUI)
- Effective form-based data entry with validation
- Role-based access control properly enforced
- Offline support with sync capability
- Basic metrics (eFCR, mortality, ABW) implemented

**What's Missing:**
- 40+ industry-standard aquaculture metrics
- Disease/treatment tracking (regulatory requirement)
- Batch traceability and supplier linking
- Equipment/sensor management
- Multi-parameter analysis and forecasting
- Economic cost tracking
- Advanced visualizations (comparisons, distributions, correlations)

---

## 1. PAGE STRUCTURE & LAYOUT ANALYSIS

### Current Pages (13 Major)

**Operational Workflows:**
- `/dashboard` — Core KPI overview and production status
- `/feed` — Feed management, consumption tracking, inventory
- `/sampling` — Growth sampling, harvest forecasting
- `/mortality` — Mortality events, survival trends
- `/water-quality` — Water parameter monitoring and compliance
- `/data-entry` — Centralized form-based data capture (9 forms)
- `/production` — Production analytics and trend analysis
- `/reports` — Comprehensive reporting (6 report types)

**Administrative:**
- `/settings` — Farm configuration and alert thresholds
- `/users` — User management and role assignment
- `/onboarding` — New farm setup and team invitations

### Navigation Architecture

**Strengths:**
- ✅ Clear sidebar navigation with 4 main sections (Operate/Analyze/Capture/Configure)
- ✅ Role-based access control (menu items hidden per role)
- ✅ Responsive drawer on mobile
- ✅ Consistent URL structure (`/dashboard/*`, `/data-entry?type=*`)

### CRITICAL GAPS & ISSUES

#### 1. Missing Contextual Navigation

**Issue:** No breadcrumbs, back buttons, or page hierarchy indicators

**Current State:**
- User on `/dashboard?system=tank-5&batch=batch-23`
- No visible indication of applied filters
- Clicking "Production" navigates away without context saving
- User loses filter context

**Impact:**
- High cognitive load for users switching between views
- Difficult to navigate back to filtered view
- Especially problematic on mobile (can't see breadcrumbs)

**Recommendation:**
```
Dashboard layout should show:
  
  Home > Dashboard > Tank-5 (Active)
  
  With visual badges for active filters:
  [ System: Tank-5 ] [ Batch: Batch-23 ] [Clear All]
```

#### 2. Missing Quick-Access Workflows

**Current State:**
- User must navigate: Sidebar → Data Entry → Select Form Type → Select System
- Common task (record daily feeding) requires 4 clicks minimum

**Recommendation: Context-Aware Quick Actions**

```tsx
// On Dashboard, add "Quick Action" buttons:
<QuickActionBar>
  <Button icon={Feed}>Record Feeding (Tank-5)</Button>
  <Button icon={Water}>Log Water Quality (Tank-5)</Button>
  <Button icon={Mortality}>Report Mortality</Button>
  <Button icon={Sampling}>Schedule Sampling</Button>
</QuickActionBar>

// Per-system card:
<SystemCard system="tank-5">
  <Button size="sm" onClick={quickEntry('feed')}>+ Feed</Button>
  <Button size="sm" onClick={quickEntry('wq')}>+ WQ</Button>
  <Button size="sm" onClick={quickEntry('mortality')}>+ Mortality</Button>
</SystemCard>
```

#### 3. Missing Page Titles & Context

**Current State:**
- Data Entry page doesn't show selected form type in title
- Reports page doesn't show selected report type
- Water Quality page doesn't highlight selected system

**Recommendation:**
```
Use <Metadata> and page-level badges to show context:

  "Water Quality Monitoring — Tank-5"
  "Reports — Growth Performance Report (Last 30 days)"
  "Data Entry — Feeding Record Entry"
```

#### 4. No Information Architecture for Drilldown

**Current State:**
- Dashboard KPI cards link to /production with filter applied (good!)
- But /production page doesn't show "what triggered this navigation"
- Systems table doesn't allow drilling into system detail page
- Can't see system-specific metadata (size, type, stocking date, target harvest date)

**Recommendation:**
Create `/dashboard/system/:systemId` page showing:
- System metadata (volume, capacity, stocking density target)
- Current stock (count, ABW, biomass)
- Production cycle (stocking date, projected harvest date, stage)
- Health metrics (mortality rate, WQ parameters, feed conversion)
- Recent activities specific to this system
- Alert thresholds for this system

#### 5. Responsive Design Issues

**Strengths:**
- ✅ Sidebar collapses to drawer on mobile
- ✅ Grid layouts use proper breakpoints (xs/sm/md/lg)
- ✅ Forms are mobile-responsive

**Gaps:**
- No explicit tablet (iPad) optimization
- Touch targets could be larger on mobile (buttons are 32px, should be 44px+)
- Data tables don't have mobile-optimized card view
- Systems Table on dashboard may not be readable on small screens

**Recommendation:**
Test and optimize for iPad (768px width):
- Larger sidebar with category labels
- Multi-column layouts (2 columns instead of 1)
- Larger touch targets

---

## 2. VISUALIZATIONS & CHARTS GAP ANALYSIS

### Current Chart Infrastructure

**Technology:** Chart.js 4.x with react-chartjs-2

**Chart Types Available:**
- Line (time series)
- Bar (comparisons)
- Doughnut (proportions)
- Scatter (correlations)

**Files:** 
- Theme builder: `/src/components/charts/chartjs-theme.ts`
- Chart wrappers: `/src/components/charts/`, `/src/components/reports/`
- Usage: Dashboard, Production, Feed, Mortality, Water Quality, Reports

### Current Visualizations Inventory

| Page | Chart | Type | Issues |
|------|-------|------|--------|
| Dashboard | Production Trend | Line (ABW over time) | Single metric only, no comparisons |
| Production | eFCR, Mortality, ABW, Feed Rate, Density | 5 Line charts | Missing: ranges, targets, benchmarks |
| Feed | Feed Rate Analysis | Line (feed kg/day) | Missing: forecasted demand, waste |
| Mortality | Survival Trend | Line (survival %) | Missing: cause breakdown, anomaly highlighting |
| Water Quality | Daily Rating (gauge) + Parameters | Scatter + Lines | 8 separate parameter lines, no correlation |
| Reports | Growth, FCR, Mortality, Performance | Line charts | Missing: batch comparison, year-over-year |

### CRITICAL VISUALIZATION GAPS

#### 1. Missing Comparative Visualizations

**Gap:** Cannot compare batch-to-batch or system-to-system performance

**Current State:**
- FCR chart shows one system's FCR trend line
- No way to overlay "previous batch FCR" for comparison
- No industry benchmark line
- No "target FCR" band

**Industry Standard:**
Professional farm software shows:
- Current batch (solid line)
- Previous batch (dashed line)
- Historical average (dotted line)
- Industry benchmark (colored band)
- Target range (shaded area)

**Recommendation:**
```tsx
// Enhanced Production Chart
<ProductionChart metric="fcr" system="tank-5">
  <Line 
    label="Current Batch" 
    data={currentBatch}
    style="solid"
    color="#22c55e"
  />
  <Line 
    label="Previous Batch" 
    data={previousBatch}
    style="dashed"
    color="#94a3b8"
  />
  <Band 
    label="Industry Benchmark (2.0-2.2)" 
    min={2.0} 
    max={2.2}
    color="rgba(52, 152, 219, 0.1)"
  />
  <Band 
    label="Target (1.8-2.0)" 
    min={1.8} 
    max={2.0}
    color="rgba(46, 204, 113, 0.1)"
  />
</ProductionChart>
```

#### 2. Missing Distribution & Statistical Visualizations

**Gap:** No visibility into data spread, outliers, or batch uniformity

**Missing Charts:**
- **Box plots** (show min/max/Q1/Q3/median)
- **Violin plots** (distribution shape)
- **Histograms** (frequency distribution)
- **Cumulative distribution** (percentile curves)

**Example: Harvest Weight Distribution**
- Current: Can't visualize weight distribution
- Industry practice: Shows bell curve of harvest weights
- Indicates uniformity (tight bell = good, wide = problem)
- Impacts grading/sorting decisions

**Recommendation:**
Add box plot to Water Quality page:
```tsx
// Box Plot of Daily Measurements (last 30 days)
<WaterQualityBoxPlot 
  parameters={['temperature', 'do', 'ph', 'ammonia']}
  days={30}
/>

// Shows for each parameter:
// - Min/Max whiskers
// - IQR box
// - Median line
// - Outlier points
// - Safe range bands
```

#### 3. Missing Correlation & Multi-Dimensional Analysis

**Gap:** Cannot identify relationships between variables

**Current State:**
- Feed rate chart shows absolute feed (kg/day)
- Mortality chart shows absolute mortality (%)
- But no visualization of correlation: "Did feeding changes affect mortality?"

**Professional Farms Analyze:**
- Temperature vs. mortality (correlation matrix)
- DO vs. feeding response (scatter plot)
- Feed type vs. growth rate (multi-series comparison)
- Ammonia trends vs. mortality spike (aligned timelines)

**Recommendation:**
Add Water Quality Correlation Matrix page:
```tsx
<CorrelationMatrix 
  metrics={[
    'temperature',
    'dissolved_oxygen',
    'ammonia',
    'mortality_rate',
    'growth_rate',
    'feeding_rate'
  ]}
  period="last_30_days"
/>

// Shows heatmap:
// ┌─────────────────────┐
// │     Temp  DO  NH₃   │
// │Temp  1.0  0.2 -0.4  │
// │DO    0.2  1.0 -0.8  │  Green = positive correlation
// │NH₃  -0.4 -0.8  1.0  │  Red = negative correlation
// └─────────────────────┘
```

#### 4. Missing Heatmap Visualizations

**Gap:** Cannot see patterns across multiple systems or time periods

**Professional Use Case:**
- Water Quality Heatmap: systems (y-axis) × time (x-axis) × parameter (color)
- Shows "which systems have consistent ammonia problems?"
- Shows "when does temperature spike occur?"

**Recommendation:**
Add Water Quality Heatmap:
```tsx
<WaterQualityHeatmap 
  parameter="ammonia"
  timeRange="last_60_days"
  systems="all"
/>

// Output:
// Time →  Week1  Week2  Week3  Week4  Week5  Week6  Week7  Week8
// Tank-1  🟢    🟢    🟡    🟡    🔴    🔴    🟡    🟢
// Tank-2  🟢    🟢    🟢    🟢    🟢    🟡    🟢    🟢
// Tank-3  🔴    🔴    🔴    🟡    🟡    🟡    🔴    🔴
// Tank-4  🟢    🟡    🟡    🔴    🔴    🟡    🟡    🟢
```

#### 5. Missing Control Chart (Statistical Process Control)

**Gap:** Cannot distinguish normal variation from out-of-control signals

**Professional Practice:**
Use Shewhart control charts with:
- Center line (average)
- Upper/lower control limits (±3σ)
- Rules for detecting out-of-control (e.g., 8+ points above center)

**Recommendation:**
Add SPC chart to Production page:
```tsx
<SPC_Chart 
  metric="abw"
  system="tank-5"
  period="all"
/>

// Shows:
// - Center line (average ABW)
// - ±1σ, ±2σ, ±3σ bands
// - Historical points colored by deviation
// - Red point = "system out of control, investigate"
```

#### 6. Missing Gantt/Timeline Visualizations

**Gap:** Cannot see production cycle timing and batch sequencing

**Professional Use Case:**
Farms manage multiple batches with overlapping lifecycles:
- Batch A: Stocked Feb 1, harvesting May 1
- Batch B: Stocked Mar 15, harvesting Jun 15
- Batch C: Stocked May 1, harvesting Aug 1

**Current State:** Cannot visualize this timeline

**Recommendation:**
Add Production Cycle Timeline to Dashboard:
```tsx
<ProductionTimeline>
  <Batch 
    id="batch-a"
    name="Batch A - Tank 1"
    stocked="2026-02-01"
    projected_harvest="2026-05-01"
    status="active"
    abw={450}
    mortality={2.3}
  />
  <Batch 
    id="batch-b"
    name="Batch B - Tank 2-3"
    stocked="2026-03-15"
    projected_harvest="2026-06-15"
    status="planning"
  />
</ProductionTimeline>

// Renders as:
// Batch A  ████████████████████████░░  (70% complete, 5d remaining)
// Batch B  ████░░░░░░░░░░░░░░░░░░░░░░░  (20% complete, 20d remaining)
// Batch C  (planned)
```

### VISUALIZATION ACCESSIBILITY ISSUES

#### Color-Only Encoding
**Issue:** Charts use color to distinguish series but colorblind users can't distinguish

**Current:** Blue line, green line, orange line (CVD-unfriendly)

**Fix:** Add symbols/patterns
```
Line 1: Blue solid line with circles
Line 2: Green dashed line with squares  
Line 3: Orange dotted line with triangles
```

#### Data Table Export
**Issue:** Can't access underlying data for charts

**Fix:** Add "Export Data" button under each chart
```
Button: "📊 Export Data to CSV"
→ Downloads chart's underlying data for analysis in Excel
```

#### High-Contrast Mode
**Issue:** Some text/background combos hard to read

**Fix:** Test all charts with:
- Windows High Contrast mode enabled
- Simulated colorblindness (Protanopia, Deuteranopia, Tritanopia)

---

## 3. AQUACULTURE METRICS & DOMAIN COVERAGE

### Currently Tracked Metrics

**Tier 1 - Core Metrics (Well Implemented):**

1. **eFCR** (Economic Feed Conversion Ratio)
   - Current: Calculated correctly
   - Formula: Total Feed / (Biomass Increase + Transfers Out - Transfers In + Harvested - Stocked)
   - Status: ✅ Properly weighted, accounts for transfers

2. **Mortality Rate** (%/day)
   - Current: Daily percentage
   - Status: ✅ Calculated
   - Gap: ⚠️ Only raw count, not weighted by fish size

3. **ABW** (Average Body Weight, grams)
   - Current: Derived from sampling (total_weight / count)
   - Status: ✅ Tracked
   - Gap: ⚠️ No validation for outliers

4. **Feeding Rate** (% Body Weight/day)
   - Current: Feed amount / Biomass × 100
   - Status: ✅ Tracked

5. **Biomass Density** (kg/m³)
   - Current: Total biomass / system volume
   - Status: ✅ Tracked

**Tier 2 - Secondary Metrics (Partially Implemented):**

| Metric | Status | Issues |
|--------|--------|--------|
| Survival Rate | ✅ Tracked | No visualization as KPI |
| SGR (Specific Growth Rate) | ✅ Threshold exists | No calculation visible |
| WQI (Water Quality Index) | ✅ Displayed | Calculation hardcoded, unexplained |
| Daily Rating | ✅ Tracked | Threshold logic opaque (70=Optimal?) |

### CRITICAL GAPS - MISSING INDUSTRY-STANDARD METRICS

#### A. Growth & Harvest Metrics

**Missing:**
- **SGR (Specific Growth Rate)**
  - Formula: ((ln(final_weight) - ln(initial_weight)) / days) × 100
  - Why critical: Shows growth rate independent of initial size
  - Current: Referenced in thresholds but not calculated/displayed
  - Recommendation: Add SGR KPI card, set threshold alerts

- **Days to Target Harvest Weight**
  - Formula: (target_weight - current_abw) / (sgr_daily_growth_g) 
  - Why critical: Production planning, cash flow forecasting
  - Current: Missing
  - Recommendation: Add projection to each system card

- **Harvest Weight Distribution/Uniformity**
  - Formula: Coefficient of Variation (StdDev / Mean)
  - Why critical: Determines grading costs, market value
  - Current: Missing (only ABW average tracked)
  - Recommendation: Add box plot showing weight distribution

- **HFBW Loss** (Harvestable Fish Body Weight)
  - Formula: (Projected harvest biomass) - (Actual harvest biomass)
  - Why critical: Unexpected shortfalls indicate disease/feed issues
  - Current: Missing

---

#### B. Feed & Economics Metrics

**Missing:**
- **Feed Conversion Efficiency (FCE)**
  - Formula: Biomass Gain / Total Feed
  - Different from eFCR (doesn't account for transfers)
  - Current: Missing

- **Feed Cost per kg Gain**
  - Formula: (Feed Cost) / (Biomass Gain)
  - Why critical: Economics dashboard, profitability analysis
  - Current: No cost tracking in system
  - Recommendation: Add feed_type.cost_per_kg field, calculate in reports

- **PER (Protein Efficiency Ratio)**
  - Formula: Weight Gain / Protein Fed
  - Why critical: Feed quality assessment, nutritionist decisions
  - Current: Missing
  - Requires: Feed protein % data (proximate composition)

- **Feed Waste Index**
  - Formula: (Feed Distributed - Feed Consumed) / Feed Distributed
  - Why critical: Feeder/feeding behavior assessment
  - Current: No way to track unconsumed feed
  - Recommendation: Add "feed uneaten/wasted" field to feeding form

---

#### C. Water Quality & System Health Metrics

**Missing:**
- **Ammonia Removal Capacity**
  - Formula: (Ammonia Input from Feed) / (Ammonia Output in Water Change)
  - Why critical: Biofilter health, stocking capacity
  - Current: Missing
  - Requires: Biofilter flow rate, water exchange rate

- **Oxygen Depletion Rate** (mg/L/hour)
  - Why critical: Early warning of system stress (filter clogging, stocking overload)
  - Current: No trending of DO over time-of-day
  - Recommendation: Add chart showing DO curve (typical 24h pattern)

- **Water Turnover Efficiency**
  - Formula: New water flow / System volume
  - Why critical: Determines water quality stability
  - Current: Missing (requires sensor data)

- **System Health Score Components**
  - Current: "Health score" displayed on dashboard
  - Gap: Not clear what goes into the calculation
  - Recommendation: Show calculation breakdown:
    ```
    Health Score = 0.4×(100-Mortality) + 0.3×WQI + 0.2×SGR/Target + 0.1×Equipment Status
    ```

---

#### D. Bioload & Capacity Metrics

**Missing:**
- **Current Bioload** (kg feed/day / m³)
  - Why critical: Determines water quality stability, stocking limits
  - Current: Missing

- **Bioload Utilization** (% of maximum)
  - Formula: Current Bioload / Maximum Bioload Capacity
  - Why critical: Planning next batch stocking
  - Current: Missing

- **System Reserve Capacity**
  - Formula: (Max Stocking Density - Current Density) / Max × 100
  - Current: Missing

---

#### E. Production Cycle Metrics

**Missing:**
- **Days in Production** (cycle age)
  - Current: No way to see "how many days since stocking?"
  - Recommendation: Add "Day 45 of 150" badge to system cards

- **Cycle Completion %**
  - Formula: Days in Production / Projected Cycle Length
  - Current: Missing (would need production_cycle.projected_duration)

- **Production Index** (metric combining size, survival, duration)
  - Industry uses: (ABW × Survival % × Feed Intake) / Days
  - Current: Missing
  - Useful for: Benchmarking farm vs. industry

---

#### F. Economic/Operational Metrics

**Missing:**
- **Cost per kg Produced** (all inputs)
  - Formula: (Feed Cost + Labor + Utilities + Meds) / Harvest Biomass
  - Current: Missing (no cost tracking exists)
  - Recommendation: Build cost tracking module

- **Labor Hours per Cycle**
  - Why critical: Operational efficiency benchmarking
  - Current: Missing (no labor tracking)

- **Production Margin** (if sales price tracked)
  - Formula: (Revenue) - (Total Costs)
  - Current: No sales price in system

---

#### G. Compliance & Regulatory Metrics

**Missing:**
- **Antibiotic Usage** (total and per kg produced)
  - Why critical: Regulatory requirement, antimicrobial resistance tracking
  - Current: No treatment table exists

- **Mortality Documentation** (by cause)
  - Why critical: Required by many regulatory bodies
  - Current: Cause field is free-text (unstructured)
  - Recommendation: Create enum of standard causes

- **Water Quality Compliance Status**
  - Formula: Days in compliance / Total days
  - Current: No tracking of compliance status

---

### CRITICAL DATA QUALITY ISSUES

#### 1. Unstructured Mortality Cause Data

**Current State:**
```typescript
// In database
fish_mortality {
  count: 2,
  cause: "fish_jumpers" | "disease" | "predator" | null
}
```

**Problems:**
- `cause` is free-text string, not enum
- No standard vocabulary (could be "jump", "jumpers", "jumped fish")
- Cannot generate reports on cause distribution
- Mixing different granularities ("disease" vs. specific disease name)

**Recommendation:**
```typescript
// Create structured enum
enum MortalityAdjustedCause {
  // Husbandry
  WATER_QUALITY = "water_quality",
  FEEDING_ERROR = "feeding_error", 
  HANDLING_INJURY = "handling_injury",
  EQUIPMENT_FAILURE = "equipment_failure",
  
  // Biotic
  DISEASE_BACTERIAL = "disease_bacterial",
  DISEASE_VIRAL = "disease_viral",
  DISEASE_PARASITIC = "disease_parasitic",
  DISEASE_FUNGAL = "disease_fungal",
  
  // Environmental
  PREDATION = "predation",
  ESCAPE = "escape",
  
  // Unknown
  UNKNOWN = "unknown"
}

// Form UI would use dropdown:
<Select 
  options={MortalityAdjustedCause} 
  required
/>

// Report could show:
// Mortality by Cause (Last 60 days)
// Water Quality Issues: 15% (8 events)
// Disease (Bacterial): 25% (14 events)
// Feeding Errors: 10% (6 events)
// Equipment Failure: 8% (4 events)
// Unknown: 42% (23 events) ← highlight for investigation
```

#### 2. Missing ABW Validation

**Current State:**
```typescript
// In sampling
ABW = total_weight / count
```

**Problems:**
- No outlier detection
- Bad data (misplaced decimal: 4500g instead of 450g) propagates to all metrics
- No validation of "reasonable" growth rate
- Missing sampling notes explaining anomalies

**Recommendation:**
Add validation rules:
```typescript
function validateABW(
  current_abw: number,
  previous_abw: number,
  days_since_last_sample: number
): ValidationResult {
  
  // Rule 1: Reasonable growth rate
  const max_daily_growth = 1.5; // g/day
  const expected_growth = previous_abw * (1 + daily_sgr/100) ^ days_since_last_sample;
  const growth_variance = (current_abw - expected_growth) / expected_growth;
  
  if (Math.abs(growth_variance) > 0.2) {
    return {
      warning: `Expected ${expected_growth}g, got ${current_abw}g (+${growth_variance}%). Verify sampling?`,
      severity: "high"
    }
  }
  
  // Rule 2: Realistic absolute values
  if (current_abw < 0.1 || current_abw > 5000) {
    return {
      error: `ABW must be 0.1-5000g. Got ${current_abw}g. Check decimal point.`,
      severity: "critical"
    }
  }
  
  return { valid: true }
}
```

#### 3. Missing Water Quality QA/QC

**Current State:**
Any value entered is accepted:
- User can enter DO = 25 mg/L (impossible, max is 14)
- Temperature can jump 10°C in 1 hour (sensor error?)
- pH can be 2.0 or 14.0 (extreme outliers)

**Recommendation:**
Add bounds checking:
```typescript
const WQ_PARAMETER_BOUNDS = {
  temperature: { min: 0, max: 35, unit: "°C" },
  dissolved_oxygen: { min: 0, max: 14, unit: "mg/L" },
  pH: { min: 5.5, max: 8.5, unit: "" },
  ammonia: { min: 0, max: 50, unit: "mg/L" },
  salinity: { min: 0, max: 40, unit: "ppt" },
};

// Validation:
function validateWQParameter(param: string, value: number) {
  const bounds = WQ_PARAMETER_BOUNDS[param];
  if (value < bounds.min || value > bounds.max) {
    return {
      error: `${param} out of reasonable range: ${bounds.min}-${bounds.max} ${bounds.unit}`,
      suggestion: "Check sensor calibration or data entry error"
    };
  }
  
  // Also check rate of change
  const previous = getPreviousMeasurement(param);
  const rate_of_change = Math.abs((value - previous.value) / previousTime);
  if (rate_of_change > MAX_RATE_OF_CHANGE) {
    return {
      warning: `${param} changed ${rate_of_change}x expected rate. Verify data.`,
      severity: "medium"
    };
  }
}
```

---

## 4. FORMS & DATA ENTRY UX ANALYSIS

### Current Forms (9 Total)

**Location:** `/src/components/data-entry/`

| Form | Purpose | Fields | Issues |
|------|---------|--------|--------|
| **Feeding Record** | Daily feeding events | Date, Time, System, Feed Type, Amount (kg) | ✅ Simple, effective |
| **Mortality Event** | Mortality recording | Date, Time, System, Count, Cause, Notes | ❌ Cause is free-text |
| **Sampling** | Growth sampling | Date, System, Count, Total Weight | ⚠️ Missing: health assessment |
| **Water Quality** | WQ parameters | Date, Time, System, 8+ parameters | ❌ High friction (manual entry) |
| **Harvest** | Harvest events | Date, Time, System, Target Weight, Count | ⚠️ Missing: weight distribution |
| **Transfer** | Inter-system moves | Date, System From/To, Count, Weight | ⚠️ Missing: reason code |
| **Stocking** | Initial stocking | Date, System, Count, Unit Weight, Supplier | ✅ Good |
| **Incoming Feed** | Feed deliveries | Date, Feed Type, Supplier, Amount, Cost/kg | ⚠️ Missing: lot number |
| **System Setup** | System configuration | Name, Type, Location, Volume, Depth | ⚠️ Missing: shape/capacity data |

### Form Strengths

✅ **Smart Defaults:**
- Water Quality: Auto-fills time to nearest 15-min
- Sampling: Auto-calculates harvest forecast (14-day projection)
- Data Entry: Shows recent entries in sidebar

✅ **Validation:**
- Zod schema validation with error display
- Required field indicators
- Real-time feedback

✅ **Offline Support:**
- OfflineSaveBadge shows sync status
- IndexedDB persistence (Dexie)

### CRITICAL FORM GAPS

#### 1. Mortality Form Lacks Structure

**Current:**
```typescript
// Minimal structure
fish_mortality {
  system_id,
  count,
  cause: string | null,  // Free-text!
  notes
}
```

**Problems:**
- Can't analyze mortality patterns (free-text causes)
- No link to treatments or interventions
- No severity/health assessment
- Missing "time of day" (morning mortality vs. overnight)

**Recommendation - Enhanced Mortality Form:**

```tsx
<MortalityForm>
  {/* Basic Info */}
  <DateInput required label="Date of Event" />
  <TimeInput required label="Time Observed" />
  <SystemMultiSelect 
    label="Affected Systems"
    help="Select all systems with mortality"
  />
  
  {/* Quantification */}
  <NumberInput 
    required
    label="Number of Dead Fish"
    min={1}
    help="Exact count if possible"
  />
  <Select required label="Size Class" options={[
    "fry", "fingerling", "juvenile", "market_size"
  ]} />
  
  {/* Classification */}
  <Select required label="Cause of Death">
    <OptionGroup label="Husbandry">
      <Option value="water_quality">Water Quality Issue</Option>
      <Option value="feeding_error">Feeding Error</Option>
      <Option value="handling">Handling Injury</Option>
      <Option value="equipment">Equipment Failure</Option>
    </OptionGroup>
    <OptionGroup label="Disease">
      <Option value="disease_viral">Viral Disease</Option>
      <Option value="disease_bacterial">Bacterial Disease</Option>
      <Option value="disease_parasitic">Parasitic Infection</Option>
    </OptionGroup>
    <OptionGroup label="Other">
      <Option value="predation">Predation</Option>
      <Option value="escape">Escape</Option>
      <Option value="unknown">Unknown</Option>
    </OptionGroup>
  </Select>
  
  {/* If disease selected, show: */}
  {cause === 'disease_*' && (
    <>
      <TextInput 
        label="Disease Name"
        placeholder="e.g., IPN, Furunculosis"
      />
      <Select label="Severity">
        <Option value="mild">Mild (1-3%)</Option>
        <Option value="moderate">Moderate (3-10%)</Option>
        <Option value="severe">Severe (>10%)</Option>
      </Select>
      <CheckboxGroup label="Visible Symptoms">
        <Checkbox label="Lesions/Ulcers" />
        <Checkbox label="Discoloration" />
        <Checkbox label="Behavioral Changes" />
        <Checkbox label="Deformities" />
      </CheckboxGroup>
    </>
  )}
  
  {/* Assessment */}
  <CheckboxGroup label="Health Assessment">
    <Checkbox label="Abnormal Behavior Noted" />
    <Checkbox label="Feed Intake Reduced" />
    <Checkbox label="Condition Factor Low" />
    <Checkbox label="Recent Handling/Transport" />
  </CheckboxGroup>
  
  {/* Response */}
  <CheckboxGroup label="Actions Taken">
    <Checkbox label="Water Quality Tested" />
    <Checkbox label="Treatment Started" />
    <Checkbox label="System Isolated" />
    <Checkbox label="Samples Collected" />
  </CheckboxGroup>
  
  {/* Notes */}
  <TextArea label="Observations" />
  
  {/* Evidence */}
  <FileUpload label="Photos (optional)" />
</MortalityForm>
```

#### 2. Water Quality Form Too High Friction

**Current State:**
- 8+ parameters × 3 steps (input, unit conversion in head, submit)
- No sensor API integration
- Manual entry for daily use = high error rate

**Recommendation - Sensor-First Design:**

```tsx
<WaterQualityForm>
  {/* Auto-Load Option */}
  <Card highlight>
    <Text>Connect to Water Quality Sensor</Text>
    <Select 
      label="Select Sensor"
      options={connectedSensors}
      onChange={loadSensorData}
    />
    <Button onClick={autoFillFromSensor}>
      Load Recent Reading ({lastReading.timestamp})
    </Button>
  </Card>
  
  {/* OR Manual Entry */}
  <Tabs defaultValue="form">
    <Tab value="form" label="Manual Entry">
      <ParameterInput 
        name="temperature"
        label="Temperature"
        unit="°C"
        validation={{ min: 0, max: 35 }}
      />
      <ParameterInput 
        name="do"
        label="Dissolved Oxygen"
        unit="mg/L"
        validation={{ min: 0, max: 14 }}
        hint="Use optical sensor for accuracy"
      />
      {/* ... other parameters ... */}
      
      {/* Smart Validation */}
      <Alert level="warning">
        DO seems low (3.5 mg/L) for temperature (28°C).
        Consider increasing aeration.
      </Alert>
    </Tab>
    
    <Tab value="sensor" label="Sensor Data">
      {/* Shows sensor values, option to override */}
      <SensorDataDisplay />
    </Tab>
  </Tabs>
  
  {/* QA/QC Section */}
  <Card title="Quality Check">
    <Checkbox label="All values within normal range" />
    <Checkbox label="Sensors calibrated within last 30 days" />
    <Checkbox label="Reading conditions appropriate" />
  </Card>
</WaterQualityForm>
```

#### 3. Sampling Form Missing Health Assessment

**Current:**
```typescript
// Only weight + count
fish_sampling {
  system_id,
  count,
  total_weight,
  date
}
```

**Missing:**
- Visual health assessment (1-5 score)
- Deformities, parasites, lesions
- Feed conversion observations
- Length/girth measurements
- Maturity assessment

**Recommendation:**

```tsx
<SamplingForm>
  {/* Basic Biometry */}
  <NumberInput label="Fish Sampled (count)" required />
  <NumberInput label="Total Weight (g)" required />
  <NumberInput label="Average Length (cm)" />
  <NumberInput label="Average Girth (cm)" />
  
  {/* Health Assessment */}
  <Card title="Health Scoring">
    <RadioGroup 
      label="Overall Condition (1-5)"
      options={[
        { value: 1, label: "1 - Poor (visible issues)" },
        { value: 2, label: "2 - Fair (some concerns)" },
        { value: 3, label: "3 - Good (expected)" },
        { value: 4, label: "4 - Excellent (above average)" },
        { value: 5, label: "5 - Outstanding (best case)" }
      ]}
    />
    
    <CheckboxGroup label="Observations">
      <Checkbox label="Lesions or Ulcers" />
      <Checkbox label="Parasites Visible" />
      <Checkbox label="Discoloration/Fin Damage" />
      <Checkbox label="Abnormal Behavior" />
      <Checkbox label="Poor Appetite" />
    </CheckboxGroup>
  </Card>
  
  {/* Feed Response */}
  <Card title="Feed Conversion">
    <RadioGroup label="Feed Response">
      <Option label="Excellent (aggressive)" />
      <Option label="Good (normal)" />
      <Option label="Fair (sluggish)" />
      <Option label="Poor (no response)" />
    </RadioGroup>
  </Card>
  
  {/* Notes & Evidence */}
  <TextArea label="Observations" />
  <FileUpload label="Photos" multiple />
</SamplingForm>
```

#### 4. Stocking Form Missing Lot/Batch Tracking

**Current:**
```typescript
fish_stocking {
  system_id,
  count,
  unit_weight,
  supplier_id,
  batch_id // But no lot # tracking
}
```

**Missing:**
- Fingerling/fry lot number (required for traceability)
- Health certification status
- Genetic line (if tracking)
- Source hatchery details
- Insurance/warranty info

**Recommendation:**

```tsx
<StockingForm>
  {/* System & Quantity */}
  <SystemSelect required />
  <NumberInput label="Number of Fish" required />
  <NumberInput label="Average Initial Weight (g)" required />
  
  {/* Supplier & Source */}
  <SupplierSelect 
    required
    label="Fingerling Supplier"
    onSelect={(supplier) => loadSupplierInfo(supplier)}
  />
  
  <Card title="Fingerling Source Info">
    <TextInput 
      required
      label="Lot Number" 
      help="Supplier's batch/lot identifier"
    />
    <DateInput 
      required
      label="Hatch Date"
      help="When were these fish hatched?"
    />
    <Select label="Genetic Line / Strain">
      <Option value="">Not Specified</Option>
      <Option value="aquagen">AquaGen</Option>
      <Option value="farming_select">Farming Select</Option>
      {/* ...more options... */}
    </Select>
    
    <CheckboxGroup label="Certifications">
      <Checkbox label="Health Certificate (VHS/IHN tested)" />
      <Checkbox label="Genetics Certification" />
      <Checkbox label="Organic Certification" />
    </CheckboxGroup>
  </Card>
  
  {/* Cost Tracking */}
  <Card title="Cost">
    <NumberInput 
      label="Cost per Fish"
      unit="$"
      help="Enables cost-per-kg-gain calculation"
    />
    <NumberInput 
      label="Total Cost"
      value={count * costPerFish}
      disabled
    />
  </Card>
  
  {/* Quarantine / Acclimation */}
  <Card title="Acclimation">
    <CheckboxGroup>
      <Checkbox label="Quarantine system used" />
      <Checkbox label="Acclimation period completed" />
      <Checkbox label="Initial health assessment OK" />
    </CheckboxGroup>
  </Card>
</StockingForm>
```

#### 5. Missing Form: Treatment/Medication Log

**Critical Gap:** No way to record treatments, antibiotics, or interventions

**Recommendation - Add Treatment Form:**

```tsx
<TreatmentForm>
  {/* Event Info */}
  <DateInput required label="Treatment Date" />
  <TimeInput label="Treatment Time" />
  <SystemMultiSelect required label="Treated Systems" />
  
  {/* Diagnosis */}
  <Select required label="Reason for Treatment">
    <Option value="disease">Confirmed Disease</Option>
    <Option value="prevention">Preventive</Option>
    <Option value="water_quality">Water Quality Issue</Option>
    <Option value="parasite">Suspected Parasite</Option>
    <Option value="vaccination">Vaccination</Option>
    <Option value="other">Other</Option>
  </Select>
  
  {/* If disease */}
  {reason === 'disease' && (
    <TextInput label="Disease/Diagnosis" required />
  )}
  
  {/* Treatment Details */}
  <Card title="Treatment">
    <Select required label="Treatment Type">
      <Option value="antibiotic">Antibiotic</Option>
      <Option value="antifungal">Antifungal</Option>
      <Option value="antiparasitic">Antiparasitic</Option>
      <Option value="probiotic">Probiotic</Option>
      <Option value="other">Other</Option>
    </Select>
    
    <TextInput required label="Product Name" />
    <TextInput required label="Active Ingredient(s)" />
    
    {/* Dosing */}
    <NumberInput required label="Dose Amount" />
    <Select required label="Unit">
      <Option value="g">Grams</Option>
      <Option value="ml">Milliliters</Option>
      <Option value="mg_per_kg">mg per kg fish</Option>
      <Option value="ppm">ppm</Option>
    </Select>
    
    <DateInput required label="Start Date" />
    <NumberInput required label="Duration (days)" />
    <DateInput label="Projected End Date" value={...auto} disabled />
    
    {/* Regulatory Info */}
    <TextInput label="Lot/Batch Number" />
    <DateInput label="Expiration Date" />
    <TextInput label="Withdrawal Period (days)" help="Regulatory requirement" />
  </Card>
  
  {/* Withdrawal & Harvest */}
  <Card title="Food Safety">
    <DateInput 
      label="Earliest Safe Harvest Date"
      value={treatmentEnd + withdrawalPeriod}
      disabled
    />
    <Checkbox required label="Withdrawal period understood and recorded" />
  </Card>
  
  {/* Response */}
  <Card title="Treatment Response">
    <RadioGroup label="Effectiveness">
      <Option label="Excellent (symptoms resolved)" />
      <Option label="Good (improvement noted)" />
      <Option label="Fair (minimal change)" />
      <Option label="Poor (worsened)" />
    </RadioGroup>
    <NumberInput label="Mortality During Treatment (%)" />
    <NumberInput label="Estimated Recovery (%)" />
  </Card>
  
  {/* Notes */}
  <TextArea label="Observations & Adjustments" />
</TreatmentForm>
```

---

## 5. DASHBOARD & SUMMARY DISPLAYS ANALYSIS

### Current Dashboard Sections

**File:** `/src/features/dashboard/components/`

1. **KPI Overview** - 4-6 metric cards (eFCR, Mortality, ABW, Feeding, Biomass, Density)
2. **System Health** - Health score gauge per system
3. **Water Quality Index** - Segmented gauge
4. **Systems Table** - Full-width table of all systems
5. **Recent Activity** - Log of recent entries
6. **Recommended Actions** - List of suggested actions (5 max)

### CRITICAL DASHBOARD ISSUES

#### 1. KPI Cards Are Static & Incomplete

**Current KPIs:**
- eFCR (Periodic)
- Mortality Rate
- ABW
- Feeding Rate
- Biomass Density

**Missing Critical KPIs:**
- **Survival Rate %** ← Most important for farm economics
- **Days to Harvest** ← Critical for cash flow planning
- **System Status** ← Count of systems by health status
- **Water Quality Status** ← Should be KPI, not separate card
- **Feed Balance** ← kg on hand vs. projected consumption
- **Unplanned Expenses** ← Any alert/treatment costs this period

**Issue:** Users see only 4 metrics, miss critical operational status

**Recommendation - Dynamic KPI Card System:**

```tsx
<KPIGrid>
  {/* Configurable KPIs per role */}
  <KPICard
    title="Survival Rate"
    value={98.2}
    unit="%"
    trend={+1.2}
    threshold={{ warning: 95, critical: 90 }}
    status="optimal"
    drilldown="/production?metric=survival"
  />
  
  <KPICard
    title="Days to Harvest"
    value={23}
    unit="days"
    context="(Tank-5)"
    threshold={{ over: 45 }}  // Alert if over projected
    status="on-track"
  />
  
  <KPICard
    title="Feed Balance"
    value={450}
    unit="kg"
    comparison="vs. 120kg/week consumption"
    alert={feedBalance < 2 * weeklyConsumption ? "reorder-soon" : "ok"}
  />
  
  {/* System Status Summary */}
  <KPICard
    title="System Status"
    value={[
      { status: "optimal", count: 3, label: "3 Optimal" },
      { status: "caution", count: 2, label: "2 Caution" },
      { status: "critical", count: 1, label: "1 Critical" }
    ]}
    drilldown="/dashboard/systems?status=critical"
  />
  
  {/* Water Quality Summary */}
  <KPICard
    title="Water Quality"
    status={lastWQRating.status}  // optimal/caution/critical
    metrics={[
      { param: "DO", value: 6.2, status: "caution" },
      { param: "Ammonia", value: 0.8, status: "optimal" },
      { param: "pH", value: 7.1, status: "optimal" }
    ]}
    worst={worstParameter}
  />
</KPIGrid>

{/* Settings: Customize visible KPIs per role */}
<DashboardSettings>
  <KPIToggle name="survival_rate" enabled={true} />
  <KPIToggle name="days_to_harvest" enabled={true} />
  <KPIToggle name="feed_balance" enabled={false} />
  {/* ...etc... */}
</DashboardSettings>
```

#### 2. System Health Card Unexplained

**Current:**
Shows a number (0-100) in a gauge but:
- What does "health score" mean?
- Which parameters go into it?
- Why is 75 "healthy" but 70 is "caution"?
- How can I improve it?

**Recommendation - Transparent Health Score:**

```tsx
<SystemHealthCard system="tank-5">
  {/* Main Score with Breakdown */}
  <GaugeChart value={82} max={100} />
  
  <Card title="Health Score Calculation">
    <div>Factors weighted as:</div>
    <ProgressBar 
      label="Survival Rate (40%)"
      value={96} 
      color={getColor(96, 90, 70)}
    />
    <ProgressBar 
      label="Growth Rate (30%)"
      value={82}
      color={getColor(82, 85, 50)}
    />
    <ProgressBar 
      label="Water Quality (20%)"
      value={75}
      color={getColor(75, 80, 60)}
    />
    <ProgressBar 
      label="Feed Conversion (10%)"
      value={88}
      color={getColor(88, 85, 70)}
    />
    
    <Calculation>
      = (96×0.4) + (82×0.3) + (75×0.2) + (88×0.1) = 87.2 ≈ 87
    </Calculation>
  </Card>
  
  {/* Actionable Insights */}
  <Alert level="info">
    <strong>Water Quality is limiting factor (75/100)</strong><br/>
    Ammonia trending up. Consider increasing water exchange.
  </Alert>
</SystemHealthCard>
```

#### 3. Systems Table Not Optimized for Quick Scanning

**Current State:**
- Table shows system name, status, metrics
- No color-coding for health status
- Hard to spot critical systems at a glance
- No sorting/filtering for "most critical first"

**Recommendation - Improved Systems Table:**

```tsx
<SystemsTable>
  <Column 
    key="name"
    label="System"
    sortable
    render={(system) => (
      <div className="flex items-center gap-2">
        <HealthBadge status={system.health_status} />
        <div>
          <div className="font-bold">{system.name}</div>
          <div className="text-sm text-gray-500">
            {system.stocking_date} · Day {system.days_in_cycle}
          </div>
        </div>
      </div>
    )}
  />
  
  <Column key="status" label="Status" align="center">
    {/* Color-coded status badge */}
    <StatusBadge status={system.status} />
  </Column>
  
  <Column key="health_score" label="Health" sortable align="right">
    <MiniGauge value={system.health_score} size="sm" />
  </Column>
  
  <Column key="abw" label="ABW" sortable align="right">
    <MetricWithTrend 
      value={system.abw}
      unit="g"
      trend={system.abw_trend}
    />
  </Column>
  
  <Column key="survival" label="Survival" sortable align="right">
    <PercentageBar 
      value={system.survival_rate}
      critical={90}
      warning={95}
    />
  </Column>
  
  <Column key="wq_status" label="Water Quality" align="center">
    {/* Colored indicator of WQ status */}
    <WQStatusBadge 
      status={system.water_quality_status}
      worst_param={system.worst_wq_param}
    />
  </Column>
  
  <Column key="alerts" label="Alerts" align="center">
    {system.active_alerts.length > 0 ? (
      <AlertBadge count={system.active_alerts.length} />
    ) : (
      <span className="text-gray-300">—</span>
    )}
  </Column>
  
  <Column label="Actions">
    <DropdownMenu>
      <Item onClick={editSystem}>Edit System</Item>
      <Item onClick={viewDetails}>View Details</Item>
      <Item onClick={viewHistory}>View History</Item>
      <Item onClick={createEntry}>Add Entry</Item>
    </DropdownMenu>
  </Column>
</SystemsTable>
```

#### 4. Recommended Actions Not Actionable

**Current:**
- Shows list of recommendations
- No context on urgency, impact, time to complete
- No who-can-do-it indicator (role-based)

**Recommendation:**

```tsx
<RecommendedActions>
  <Card title="Recommended Actions">
    <Tabs defaultValue="urgent">
      <Tab value="urgent" label="Urgent (2)">
        <ActionItem 
          priority="critical"
          title="Increase Water Exchange Rate"
          reason="Ammonia in Tank-3 at 2.1 mg/L (threshold: 1.5)"
          impact="Prevent mortality spike"
          effort="15 minutes"
          roles={["admin", "farm_manager"]}
          linked_metric="water_quality"
          linked_system="tank-3"
          action_button="Take Action"
        />
      </Tab>
      
      <Tab value="this_week" label="This Week (5)">
        <ActionItem 
          priority="high"
          title="Perform Sampling"
          reason="Tank-5 sampling overdue by 2 days"
          impact="Growth rate calculation"
          effort="30 minutes"
          roles={["admin", "farm_manager", "technician"]}
          action_button="Start Sampling"
        />
      </Tab>
    </Tabs>
  </Card>
</RecommendedActions>
```

---

## 6. MISSING OPERATIONAL WORKFLOWS

### Treatment & Disease Management (MISSING ENTIRELY)

**Current State:** No workflow for tracking disease, diagnosis, or treatment

**What's Needed:**
```
Observation of abnormal behavior
  → Manual investigation
  → Sampling/diagnosis (pathology lab)
  → Confirmation of disease
  → Treatment decision (antibiotic, environmental change)
  → Drug/treatment admin
  → Monitoring response
  → Documentation for audit trail
  → Withdrawal period compliance
```

**Recommendation:** Build comprehensive Treatment Module:
- Treatment form (see above)
- Disease library (searchable diagnosis database)
- Treatment protocol library (e.g., "Salmon lice treatment SOP")
- Withdrawal period calculator
- Regulatory compliance tracker

### Production Cycle Timeline (MISSING)

**Current State:**
- Can see systems individually
- Cannot see timeline of all batches
- No production cycle status workflow

**Recommendation - Add Production Cycle Management:**

```
Cycle States:
Planning → Prepared → Stocking → Growing → Harvest Ready → Harvesting → Fallowing → Active Again

Dashboard should show timeline:
  Batch A (Tank-1-2)  ████████████████████░░░░░░░░  [70% - Harvest in 5d]
  Batch B (Tank-3)    ████░░░░░░░░░░░░░░░░░░░░░░░░░  [25% - 20d remaining]
  Batch C (Tank-4-5)  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  [Plan - Stocking Mar-15]
```

### Biosecurity Workflow (MISSING)

**Current State:** No tracking of visitor access, equipment sanitation, health testing

**Needed:**
- Visitor log
- Equipment sanitization records
- Disease test results
- Quarantine system tracking

### Equipment Maintenance (MISSING)

**Current State:** No maintenance log or equipment status

**Needed:**
- Feeder runtime tracking
- Pump maintenance schedule
- Sensor calibration log
- Filter cleaning records

---

## SUMMARY OF CRITICAL IMPROVEMENTS NEEDED

### Tier 1 - Critical (Weeks 1-4)

**Highest Impact:**
1. ✅ Add Treatment/Disease Form and Table
2. ✅ Implement Mortality Cause Classification (enum)
3. ✅ Add "Days to Harvest" KPI Card
4. ✅ Add Survival Rate KPI Card
5. ✅ Create `/dashboard/system/:id` detail page
6. ✅ Add System Health Score Transparency

**Quick Wins:**
- Add breadcrumbs to all pages
- Fix KPI card design (clearer trend indicators)
- Add filters to Systems Table (status, health, batch)

### Tier 2 - High Value (Weeks 5-12)

1. ✅ Enhance Water Quality Form (sensor API, auto-validation)
2. ✅ Add Stocking Form Lot Tracking
3. ✅ Add Sampling Form Health Assessment
4. ✅ Add Mortality Form Severity & Symptoms
5. ✅ Create Water Quality Correlation Heatmap
6. ✅ Add Comparative Batch Analysis Charts
7. ✅ Add Cost Tracking (feed, treatments)

### Tier 3 - Competitive Differentiation (Weeks 13+)

1. ✅ Predictive models (harvest date forecasting)
2. ✅ Economic optimization (cost per kg gain)
3. ✅ Sensor integrations (auto-populate WQ)
4. ✅ Environmental data integration
5. ✅ Advanced analytics (SGR prediction, mortality forecasting)

---

## VISUAL DESIGN IMPROVEMENTS

### Color Palette Issues

**Current:**
```
Primary: #22c55e (green)
Destructive: #ef4444 (red)
Warning: #d18a14 (orange)
Muted: #f3f6f8 (light gray)
```

**Problems:**
- No semantic separation: "success" (green) vs. "primary action" (also green)
- Chart colors don't match UI palette
- No "at-target" color (should be blue/neutral)
- Missing: "needs attention" color

**Recommendation:**
```
Define clear semantics:

Positive/Success: #10b981 (green)
Caution/Warning: #f59e0b (amber)
Critical/Destructive: #ef4444 (red)
Neutral/Default: #6b7280 (gray)
Informational: #3b82f6 (blue)
Optimal/At-Target: #8b5cf6 (purple)

Chart Series:
- Line 1 (Current Batch): #10b981 (green) - solid
- Line 2 (Previous Batch): #6b7280 (gray) - dashed
- Line 3 (Benchmark): #f59e0b (amber) - dotted
- Line 4 (Target Band): #8b5cf6 (purple) - area fill
```

### Typography System

**Current:** Unclear hierarchy

**Recommendation:**
```
Define explicit scale:

h1 (32px, bold)    - Page title
h2 (24px, semibold) - Section headings
h3 (20px, semibold) - Card titles
body (16px)        - Main text
label (14px)       - Form labels, captions
sm (12px)          - Hints, secondary text

For accessibility:
- Min font size: 16px on mobile
- Min line-height: 1.5
- Min contrast ratio: 4.5:1
```

---

## NEXT STEPS

### Week 1-2: Assessment & Planning
1. Stakeholder interviews (farm managers, operators)
2. Competitor research (AKVA, Aquaseek, Skretting)
3. Industry standards review (FAO guidelines, regional regulations)
4. Data model review and extensions

### Week 3-4: Design & Prototyping
1. Dashboard redesign (wireframes)
2. New form designs (Mortality, Treatment)
3. Chart library expansion
4. Metrics calculation framework

### Week 5+: Implementation (Phased)
1. Phase 1: Treatment module, KPI enhancements, System detail page
2. Phase 2: Form UX improvements, advanced charts, cost tracking
3. Phase 3: Predictive models, sensor integrations, competitive features

---

**Complete analysis with specific code examples, file paths, and implementations ready in next document.**
