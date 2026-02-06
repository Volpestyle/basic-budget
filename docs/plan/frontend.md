# Frontend Development Plan — basic-budget

Owner: Frontend Agent
Last updated: 2026-02-05

---

## Design Direction

### Aesthetic: Techy Minimalist
A working-tool feel — think Bloomberg Terminal meets iOS clarity. Data-dense where it matters, breathing room everywhere else. The app should feel like a precision instrument, not a lifestyle brand.

### Color Palette

**Dark mode (primary):**
| Token | Value | Usage |
|---|---|---|
| `bg-primary` | `#09090B` | App background |
| `bg-surface` | `#111114` | Cards, panels |
| `bg-elevated` | `#18181C` | Modals, overlays |
| `border-default` | `#27272A` | Card borders, dividers |
| `border-subtle` | `#1C1C20` | Inner dividers |
| `text-primary` | `#FAFAFA` | Headings, amounts |
| `text-secondary` | `#A1A1AA` | Labels, descriptions |
| `text-muted` | `#52525B` | Hints, timestamps |
| `accent` | `#00E5A0` | Primary actions, income, on-track |
| `accent-dim` | `#00E5A020` | Accent backgrounds |
| `warning` | `#FBBF24` | Approaching limit |
| `danger` | `#EF4444` | Overspent, destructive |
| `info` | `#818CF8` | Insights, secondary data |

**Light mode:** Invert with same accent hues, adjust for WCAG AA contrast.

### Typography

| Role | Font | Weight | Size | Tracking |
|---|---|---|---|---|
| Display metric | SF Mono (iOS) / Fira Code (Android) | Bold | 32–40 | -0.02em |
| Metric / amount | SF Mono / Fira Code | Semibold | 20–28 | -0.01em |
| Heading | System (SF Pro) | Semibold | 17–22 | 0 |
| Body | System (SF Pro) | Regular | 15 | 0 |
| Caption / label | System (SF Pro) | Medium | 11–13 | 0.04em (uppercase) |
| Mono inline | SF Mono / Fira Code | Regular | 13–15 | 0 |

**Rules:**
- All money values render in monospace
- Category labels use system font, uppercase tracking for panel headers
- NO JetBrains Mono anywhere

### Spacing & Layout
- Base unit: 4px
- Scale: 4, 8, 12, 16, 20, 24, 32, 48
- Screen padding: 16px horizontal
- Card padding: 16px
- Card gap: 12px
- Card border-radius: 12px
- Bottom tab bar: 80px safe area (iPhone dynamic island / home indicator)

### Animation System

**Stack:**
- `react-native-reanimated` v3 — core animation engine
- `moti` — declarative animation components (framer-motion API for RN)
- `react-native-gesture-handler` — swipe, pan, pinch gestures
- Victory Native built-in transitions for charts

**Animation tokens:**
| Name | Duration | Easing |
|---|---|---|
| `instant` | 100ms | ease-out |
| `fast` | 200ms | ease-out |
| `normal` | 350ms | spring(damping: 15, stiffness: 120) |
| `slow` | 500ms | spring(damping: 20, stiffness: 80) |
| `chart-draw` | 800ms | ease-in-out |

**Guiding rules:**
- Every number change animates (countUp/countDown)
- List items stagger on mount (40ms offset per item)
- Cards enter with fade + translateY(12)
- Modals use spring-based slide-up
- Charts draw/animate on first appearance, cross-fade on data change
- Respect `AccessibilityInfo.isReduceMotionEnabled` — skip all non-essential animation

---

## Component Primitives (build before screens)

These are the reusable building blocks every screen depends on.

