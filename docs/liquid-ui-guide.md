# Liquid UI Implementation Guide

This guide documents the liquid UI system implemented for the Basic Budget application. The system provides beautiful, cohesive animations that make the interface feel fluid and responsive.

## Overview

The liquid UI system is built on:

- **Svelte 5** for reactive components
- **GSAP (GreenSock)** for high-performance animations
- **TypeScript** for type safety
- **Tailwind CSS** for styling

### Design Philosophy

The liquid UI follows these principles:

- **Fluid Motion**: Everything flows, merges, separates, and reconfigures smoothly
- **Consistent Timing**: Standardized durations and easings across all animations
- **Elastic Feel**: Subtle overshoot/elastic easing for natural, satisfying motion
- **Accessibility**: Full support for `prefers-reduced-motion`
- **Performance**: GPU-accelerated transforms and proper cleanup

---

## Core Motion System

### 1. Motion Config (`$lib/motion/config.ts`)

Central configuration for all animations:

```typescript
import { duration, ease, stagger, transform } from '$lib/motion/config'

// Durations
duration.fast // 150ms - hover/feedback
duration.normal // 300ms - basic transitions
duration.slow // 500ms - panels/modals
duration.slower // 700ms - page transitions

// Easings
ease.default // 'power3.out' - smooth, natural
ease.elastic // 'back.out(1.4)' - subtle bounce
ease.exit // 'power2.in' - exit animations

// Stagger
stagger.xs // 30ms - tight groupings
stagger.sm // 60ms - standard lists
stagger.md // 100ms - distinct items
```

### 2. Svelte Actions (`$lib/motion/actions.ts`)

Reusable animation actions:

```svelte
<script>
  import { liquidButton, liquidEnter, liquidStagger } from '$lib/motion/actions'
</script>

<!-- Button with hover/press animation -->
<button use:liquidButton>Click me</button>

<!-- Element entrance animation -->
<div use:liquidEnter={{ y: 30, delay: 0.2 }}>Content</div>

<!-- Stagger child elements -->
<ul use:liquidStagger={{ stagger: 0.06 }}>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ul>
```

---

## Component Library

### Button Component

Enhanced with liquid animations by default:

```svelte
<script>
  import { Button } from '$components'
</script>

<Button variant="primary" animate={true}>Save Changes</Button>

<!-- Variants: primary | secondary | ghost | danger -->
<!-- Sizes: sm | md | lg -->
```

### ButtonGroup

Morphing selection highlight that flows between buttons:

```svelte
<script>
  import { ButtonGroup } from '$components'
  let selected = $state('option1')
</script>

<ButtonGroup {selected} onSelect={(val) => (selected = val)}>
  <button value="option1">Option 1</button>
  <button value="option2">Option 2</button>
  <button value="option3">Option 3</button>
</ButtonGroup>
```

### LiquidPanel

Animated container for content sections:

```svelte
<script>
  import { LiquidPanel } from '$components'
</script>

<LiquidPanel enterFrom="bottom" delay={0.1}>
  <h2>Panel Title</h2>
  <p>Panel content slides in smoothly...</p>
</LiquidPanel>

<!-- enterFrom: top | bottom | left | right | center -->
```

### LiquidModal

Modal with elastic entrance and backdrop blur:

```svelte
<script>
  import { LiquidModal, Button } from '$components'
  let open = $state(false)
</script>

<Button onclick={() => (open = true)}>Open Modal</Button>

<LiquidModal {open} onClose={() => (open = false)} title="My Modal">
  <p>Modal content here</p>

  {#snippet footer()}
    <Button onclick={() => (open = false)}>Close</Button>
  {/snippet}
</LiquidModal>

<!-- Sizes: sm | md | lg | xl -->
```

### LiquidDrawer

Side panel that slides in with staggered children:

```svelte
<script>
  import { LiquidDrawer } from '$components'
  let open = $state(false)
</script>

<LiquidDrawer {open} onClose={() => (open = false)} side="right" title="Options">
  <div>Drawer content staggered in...</div>
  <div>Item 2</div>
  <div>Item 3</div>
</LiquidDrawer>

<!-- side: left | right -->
```

