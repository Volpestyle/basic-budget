You are an expert frontend interaction designer and senior engineer specializing in:

- Svelte/SvelteKit
- GSAP (GreenSock) for high‑end motion design
- Design systems and component libraries
- Complex interactive UI with “liquid”, morphing, smooth transitions

I have an existing application built with:

- Frontend: Svelte (and optionally SvelteKit for routing)
- Animations: GSAP
- Backend: Go (for APIs, web server, business logic)

### High-level goal

Turn the existing UI into a **beautifully animated, “liquid” interface** where:

- Buttons, menus, panels, and UI elements **flow**, **merge**, **separate**, and **reconfigure** smoothly.
- The feel is “liquid glass” in terms of fluidity and transitions, **not** necessarily the bright/glassmorphism visual style.
- Every interactive element has **cohesive, consistent motion rules** (e.g., timing, easing, entry/exit behavior).
- Animations enhance clarity and delight without being overwhelming, laggy, or distracting.

Assume you can modify Svelte components, add new ones, and wire in GSAP timelines.

---

## 1. Overall design & motion language

Define a **motion design system** for the app. Explicitly describe and then implement:

1. **Global motion principles**
   - Motion keywords: fluid, elastic but controlled, non-cartoonish.
   - No abrupt snaps; everything eases in/out with short, natural “settling”.
   - Use **coordinated transitions**: siblings animate in related ways when screens change (e.g., buttons slide and scale together).

2. **Standardized timings & easings**
   Define a small set of reusable tokens, for example (you can adjust values, but keep the structure):
   - Durations:
     - `fast`: 150ms–200ms (for small hover/feedback)
     - `normal`: 250ms–350ms (for button presses, basic transitions)
     - `slow`: 400ms–550ms (for full-panel changes, modal in/out)
   - Easing:
     - Default “liquid” ease: something like `power3.inOut` or `power2.out`
     - Elastic/overshoot: `back.out(1.7)` for subtle merge/split behavior
   - Stagger tokens: `xs`, `sm`, `md` (e.g., 0.03s, 0.06s, 0.1s) for list or grid items

3. **Z‑depth / layering behavior**
   - How elements scale and blur when they come “forward”.
   - How background panels subtly shift or fade when a child overlay appears.

Output:

- A brief written spec of this motion language.
- A small Svelte/TS module exporting these tokens (durations, easings, stagger defaults) that all animations reference (e.g., `motionConfig.ts` or similar).

---

## 2. Component-level animation strategy

Refactor or design a **component library** where each core UI element has built-in animations via GSAP. For each type below, show example Svelte components and the GSAP code.

### 2.1 Buttons (primary, secondary, icon buttons, grouped buttons)

**Behavioral requirements:**

- Idle: subtle micro-motion on hover (scale up slightly, maybe 1.03; soft glow or border shift).
- Press: quick scale down then release (springy).
- Disabled: no hover motion, softened opacity.
- Group/merge behavior:
  - When multiple buttons are next to each other (e.g., a segmented control), transitions between selected states should feel “liquid”, as if the selection highlight **slides and morphs** from one button to another.
  - When a set of buttons appears, they can **emerge from a shared “blob”** (e.g., start slightly overlapped and “separate” into place).

**What to provide:**

- A `LiquidButton.svelte` component that:
  - Accepts props for `variant`, `selected`, `disabled`, etc.
  - Uses GSAP in `onMount` / lifecycle hooks or Svelte actions for:
    - Initial enter animation
    - Hover and active interactions
  - Optionally exposes a Svelte action like `useLiquidButton` for non-standard elements.

- A `ButtonGroup.svelte` that:
  - Wraps multiple `LiquidButton` components.
  - Animates the shared selection highlight / background morphing between buttons using GSAP.

### 2.2 Menus, nav bars, and toolbars

**Behavior requirements:**

- Top or side nav:
  - When a route or primary section changes, nav items animate their state with smooth underlines, sliding highlights, or pill backgrounds.
  - Icons and text shift together (e.g., small upward glide and fade-in for active item).
- Dropdown menus:
  - Opening: menu scale/opacity animation from the trigger element (as if expanding from a liquid droplet).
  - Menu items stagger in with slight vertical and opacity motion.
  - Closing: reverse animation with subtle “pull back” feel.

**What to provide:**

- `LiquidNav.svelte` for the main navigation with GSAP transitions between active items.
- `LiquidMenu.svelte` (dropdown or context menu) with:
  - GSAP timeline for open/close.
  - Staggered child animations using the motion config.
- Show how to wire this into SvelteKit route changes (if applicable), e.g., using `afterNavigate` hooks or layout transitions to coordinate nav animations with page transitions.

### 2.3 Panels, modals, and drawers

**Behavior requirements:**

- Panels (cards, content sections) should:
  - Fade and slide slightly when entering.
  - Morph when their size changes (e.g., card expanding into a detail view).
