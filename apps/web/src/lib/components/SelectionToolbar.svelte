<!--
  SelectionToolbar.svelte
  
  A contextual toolbar that grows from the bottom when items are selected.
  Shrinks away when selection is cleared. Demonstrates liquid merge behavior.
  
  Usage:
    <SelectionToolbar
      selectedCount={selectedItems.length}
      onDelete={handleDelete}
      onExport={handleExport}
      onClear={clearSelection}
    />
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import { gsap } from 'gsap'
  import { duration, ease, prefersReducedMotion } from '$lib/motion/config'

  interface Props {
    selectedCount: number
    position?: 'bottom' | 'top'
    children?: Snippet<[number]>
  }

  let { selectedCount, position = 'bottom', children }: Props = $props()

  let toolbarRef = $state<HTMLDivElement>()
  let isVisible = $state(false)

  // Show/hide toolbar based on selection count
  $effect(() => {
    const shouldShow = selectedCount > 0

    if (shouldShow !== isVisible) {
      isVisible = shouldShow
      if (shouldShow) {
        animateIn()
      } else {
        animateOut()
      }
    }
  })

  function animateIn() {
    if (prefersReducedMotion() || !toolbarRef) return

    const yStart = position === 'bottom' ? 100 : -100

    gsap.fromTo(
      toolbarRef,
      {
        y: yStart,
        opacity: 0,
        scale: 0.9,
      },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: duration.slow,
        ease: ease.elastic,
      }
    )

    // Stagger child buttons
    const buttons = toolbarRef.querySelectorAll('button')
    gsap.fromTo(
      buttons,
      { opacity: 0, y: 10 },
      {
        opacity: 1,
        y: 0,
        duration: duration.normal,
        ease: ease.default,
        stagger: 0.05,
        delay: 0.1,
      }
    )
  }

  function animateOut() {
    if (prefersReducedMotion() || !toolbarRef) return

    const yEnd = position === 'bottom' ? 100 : -100

    gsap.to(toolbarRef, {
      y: yEnd,
      opacity: 0,
      scale: 0.9,
      duration: duration.normal,
      ease: ease.exit,
    })
  }

  const positionClasses = {
    bottom: 'bottom-20 md:bottom-4',
    top: 'top-4',
  }
</script>

{#if isVisible}
  <div
    bind:this={toolbarRef}
    class="fixed {positionClasses[
      position
    ]} left-1/2 -translate-x-1/2 z-40 px-4 py-3 bg-ink-900 dark:bg-white text-cream-50 dark:text-ink-900 rounded-lg shadow-2xl border border-white/10 dark:border-ink-900/10"
  >
    <div class="flex items-center gap-3">
      <span class="text-sm font-mono mr-2">
        {selectedCount}
        {selectedCount === 1 ? 'item' : 'items'} selected
      </span>

      {#if children}
        {@render children(selectedCount)}
      {/if}
    </div>
  </div>
{/if}
