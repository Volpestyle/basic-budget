<!--
  ButtonGroup.svelte
  
  A group of buttons with a morphing selection indicator that smoothly transitions
  between selected states using GSAP animations. The highlight "flows" from one
  button to another, creating a liquid effect.
  
  Usage:
    <ButtonGroup selected={selectedValue} onSelect={handleSelect}>
      <button value="option1">Option 1</button>
      <button value="option2">Option 2</button>
      <button value="option3">Option 3</button>
    </ButtonGroup>
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import { onMount, tick } from 'svelte'
  import { gsap } from 'gsap'
  import { duration, ease, prefersReducedMotion } from '$lib/motion/config'

  interface Props {
    selected?: string
    onSelect?: (value: string) => void
    variant?: 'default' | 'pills'
    children: Snippet
  }

  let { selected = $bindable(), onSelect, variant = 'default', children }: Props = $props()

  let containerRef = $state<HTMLDivElement>()
  let highlightRef = $state<HTMLDivElement>()
  let initialized = $state(false)

  // Initialize highlight position after mount
  onMount(async () => {
    await tick()
    updateHighlightPosition(false)
    initialized = true
  })

  // Update highlight position when selection changes
  $effect(() => {
    if (selected && initialized) {
      updateHighlightPosition(true)
    }
  })

  function updateHighlightPosition(animate: boolean) {
    if (!containerRef || !highlightRef) return

    const selectedButton = containerRef.querySelector(`[data-value="${selected}"]`) as HTMLElement

    if (!selectedButton) {
      // Hide highlight if no selection
      gsap.set(highlightRef, { opacity: 0 })
      return
    }

    const containerRect = containerRef.getBoundingClientRect()
    const buttonRect = selectedButton.getBoundingClientRect()

    const x = buttonRect.left - containerRect.left
    const y = buttonRect.top - containerRect.top
    const width = buttonRect.width
    const height = buttonRect.height

    if (prefersReducedMotion() || !animate) {
      gsap.set(highlightRef, {
        x,
        y,
        width,
        height,
        opacity: 1,
      })
    } else {
      // Liquid morphing animation with elastic ease
      gsap.to(highlightRef, {
        x,
        y,
        width,
        height,
        opacity: 1,
        duration: duration.normal,
        ease: ease.elastic,
      })
    }
  }

  function handleButtonClick(event: Event) {
    const button = (event.target as HTMLElement).closest('button')
    if (!button) return

    const value = button.dataset.value
    if (value) {
      selected = value
      onSelect?.(value)
    }
  }

  const baseStyles = 'relative inline-flex gap-0.5 p-0.5'
  const variantStyles = {
    default: 'bg-cream-200 dark:bg-ink-800 rounded-md',
    pills: 'bg-transparent gap-2',
  }

  const buttonBaseStyles =
    'relative z-10 px-3 py-1.5 text-sm font-mono transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-900 dark:focus-visible:ring-white focus-visible:ring-offset-1'

  const buttonVariantStyles = {
    default: 'rounded',
    pills: 'rounded-full border border-ink-900/10 dark:border-white/10',
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  bind:this={containerRef}
  class="{baseStyles} {variantStyles[variant]}"
  onclick={handleButtonClick}
  role="group"
  aria-label="Button group"
>
  <!-- Morphing highlight indicator -->
  <div
    bind:this={highlightRef}
    class="absolute left-0 top-0 bg-ink-900 dark:bg-white rounded shadow-sm pointer-events-none opacity-0"
    class:rounded-full={variant === 'pills'}
    aria-hidden="true"
  ></div>

  <!-- Enhanced children with data attributes and styling -->
  <div class="relative z-10 flex gap-0.5" class:gap-2={variant === 'pills'}>
    {@render children()}
  </div>
</div>

<style>
  /* Make sure buttons inherit the correct styles */
  :global(.button-group-item) {
    position: relative;
    z-index: 10;
  }

  /* Selected button text color */
  :global(.button-group-item[data-selected='true']) {
    color: var(--color-cream-50);
  }

  :global(.dark .button-group-item[data-selected='true']) {
    color: var(--color-ink-900);
  }
</style>