- [ ] **`MoneyText`** — Renders MoneyCents as formatted currency in monospace. Animates value changes (counting up/down). Props: `value: MoneyCents`, `size`, `color`, `showSign`.
- [ ] **`StatusDot`** — Tiny colored circle for pace status. Props: `status: PaceStatus`. Maps to accent/warning/danger.
- [ ] **`ProgressRing`** — Circular progress indicator for budget utilization. Animated fill on mount/change. Props: `spent`, `budget`, `size`, `color`.
- [ ] **`ProgressBar`** — Linear version of above. Animated width. Shows overspend as red overflow.
- [ ] **`PanelCard`** — Surface container with border, padding, optional header row. The atomic container for all dashboard content.
- [ ] **`PanelHeader`** — Uppercase muted label + optional right-side count/status. `text-xs tracking-wider`.
- [ ] **`CategoryPill`** — Small chip showing category icon + color dot + name. Used inline and in filters.
- [ ] **`CategoryIcon`** — Renders category icon with color background circle.
- [ ] **`AmountInput`** — Numeric input that formats as currency. Large monospace display. Supports negative toggle.
- [ ] **`DatePicker`** — Minimal inline date selector, defaults to today.
- [ ] **`SegmentedControl`** — Toggle between 2–3 options (e.g., monthly/weekly, need/want). Animated sliding indicator.
- [ ] **`ActionButton`** — Primary button with accent color. Loading state with spinner.
- [ ] **`FAB`** — Floating action button for "+" add transaction. Fixed bottom-right, above tab bar.
- [ ] **`SwipeRow`** — Swipeable list row revealing edit/delete actions. Haptic feedback on threshold.
- [ ] **`EmptyState`** — Illustrated placeholder for empty lists. Muted icon + text + optional action.
- [ ] **`SkeletonLoader`** — Pulse animation placeholder for loading states.
- [ ] **`AnimatedList`** — FlatList wrapper that staggers item entrance animations via moti.

---

## Phase 0: Foundation

### F0-1: Scaffold tab navigation + modal
- [ ] Set up `@react-navigation/bottom-tabs` with 5 tabs: Dashboard, Categories, Transactions, Insights, Settings
- [ ] Add Transaction modal: full-screen modal triggered by FAB
- [ ] Placeholder screen components for all 5 tabs
- [ ] Tab bar styling: dark background, accent tint for active tab, SF symbol-style icons
- [ ] Tab transition animation: cross-fade between screens

### F0-2: Design tokens + theme provider
- [ ] Create theme file with all color, spacing, typography, animation tokens
- [ ] Create `ThemeProvider` with dark/light mode support (dark default)
- [ ] Create `useTheme()` hook
- [ ] Bundle Fira Code font for Android fallback
- [ ] Verify SF Mono renders correctly on iOS device

### F0-3: Build component primitives
- [ ] Build all primitives listed above
- [ ] Storybook-style test screen (dev only) to visually verify each primitive
- [ ] Verify all primitives on iPhone 17 Pro

### F0-4: Device checkpoint
- [ ] Install dev client on iPhone 17 Pro
- [ ] Verify tab navigation, modal, theme, and primitives all render correctly
- [ ] Test dark mode / light mode toggle
- [ ] Verify animations play smoothly at 120fps

---

## Phase 1: Screens (parallel with backend — uses mock services)

During this phase, frontend codes against the service interfaces from `src/types/services.ts` using mock implementations that return hardcoded data matching the type contract. All mocks live in `src/mocks/` and are clearly marked as temporary.

### F1-1: Onboarding — Cycle + Week Start
- [ ] Screen 1: Choose budget cycle (Monthly or Biweekly)
  - Two large tappable cards with icons + descriptions
  - Selection animates: selected card scales up slightly, unselected dims
  - If biweekly: date picker slides in for anchor date
- [ ] Week start selector (segmented control: Mon/Sun)
- [ ] "Next" button transitions to step 2
- [ ] Page transition: shared layout animation (moti `AnimatePresence`)

### F1-2: Onboarding — Income + Starter Categories
- [ ] Income input: large monospace AmountInput, centered
  - Currency symbol prefix
  - Per-period label updates based on cycle selection
