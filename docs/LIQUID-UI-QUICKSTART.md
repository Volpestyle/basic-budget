# Liquid UI Quick Start 🚀

Get started with the liquid UI system in 5 minutes!

## 1. View the Demo

Start your dev server and visit the demo page:

```bash
cd apps/web
npm run dev
```

Then open: **http://localhost:5173/liquid-demo**

You'll see all liquid components in action!

---

## 2. Basic Usage Examples

### Animated Button

```svelte
<script>
  import { Button } from '$components'
</script>

<!-- Liquid animations are enabled by default -->
<Button variant="primary">Click Me</Button>

<!-- Disable animations if needed -->
<Button animate={false}>Static Button</Button>
```

### Animated Panel

```svelte
<script>
  import { LiquidPanel } from '$components'
</script>

<LiquidPanel enterFrom="bottom">
  <h2>My Panel</h2>
  <p>Content slides in smoothly!</p>
</LiquidPanel>
```

### Modal with Animations

```svelte
<script>
  import { LiquidModal, Button } from '$components'
  let open = $state(false)
</script>

<Button onclick={() => (open = true)}>Open Modal</Button>

<LiquidModal {open} onClose={() => (open = false)} title="My Modal">
  <p>Modal content with elastic entrance!</p>

  {#snippet footer()}
    <Button onclick={() => (open = false)}>Close</Button>
  {/snippet}
</LiquidModal>
```

### Dropdown Menu

```svelte
<script>
  import { LiquidMenu, Button } from '$components'
</script>

<LiquidMenu>
  {#snippet trigger()}
    <Button variant="ghost">Menu</Button>
  {/snippet}

  <button class="liquid-menu-item">Option 1</button>
  <button class="liquid-menu-item">Option 2</button>
  <button class="liquid-menu-item">Option 3</button>
</LiquidMenu>
```

### Staggered List

```svelte
<script>
  import { liquidStagger } from '$lib/motion/actions'
</script>

<!-- Children will stagger in sequentially -->
<ul use:liquidStagger>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ul>
```

### Element Entrance

```svelte
<script>
  import { liquidEnter } from '$lib/motion/actions'
</script>

<!-- Fade and slide in on mount -->
<div use:liquidEnter={{ y: 30, delay: 0.2 }}>
  <h1>Welcome!</h1>
</div>
```

---

## 3. Available Components

| Component          | Purpose                                           |
| ------------------ | ------------------------------------------------- |
| `Button`           | Enhanced with liquid hover/press (existing)       |
| `ButtonGroup`      | Morphing selection highlight between buttons      |
| `LiquidPanel`      | Animated container for content sections           |
| `LiquidModal`      | Modal with elastic entrance and backdrop blur     |
| `LiquidDrawer`     | Side panel that slides in with staggered children |
| `LiquidMenu`       | Dropdown menu with expandable animation           |
| `LiquidNav`        | Navigation with morphing highlight indicator      |
| `SplitButton`      | Button that expands into multiple options         |
| `SelectionToolbar` | Contextual toolbar that grows/shrinks             |

---

## 4. Available Actions

| Action          | Purpose                          |
| --------------- | -------------------------------- |
| `liquidButton`  | Combined hover + press animation |
| `liquidHover`   | Subtle scale-up on hover         |
| `liquidPress`   | Springy press feedback           |
| `liquidEnter`   | Element entrance animation       |
| `liquidStagger` | Stagger child elements           |
| `liquidReveal`  | Pop/scale reveal effect          |

---

## 5. Motion Tokens

Import from `$lib/motion/config`:

```typescript
import { duration, ease, stagger } from '$lib/motion/config'

// Durations (in seconds)
duration.fast // 0.15s - hover/feedback
duration.normal // 0.3s  - basic transitions
duration.slow // 0.5s  - panels/modals
duration.slower // 0.7s  - page transitions

// Easings
ease.default // 'power3.out' - smooth
ease.elastic // 'back.out(1.4)' - bouncy
ease.soft // 'power2.out' - gentle
ease.exit // 'power2.in' - exit animation

// Stagger
stagger.xs // 0.03s - tight groups
stagger.sm // 0.06s - standard lists
stagger.md // 0.1s  - distinct items
```