### LiquidMenu

Dropdown menu with expandable animation:

```svelte
<script>
  import { LiquidMenu, Button } from '$components'
</script>

<LiquidMenu align="left">
  {#snippet trigger()}
    <Button variant="ghost">Menu</Button>
  {/snippet}

  <button class="liquid-menu-item">Profile</button>
  <button class="liquid-menu-item">Settings</button>
  <button class="liquid-menu-item">Logout</button>
</LiquidMenu>

<!-- align: left | right | center -->
```

### LiquidNav

Navigation with morphing highlight indicator:

```svelte
<script>
  import { LiquidNav } from '$components'
  import { page } from '$app/stores'

  const navItems = [
    { href: '/', label: 'Dashboard', icon: 'home' },
    { href: '/transactions', label: 'Transactions', icon: 'receipt' },
    // ...
  ]
</script>

<LiquidNav items={navItems} activeHref={$page.url.pathname} orientation="vertical" />

<!-- orientation: horizontal | vertical -->
<!-- variant: default | pills | underline -->
```

---

## Advanced Interactions

### SplitButton

Button that expands into multiple options:

```svelte
<script>
  import { SplitButton } from '$components'
</script>

<SplitButton
  primary={{ label: 'Save', action: handleSave }}
  options={[
    { label: 'Save & Close', action: handleSaveClose },
    { label: 'Save as Draft', action: handleSaveDraft },
  ]}
  variant="primary"
/>
```

### SelectionToolbar

Contextual toolbar that grows from bottom when items are selected:

```svelte
<script>
  import { SelectionToolbar, Button } from '$components'
  let selectedCount = $state(0)
</script>

<SelectionToolbar {selectedCount} position="bottom">
  {#snippet children(count)}
    <Button size="sm" onclick={handleDelete}>Delete</Button>
    <Button size="sm" onclick={handleExport}>Export</Button>
  {/snippet}
</SelectionToolbar>
```

---

## Page Transitions

### Setup in Layout

Page transitions are configured in `+layout.svelte`:

```svelte
<script>
  import { beforeNavigate, afterNavigate } from '$app/navigation'
  import {
    captureTransitionElements,
    applyTransitionElements,
  } from '$lib/animations/pageTransition'

  let savedTransitionElements
  let pageKey = $state($page.url.pathname)

  beforeNavigate(() => {
    savedTransitionElements = captureTransitionElements()
  })

  afterNavigate(() => {
    pageKey = $page.url.pathname
    if (savedTransitionElements) {
      requestAnimationFrame(() => {
        applyTransitionElements(savedTransitionElements)
        savedTransitionElements = null
      })
    }
  })
</script>

<main>
  {#key pageKey}
    <div class="page-content">
      {@render children()}
    </div>
  {/key}
</main>
```

### FLIP Transitions for Shared Elements

Tag elements that should morph between pages:

```svelte
<!-- On page A -->
<img src={avatar} data-transition-key="user-avatar" alt="Avatar" />

<!-- On page B - same key -->
<img src={avatar} data-transition-key="user-avatar" alt="Avatar" class="larger-size" />
```

The avatar will smoothly morph from its position/size on page A to page B.

### Staggered Page Content

Mark elements to stagger in on page load:

```svelte
<div data-transition-stagger>
  <Card>Item 1</Card>
</div>
<div data-transition-stagger>
  <Card>Item 2</Card>
</div>
<div data-transition-stagger>
  <Card>Item 3</Card>
</div>
```

---

## Updated Navigation Components

### Sidebar (Desktop)

Now includes morphing background highlight:

```svelte
<!-- The Sidebar component automatically handles liquid animations -->
<Sidebar>
  {#snippet user()}
    <!-- User info -->
  {/snippet}
</Sidebar>
```

### BottomNav (Mobile)

Includes subtle indicator line that flows between items:

```svelte
<!-- The BottomNav component is automatically animated -->
<BottomNav />
```

---

## Accessibility

### Reduced Motion Support

All animations respect `prefers-reduced-motion`:

```typescript
import { prefersReducedMotion } from '$lib/motion/config'

if (prefersReducedMotion()) {
  // Skip animations or use simple fades
  gsap.set(element, { opacity: 1 })
} else {
  // Full liquid animation
  gsap.to(element, { opacity: 1, y: 0, duration: 0.5 })
}
```

### Focus States

All interactive elements maintain visible focus states:

- Keyboard navigation fully supported
- Focus rings animate smoothly
- No reliance on motion for critical info

---

## Performance Tips

### 1. Use Transforms

Always prefer `x`, `y`, `scale`, `rotation` over layout properties:

```typescript
// ✅ Good - GPU accelerated
gsap.to(element, { x: 100, y: 50, scale: 1.2 })

// ❌ Bad - causes reflow
gsap.to(element, { left: '100px', top: '50px', width: '120%' })
```

### 2. Will-Change

Applied automatically via utility classes:

```svelte
<div class="will-change-transform">Animated element</div>
```

### 3. Cleanup

All actions automatically clean up GSAP timelines on destroy.

### 4. Large Lists

For lists with many items, limit stagger:

```svelte
<div use:liquidStagger={{ stagger: 0.03 }}>
  <!-- Keep stagger tight for long lists -->
</div>
```

---

## Demo Page

Visit `/liquid-demo` to see all components in action with interactive examples.

---

## Customization

### Adjusting Motion Feel

Edit `$lib/motion/config.ts` to tune the motion:

```typescript
// Make animations faster
export const duration = {
  fast: 0.1, // was 0.15
  normal: 0.2, // was 0.3
  slow: 0.35, // was 0.5
}

// More elastic bounce
export const ease = {
  elastic: 'back.out(2.0)', // was 1.4
  // ...
}
```

### Creating Custom Animations

Use the motion config in your own components:

```svelte
<script>
  import { gsap } from 'gsap'
  import { duration, ease } from '$lib/motion/config'

  function myCustomAnimation(node: HTMLElement) {
    gsap.fromTo(
      node,
      { opacity: 0, scale: 0.8 },
      {
        opacity: 1,
        scale: 1,
        duration: duration.slow,
        ease: ease.elastic,
      }
    )
  }
</script>

<div use:myCustomAnimation>Custom animated content</div>
```

---

## Best Practices

1. **Be Consistent**: Always use the motion config tokens
2. **Don't Overdo It**: Not every element needs animation
3. **Test Reduced Motion**: Always test with reduced motion enabled
4. **Consider Context**: Slower animations for important moments, faster for frequent actions
5. **Group Related Motions**: Coordinate animations that happen together
6. **Respect User Preferences**: Always honor `prefers-reduced-motion`

---

## File Structure

```
apps/web/src/lib/
├── motion/
│   ├── config.ts        # Motion tokens and constants
│   └── actions.ts       # Reusable Svelte actions
├── animations/
│   ├── index.ts
│   ├── pageTransition.ts
│   ├── cardEntrance.ts
│   ├── chartEntrance.ts
│   └── numberCounter.ts
├── components/
│   ├── Button.svelte
│   ├── ButtonGroup.svelte
│   ├── LiquidPanel.svelte
│   ├── LiquidModal.svelte
│   ├── LiquidDrawer.svelte
│   ├── LiquidMenu.svelte
│   ├── LiquidNav.svelte
│   ├── SplitButton.svelte
│   ├── SelectionToolbar.svelte
│   ├── Sidebar.svelte     # Updated with liquid nav
│   ├── BottomNav.svelte   # Updated with liquid nav
│   └── index.ts
```

---

## Summary

You now have a complete liquid UI system with:

✅ Motion design system with standardized tokens  
✅ Reusable Svelte actions for common animations  
✅ Full component library with liquid animations  
✅ Page transitions with FLIP technique  
✅ Advanced merge/split interactions  
✅ Accessibility support (reduced motion)  
✅ Performance optimizations  
✅ Comprehensive documentation and demo page

Every button, menu, panel, and navigation element now feels like part of one cohesive, liquid motion system!