- [ ] Starter category picker: grid of suggested categories with icons
  - Pre-grouped by Need / Want
  - Tappable to toggle (animated scale + checkmark)
  - Option to skip and build from scratch
- [ ] "Start budgeting" button → creates period + categories → navigates to Dashboard
- [ ] Confetti/particle micro-animation on completion (subtle, fast)

### F1-3: Category CRUD UI
- [ ] Category list screen (Categories tab)
  - Grouped by Need / Want with section headers
  - Each row: icon, name, progress bar (spent/budget), remaining amount
  - Staggered entrance animation on mount
- [ ] Create category modal
  - Name input
  - Kind selector (Need/Want segmented control)
  - Icon picker (grid of common icons)
  - Color picker (preset palette, 12–16 colors)
- [ ] Edit category (reuses create modal, pre-filled)
- [ ] Archive: swipe-to-archive with confirmation
- [ ] Empty state when no categories exist

### F1-4: Budget Allocation UI
- [ ] Allocation screen (accessed from onboarding or category detail)
  - List of categories with AmountInput per row
  - Cadence toggle (monthly/weekly) per category
  - Rollover rule selector per category
- [ ] Running total bar at top:
  - Shows: allocated / income
  - Animated fill as user adjusts amounts
  - Warning state when over-allocated (bar turns amber/red)
  - Unallocated remainder displayed
- [ ] Validation: warn but don't block over-allocation

### F1-5: Transaction Quick-Add
- [ ] Full-screen modal (triggered by FAB)
  - Large AmountInput at top (auto-focus, numpad)
  - Category picker: horizontal scrolling pills or grid
  - Date picker (default today, tap to change)
  - Merchant input (optional, text field)
  - Note input (optional, text field)
- [ ] "Save" with spring animation: card shrinks + flies toward the category
- [ ] Success haptic feedback
- [ ] Immediately returns to previous screen with updated data

### F1-6: Transaction List + Edit/Delete
- [ ] Transactions tab: virtualized FlatList
  - Grouped by date (section headers)
  - Each row: category icon, merchant/note, amount (monospace, right-aligned)
  - Color-coded by category
  - Staggered entrance animation
- [ ] Swipe left to delete (red), swipe right to edit (accent)
- [ ] Tap row → inline expand with full details? Or navigate to edit modal?
  - Decision: inline expand with animated height change
- [ ] Filter bar at top: category pills + date range
- [ ] Empty state with prompt to add first transaction

### F1-7: Dashboard Summary Tiles
- [ ] Dashboard screen layout:
  ```
  ┌─────────────────────────────────┐
  │  Period label + switcher        │
  ├─────────────────────────────────┤
  │ ┌─────────┐  ┌─────────┐       │
  │ │REMAINING │  │SAFE     │       │
  │ │ $X,XXX  │  │TODAY $XX│       │
  │ └─────────┘  └─────────┘       │
  ├─────────────────────────────────┤
  │  Category highlights            │
  │  ┌──────────────────────┐      │
  │  │ Groceries  $XX left  │      │
  │  │ ████████░░  this wk  │      │
  │  └──────────────────────┘      │
  │  ┌──────────────────────┐      │
  │  │ Dining     $XX left  │      │
  │  │ ██████████░  today   │      │
  │  └──────────────────────┘      │
  ├─────────────────────────────────┤
  │  Spending donut (mini)          │
  │  [donut chart]                  │
  ├─────────────────────────────────┤
  │  Cumulative spend chart (mini)  │
  │  [line chart]                   │
  └─────────────────────────────────┘
  ```
- [ ] All money values use `MoneyText` (animated on change)
- [ ] Tiles enter with staggered fade+slide on mount
- [ ] Pull-to-refresh with custom animation
- [ ] Tapping a category highlight navigates to category detail

### F1-8: Category Detail Screen
- [ ] Header: category icon + name + color accent bar
- [ ] Metric row: Budget | Spent | Remaining (large monospace values)
- [ ] Left-to-spend panel:
  - "Left today" — large accent-colored number
  - "Left this week" — secondary number
  - Status badge (on_track / warning / overspent)