- Modals:
  - Background content subtly scales or shifts back; overlay content “pushes forward.”
  - The modal content itself can have a short “liquid expand” effect (scale from ~0.95 to 1 with easing).
- Drawers / side panels:
  - Slide in with ease; elements inside stagger in.
  - Close with mirrored motion.

**What to provide:**

- `LiquidPanel.svelte` base component with:
  - Props for `enterFrom` (top/bottom/left/right/center)
  - Optional “morph” animation when toggling compact/full modes.
- `LiquidModal.svelte` and `LiquidDrawer.svelte` demonstrating:
  - GSAP timelines that can be controlled via props or Svelte stores.
  - Coordinated background dimming and content scaling.

---

## 3. Screen‑level and route‑level transitions

Define and implement a **page transition system** so that moving between main screens feels like:

- Elements are **re-arranging and flowing** rather than just popping in/out.
- Shared elements (e.g., a profile avatar or card) can seamlessly morph from one layout to another.

**What to provide:**

- If using SvelteKit:
  - A layout that sets up **route transition hooks**.
  - A GSAP-based `animateIn` / `animateOut` scheme where:
    - Outgoing page elements move and fade in a coordinated way.
    - Incoming page elements slide/morph in with a stagger.
- Suggestions for tagging “shared” elements (with `data-motion-key` or similar) so GSAP can:
  - Match their old position to their new one and animate between them (pseudo-FLIP technique).

---

## 4. Interactions that feel “liquid” (merging/separating behaviors)

Design specific patterns where UI elements **merge** and **separate**:

1. **Morphing button groups**
   - Example: a single primary button that, when clicked, transforms into multiple options.
   - Animation: start from the single button, then:
     - Slightly expand it.
     - Split into two or three buttons that slide outward while maintaining an invisible “connecting” motion (same baseline, overlapping shadows, etc.).

2. **Card grid filters**
   - When filters change, cards should smoothly:
     - Move to new positions.
     - Fade/scale in/out with short stagger.
   - No jarring resorting; use GSAP to animate from old positions to new ones.

3. **Contextual toolbars**
   - In a list with checkboxes, when the user selects items:
     - A contextual toolbar “grows” from the bottom or top of the screen, as though emerging from the selected items.
   - When deselecting all:
     - The toolbar shrinks and fades back into the UI.

**What to provide:**

- Example Svelte components illustrating:
  - A “split button” pattern.
  - A “filterable card grid” with animated rearranging using GSAP.
  - A “selection toolbar” that appears/disappears with liquid motion.

---

## 5. Technical details & implementation constraints

Please structure the code and explanations as follows:

1. **Svelte + GSAP wiring**
   - Use idiomatic Svelte (script/setup, `onMount`, `onDestroy`, transitions where appropriate).
   - Prefer Svelte actions (e.g., `useLiquidHover`, `useLiquidEnter`) for reusable animations across components.
   - Show how to store GSAP timelines on elements and clean them up properly.

2. **Configuration & theming**
   - Provide a central config file for:
     - Motion constants (durations, easings, staggers).
     - Optional theme tokens for border radius, shadow intensity, etc.
   - Make it easy to tweak the “liquid-ness” by changing config, not rewriting animations.

3. **Performance**
   - Use transforms (`x`, `y`, `scale`) and opacity rather than layout-affecting properties where possible.
   - Avoid expensive reflows; consider using `will-change` where beneficial.
   - Provide tips for handling large lists (e.g., limiting simultaneous animations, using stagger efficiently).

4. **Accessibility**
   - Respect `prefers-reduced-motion`: allow a mode where:
     - Animations are disabled or greatly reduced.
     - Use simple fades and instant transitions instead of complex morphs.
   - Ensure focus states are visible even with animated outlines/underlines.
   - Do not rely solely on motion to convey critical information.

---

## 6. Integration with Go backend

The Go backend itself doesn’t need animation changes, but:

- Assume data is coming via JSON APIs.
- Show example wiring where components consume data and animate as it:
  - Loads (skeleton or placeholder animations).
  - Updates (items added/removed/updated with smooth transitions).

---

## 7. Output format

When responding, please:

1. Start with a short **design summary** (1–2 paragraphs) explaining the motion language and the “liquid” feel.
2. Then, provide:
   - The motion config module (TypeScript/JS).
   - Svelte components for:
     - `LiquidButton`, `ButtonGroup`
     - `LiquidNav`, `LiquidMenu`
     - `LiquidPanel`, `LiquidModal`, `LiquidDrawer`
     - At least one “merge/split” interaction (e.g., split button or toolbar).
   - Example usage snippets wired into a simple Svelte page.
3. Include inline comments in the code explaining:
   - Where GSAP timelines are created.
   - How they are controlled.
   - How to adjust timings and easings.

Focus on showing **clear, reusable patterns** that I can apply to the rest of the app, not just one-off animations. The final result should be an app where **every button, menu, and panel feels like part of one cohesive, liquid motion system.**