---

## 6. Custom Animations

Create your own animations using the motion config:

```svelte
<script>
  import { gsap } from 'gsap'
  import { duration, ease } from '$lib/motion/config'

  function myAnimation(node: HTMLElement) {
    gsap.fromTo(
      node,
      { opacity: 0, x: -50 },
      {
        opacity: 1,
        x: 0,
        duration: duration.normal,
        ease: ease.default,
      }
    )
  }
</script>

<div use:myAnimation>Custom animated content</div>
```

---

## 7. Page Transitions

Elements automatically transition between pages if marked:

```svelte
<!-- On any page -->
<img data-transition-key="avatar" src={avatar} alt="Avatar" />
```

Elements with the same `data-transition-key` will morph smoothly during navigation!

For staggered entrance on page load:

```svelte
<div data-transition-stagger>
  <Card>Card 1</Card>
</div>
<div data-transition-stagger>
  <Card>Card 2</Card>
</div>
```

---

## 8. Accessibility

All animations respect user preferences:

```typescript
import { prefersReducedMotion } from '$lib/motion/config'

if (prefersReducedMotion()) {
  // User prefers reduced motion - skip or simplify animations
}
```

You don't need to manually check this - all liquid components handle it automatically!

---

## 9. Customization

Want different animation speeds? Edit `apps/web/src/lib/motion/config.ts`:

```typescript
export const duration = {
  fast: 0.1, // Make faster (was 0.15)
  normal: 0.2, // Make faster (was 0.3)
  slow: 0.35, // Make faster (was 0.5)
}
```

Want more bounce? Adjust the elastic ease:

```typescript
export const ease = {
  elastic: 'back.out(2.0)', // More bounce (was 1.4)
}
```

---

## 10. Learn More

📖 **Full Documentation**: `docs/liquid-ui-guide.md`  
📝 **Implementation Summary**: `docs/liquid-ui-implementation-summary.md`  
🎨 **Live Demo**: Visit `/liquid-demo` in your browser  
📘 **Original Spec**: `docs/liquid-ui.md`

---

## Quick Reference: Common Patterns

### Pattern 1: Animated Card Grid

```svelte
<script>
  import { LiquidPanel, liquidStagger } from '$components'
  import { liquidStagger } from '$lib/motion/actions'
</script>

<div use:liquidStagger class="grid grid-cols-3 gap-4">
  {#each items as item}
    <LiquidPanel>
      <h3>{item.title}</h3>
      <p>{item.description}</p>
    </LiquidPanel>
  {/each}
</div>
```

### Pattern 2: Settings Page with Drawers

```svelte
<script>
  import { Button, LiquidDrawer } from '$components'
  let settingsOpen = $state(false)
</script>

<Button onclick={() => (settingsOpen = true)}>Settings</Button>

<LiquidDrawer open={settingsOpen} onClose={() => (settingsOpen = false)} title="Settings">
  <!-- Settings content here -->
</LiquidDrawer>
```

### Pattern 3: Tab Navigation

```svelte
<script>
  import { ButtonGroup } from '$components'
  let activeTab = $state('overview')
</script>

<ButtonGroup selected={activeTab} onSelect={(v) => (activeTab = v)}>
  <button value="overview">Overview</button>
  <button value="details">Details</button>
  <button value="settings">Settings</button>
</ButtonGroup>

{#if activeTab === 'overview'}
  <!-- Overview content -->
{:else if activeTab === 'details'}
  <!-- Details content -->
{:else}
  <!-- Settings content -->
{/if}
```

---

That's it! You're ready to create beautiful liquid interfaces. 🎨✨

**Pro tip**: Start by replacing one Modal or Panel at a time, then gradually add liquid animations to more components as you get comfortable with the system.

Happy animating! 🚀
