<!--
  LiquidMenu.svelte
  
  A dropdown menu with liquid animations:
  - Expands from trigger element like a liquid droplet
  - Menu items stagger in with smooth motion
  - Closes with reverse animation
  
  Usage:
    <LiquidMenu>
      {#snippet trigger()}
        <button>Open Menu</button>
      {/snippet}
      <a href="/profile">Profile</a>
      <a href="/settings">Settings</a>
      <button onclick={handleLogout}>Logout</button>
    </LiquidMenu>
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import { gsap } from 'gsap'
  import { duration, ease, stagger, transform, prefersReducedMotion } from '$lib/motion/config'

  interface Props {
    trigger: Snippet
    align?: 'left' | 'right' | 'center'
    children: Snippet
  }

  let { trigger, align = 'left', children }: Props = $props()

  let isOpen = $state(false)
  let menuRef = $state<HTMLDivElement>()
  let contentRef = $state<HTMLDivElement>()
  let animating = $state(false)

  // Animate menu open/close
  $effect(() => {
    if (!menuRef || !contentRef) return

    if (isOpen) {
      animateIn()
    } else if (animating) {
      animateOut()
    }
  })

  function animateIn() {
    if (prefersReducedMotion()) {
      gsap.set(menuRef, { opacity: 1, scale: 1 })
      gsap.set(contentRef.children, { opacity: 1, y: 0 })
      animating = true
      return
    }

    animating = true

    const tl = gsap.timeline()

    // Menu expands from origin with elastic ease
    tl.fromTo(
      menuRef,
      {
        opacity: 0,
        scale: transform.menuOriginScale,
        transformOrigin: getTransformOrigin(),
      },
      {
        opacity: 1,
        scale: 1,
        duration: duration.normal,
        ease: ease.elastic,
      },
      0
    )

    // Menu items stagger in
    tl.fromTo(
      contentRef.children,
      { opacity: 0, y: -10 },
      {
        opacity: 1,
        y: 0,
        duration: duration.fast,
        ease: ease.default,
        stagger: stagger.xs,
      },
      0.1
    )
  }

  function animateOut() {
    if (prefersReducedMotion()) {
      gsap.set(menuRef, { opacity: 0, scale: transform.menuOriginScale })
      animating = false
      return
    }

    const tl = gsap.timeline({
      onComplete: () => {
        animating = false
      },
    })

    // Menu shrinks back
    tl.to(
      menuRef,
      {
        opacity: 0,
        scale: transform.menuOriginScale,
        transformOrigin: getTransformOrigin(),
        duration: duration.fast,
        ease: ease.exit,
      },
      0
    )
  }

  function getTransformOrigin(): string {
    switch (align) {
      case 'left':
        return 'top left'
      case 'right':
        return 'top right'
      case 'center':
        return 'top center'
      default:
        return 'top left'
    }
  }

  function toggleMenu() {
    isOpen = !isOpen
  }

  function closeMenu() {
    isOpen = false
  }

  function handleClickOutside(event: MouseEvent) {
    if (isOpen && menuRef && !menuRef.contains(event.target as Node)) {
      closeMenu()
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      closeMenu()
    }
  }

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="relative inline-block">
  <!-- Trigger button -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div onclick={toggleMenu} role="button" tabindex="0">
    {@render trigger()}
  </div>

  <!-- Dropdown menu -->
  {#if isOpen || animating}
    <div
      bind:this={menuRef}
      class="absolute {alignmentClasses[
        align
      ]} top-full mt-2 z-50 min-w-[12rem] bg-cream-50 dark:bg-ink-900 border border-ink-900/10 dark:border-white/10 rounded-lg shadow-xl overflow-hidden"
      role="menu"
    >
      <div bind:this={contentRef} class="py-1">
        {@render children()}
      </div>
    </div>
  {/if}
</div>

<style>
  /* Menu item styling for child elements */
  :global(.liquid-menu-item) {
    display: block;
    width: 100%;
    padding: 0.5rem 1rem;
    text-align: left;
    font-size: 0.875rem;
    color: var(--color-ink-900);
    transition: background-color 150ms;
  }

  :global(.dark .liquid-menu-item) {
    color: white;
  }

  :global(.liquid-menu-item:hover) {
    background-color: rgb(var(--color-ink-900) / 0.05);
  }

  :global(.dark .liquid-menu-item:hover) {
    background-color: rgb(255 255 255 / 0.05);
  }

  :global(.liquid-menu-item:focus) {
    outline: none;
    background-color: rgb(var(--color-ink-900) / 0.05);
  }

  :global(.dark .liquid-menu-item:focus) {
    background-color: rgb(255 255 255 / 0.05);
  }
</style>