- [ ] Burn-down chart (full width)
  - Remaining line (actual) in category color
  - Ideal pace line (dashed, muted)
  - Today marker (vertical dotted line)
- [ ] Recent transactions list (last 10, tap "see all" → filtered transactions tab)
- [ ] Edit budget button → allocation modal for this category
- [ ] Animated transitions when navigating from category list (shared element: icon + name)

### F1-9: Insights Charts

#### Chart 1: Category Breakdown Donut
- [ ] Animated segment sweep-in on mount (each segment draws clockwise)
- [ ] Center label: total spent or total remaining (toggle)
- [ ] Tappable segments: tap highlights segment + shows tooltip with amount + %
- [ ] Legend below: category name, color dot, amount, percentage
- [ ] Toggle: "Spent" vs "Remaining" view

#### Chart 2: Cumulative Spend vs Budget Pace
- [ ] Line chart, x = days in period, y = cumulative dollars
- [ ] Actual spend line: solid accent color
- [ ] Budget pace line: dashed muted
- [ ] Shaded area between lines:
  - Green tint when under pace
  - Red tint when over pace
- [ ] Today marker: vertical line
- [ ] Animated line drawing on mount (left to right, 800ms)

#### Chart 3: Category Burn-Down
- [ ] Similar to cumulative but inverted (starts at budget, trends to 0)
- [ ] Category selector at top (horizontal pill scroll)
- [ ] Actual remaining line + ideal pace line
- [ ] Warning zone shading when below ideal pace
- [ ] Animated draw on category switch

#### Chart 4: Weekly Bars
- [ ] Only shown for weekly-cadence categories
- [ ] Grouped bars: spent (solid) vs budget (outline)
- [ ] Per-week labels on x-axis
- [ ] Bars animate up from 0 on mount
- [ ] Tap bar for tooltip with exact amount

### F1-10: Period Switcher + Review
- [ ] Period switcher: horizontal swipe or dropdown at top of dashboard
  - Shows period label (e.g., "February 2026" or "Feb 3 – Feb 16")
  - Left/right arrows to navigate periods
  - Animated slide transition on period change
- [ ] Period review screen (accessed when closing a period):
  - Summary stats: income, spent, saved
  - Top overspent categories
  - Month-over-month comparison (if previous period exists)
  - "Close period & start next" action
  - Optional: adjust next period budgets before closing

---

## Phase 2: Integration (after backend delivers real services)

### F2-1: Replace mocks with real Zustand store
- [ ] Remove all mock service implementations
- [ ] Wire store slices to real service implementations
- [ ] Verify all screens render with real SQLite data
- [ ] Fix any type mismatches or data shape issues

### F2-2: Device integration checkpoint
- [ ] Full loop on iPhone 17 Pro: onboarding → add categories → allocate → add transactions → dashboard updates → category detail shows left-to-spend → insights charts render
- [ ] Test with 0 transactions, 1 transaction, 50+ transactions
- [ ] Test period boundaries (what happens on last day of month)
- [ ] Test biweekly mode end-to-end

---

## Phase 3: Polish

### F3-1: Settings Screen
- [ ] Sections:
  - Budget cycle (monthly/biweekly) — change triggers period recalculation warning
  - Week start day
  - Currency / locale
  - App lock (biometric toggle)
  - Export data (CSV)
  - Import data (CSV)
  - About / version
- [ ] Each setting row: label + current value + chevron or toggle
- [ ] Danger zone: "Reset all data" with confirmation

### F3-2: CSV Export/Import UI
- [ ] Export: choose period or all → share sheet with generated CSV
- [ ] Import: file picker → preview parsed rows → confirm → show result (imported count, skipped, errors)
- [ ] Progress indicator during import

### F3-3: Alert UI
- [ ] In-app notification banner (slides down from top, auto-dismiss after 5s)
  - "Groceries is at 80% — $24 left this week"
  - Tap navigates to category detail
