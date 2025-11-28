<!--
  LiquidDrawer.svelte
  
  A side panel drawer that slides in with liquid motion.
  Children stagger in with coordinated animations.
  
  Usage:
    <LiquidDrawer open={isOpen} onClose={handleClose} side="right" title="Options">
      <div>Drawer content...</div>
    </LiquidDrawer>
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import { gsap } from 'gsap'
  import { duration, ease, stagger, prefersReducedMotion } from '$lib/motion/config'

  interface Props {
    open: boolean
    onClose: () => void
    side?: 'left' | 'right'
    title?: string
    width?: string
    children: Snippet
  }

  let { open, onClose, side = 'right', title, width = '320px', children }: Props = $props()

  let backdropRef = $state<HTMLDivElement>()
  let drawerRef = $state<HTMLDivElement>()
  let contentRef = $state<HTMLDivElement>()
  let animating = $state(false)

  // Animate drawer open/close
  $effect(() => {
    if (!backdropRef || !drawerRef || !contentRef) return

    if (open) {
      animateIn()
    } else if (animating) {
      animateOut()
    }
  })

  function animateIn() {
    if (prefersReducedMotion()) {
      gsap.set(backdropRef, { opacity: 1 })
      gsap.set(drawerRef, { x: 0 })
      gsap.set(contentRef.children, { opacity: 1, y: 0 })
      animating = true
      return
    }

    animating = true

    const tl = gsap.timeline()

    // Backdrop fades in
    tl.fromTo(
      backdropRef,
      { opacity: 0 },
      {
        opacity: 1,
        duration: duration.normal,
        ease: ease.default,
      },
      0
    )

    // Drawer slides in from the side
    const xStart = side === 'left' ? '-100%' : '100%'
    tl.fromTo(
      drawerRef,
      { x: xStart },
      {
        x: 0,
        duration: duration.slow,
        ease: ease.elastic,
      },
      0.05
    )

    // Content children stagger in
    tl.fromTo(
      contentRef.children,
      { opacity: 0, y: 15 },
      {
        opacity: 1,
        y: 0,
        duration: duration.normal,
        ease: ease.default,
        stagger: stagger.sm,
      },
      0.3
    )
  }

  function animateOut() {
    if (prefersReducedMotion()) {
      gsap.set(backdropRef, { opacity: 0 })
      gsap.set(drawerRef, { x: side === 'left' ? '-100%' : '100%' })
      animating = false
      return
    }

    const tl = gsap.timeline({
      onComplete: () => {
        animating = false
      },
    })

    // Drawer slides out
    const xEnd = side === 'left' ? '-100%' : '100%'
    tl.to(
      drawerRef,
      {
        x: xEnd,
        duration: duration.normal,
        ease: ease.exit,
      },
      0
    )

    // Backdrop fades out
    tl.to(
      backdropRef,
      {
        opacity: 0,
        duration: duration.normal,
        ease: ease.exit,
      },
      0.1
    )
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      onClose()
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open || animating}
  <div
    bind:this={backdropRef}
    class="fixed inset-0 z-50 bg-ink-900/40 dark:bg-black/60 backdrop-blur-sm"
    onclick={handleBackdropClick}
    role="presentation"
  >
    <div
      bind:this={drawerRef}
      class="absolute top-0 {side === 'left'
        ? 'left-0'
        : 'right-0'} h-full bg-cream-50 dark:bg-ink-900 border-{side === 'left'
        ? 'r'
        : 'l'} border-ink-900/10 dark:border-white/10 shadow-2xl overflow-y-auto"
      style="width: {width}"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'drawer-title' : undefined}
    >
      {#if title}
        <div
          class="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-ink-900/10 dark:border-white/10 bg-cream-50/80 dark:bg-ink-900/80 backdrop-blur-sm z-10"
        >
          <h2
            id="drawer-title"
            class="text-base font-display font-bold text-ink-900 dark:text-white"
          >
            {title}
          </h2>
          <button
            type="button"
            class="p-1 text-ink-900/40 hover:text-ink-900 dark:text-white/40 dark:hover:text-white transition-colors"
            onclick={onClose}
            aria-label="Close drawer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      {/if}

      <div bind:this={contentRef} class="p-5 space-y-4">
        {@render children()}
      </div>
    </div>
  </div>
{/if}