- [ ] Alert badge on category list items approaching limit
- [ ] Local notification wiring (background check when app enters background)

### F3-4: Accessibility Pass
- [ ] VoiceOver labels on all interactive elements
- [ ] Text equivalents for all charts:
  - e.g., "You spent $340 of $500 in Groceries, 68% of budget. On track."
- [ ] Dynamic Type support (test with largest accessibility sizes)
- [ ] Reduce Motion: disable all non-essential animations, use simple opacity transitions instead
- [ ] Minimum tap targets: 44x44pt
- [ ] Color is never the sole indicator — always paired with icon/label

### F3-5: Performance Pass
- [ ] Memoize chart data builders (recompute only on data change)
- [ ] Virtualized lists for transactions (already in F1-6, verify performance with 500+ items)
- [ ] Profile animation frame rates — target 120fps on iPhone 17 Pro
- [ ] Audit re-renders with React DevTools Profiler
- [ ] Lazy load Insights tab charts (don't compute until tab is visited)

### F3-6: App Icon + Splash Screen
- [ ] App icon: minimal geometric design, accent green on dark background
- [ ] Splash screen: centered icon on bg-primary, fade transition to app
- [ ] Configure in app.json / app.config.ts

### F3-7: E2E Smoke Flows
- [ ] Maestro flows:
  - Fresh install → onboarding → dashboard
  - Add 3 transactions → verify dashboard totals
  - Navigate to category detail → verify left-to-spend
  - Open insights → verify charts render
  - Export CSV → verify file generated
- [ ] Run on device (not simulator)

### F3-8: Final Device Checkpoint
- [ ] Full manual test on iPhone 17 Pro
- [ ] Test all animations at 120fps
- [ ] Test with system dark mode + light mode
- [ ] Test with Dynamic Type at multiple sizes
- [ ] Test with VoiceOver enabled
- [ ] Test with Reduce Motion enabled
- [ ] Verify haptic feedback on transaction add and swipe actions

---

## Dependencies on Backend Agent

| Frontend needs | Backend delivers | Blocks |
|---|---|---|
| Mock service implementations match real signatures | Final service interface signatures (in `src/types/services.ts`) | F1-* can proceed with mocks |
| Real Zustand store slices populated from SQLite | Store implementation wired to repos + services | F2-1 |
| Rollover logic working | Period close + carryover application | F1-10 period review |
| Alert evaluation engine | AlertService implementation | F3-3 |
| CSV parse + dedupe | CSVService implementation | F3-2 import |

---

## Key Libraries

| Library | Purpose | Version |
|---|---|---|
| `@react-navigation/bottom-tabs` | Tab navigation | latest |
| `@react-navigation/native-stack` | Stack navigation | latest |
| `react-native-reanimated` | Animation engine | v3 |
| `moti` | Declarative animations | latest |
| `react-native-gesture-handler` | Gestures (swipe, pan) | latest |
| `victory-native` | Charts (donut, line, bar) | latest |
| `react-native-svg` | SVG primitives (victory dep) | latest |
| `expo-haptics` | Haptic feedback | latest |
| `expo-local-authentication` | Biometric app lock | latest |
| `expo-secure-store` | Secure token storage | latest |
| `expo-font` | Bundle Fira Code | latest |
| `expo-document-picker` | CSV import file selection | latest |
| `expo-sharing` | CSV export sharing | latest |
| `zustand` | State management | latest |

---

## Device Testing Cadence

| Checkpoint | After | What to verify |
|---|---|---|
| **Hard 1** | F0-4 | Nav shell, theme, primitives render at 120fps |
| **Hard 2** | F1-7 | Dashboard with mock data, all tiles + mini charts |
| **Hard 3** | F2-2 | Full data loop with real SQLite |
| **Hard 4** | F3-8 | Final polish, accessibility, performance |
| **Soft** | Any nav/animation/state change | Quick visual sanity check on device |
