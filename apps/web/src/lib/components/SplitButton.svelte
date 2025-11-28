<!--
  SplitButton.svelte
  
  A button that morphs and splits into multiple options when clicked.
  Demonstrates liquid merge/split behavior.
  
  Usage:
    <SplitButton
      primary={{ label: 'Save', action: handleSave }}
      options={[
        { label: 'Save & Close', action: handleSaveClose },
        { label: 'Save as Draft', action: handleSaveDraft }
      ]}
    />
-->
<script lang="ts">
  import { gsap } from 'gsap'
  import { duration, ease, stagger, prefersReducedMotion } from '$lib/motion/config'
  import { liquidButton } from '$lib/motion/actions'

  interface ButtonOption {
    label: string
    action: () => void
  }

  interface Props {
    primary: ButtonOption
    options: ButtonOption[]
    variant?: 'primary' | 'secondary'
  }

  let { primary, options, variant = 'primary' }: Props = $props()

  let isExpanded = $state(false)
  let primaryButtonRef = $state<HTMLButtonElement | null>(null)
  let optionsContainerRef = $state<HTMLDivElement | null>(null)

  function toggleExpanded() {
    isExpanded = !isExpanded

    if (isExpanded) {
      animateExpand()
    } else {
      animateCollapse()
    }
  }

  function animateExpand() {
    if (prefersReducedMotion() || !optionsContainerRef || !primaryButtonRef) return

    const buttons = optionsContainerRef.querySelectorAll('.split-option')
    const primaryButton = primaryButtonRef

    const tl = gsap.timeline()

    // Primary button slides left and shrinks slightly
    tl.to(
      primaryButton,
      {
        x: -10,
        scale: 0.95,
        duration: duration.fast,
        ease: ease.default,
      },
      0
    )

    // Options emerge and spread out
    tl.fromTo(
      buttons,
      {
        opacity: 0,
        scale: 0.8,
        x: -20,
      },
      {
        opacity: 1,
        scale: 1,
        x: 0,
        duration: duration.normal,
        ease: ease.elastic,
        stagger: stagger.xs,
      },
      0.1
    )
  }

  function animateCollapse() {
    if (prefersReducedMotion() || !optionsContainerRef || !primaryButtonRef) return

    const buttons = optionsContainerRef.querySelectorAll('.split-option')
    const primaryButton = primaryButtonRef

    const tl = gsap.timeline()

    // Options shrink back
    tl.to(
      buttons,
      {
        opacity: 0,
        scale: 0.8,
        x: -20,
        duration: duration.fast,
        ease: ease.exit,
        stagger: stagger.xs,
      },
      0
    )

    // Primary button returns to position
    tl.to(
      primaryButton,
      {
        x: 0,
        scale: 1,
        duration: duration.normal,
        ease: ease.elastic,
      },
      0.05
    )
  }

  function handleOptionClick(option: ButtonOption) {
    option.action()
    isExpanded = false
    animateCollapse()
  }

  const variantStyles = {
    primary:
      'bg-ink-900 text-cream-50 hover:bg-ink-700 dark:bg-white dark:text-ink-900 dark:hover:bg-cream-200',
    secondary:
      'bg-cream-300 text-ink-900 hover:bg-cream-400 dark:bg-ink-700 dark:text-white dark:hover:bg-ink-800',
  }
</script>

<div class="relative inline-flex items-center gap-2">
  <!-- Primary button -->
  <button
    bind:this={primaryButtonRef}
    use:liquidButton
    onclick={primary.action}
    class="px-4 py-2 text-sm font-mono rounded focus:outline-none focus-visible:ring-2 transition-colors {variantStyles[
      variant
    ]}"
  >
    {primary.label}
  </button>

  <!-- Split toggle button -->
  <button
    use:liquidButton
    onclick={toggleExpanded}
    class="px-2 py-2 text-sm font-mono rounded focus:outline-none focus-visible:ring-2 transition-colors {variantStyles[
      variant
    ]}"
    aria-label="More options"
    aria-expanded={isExpanded}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-4 w-4 transition-transform {isExpanded ? 'rotate-180' : ''}"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  <!-- Expanded options -->
  {#if isExpanded}
    <div
      bind:this={optionsContainerRef}
      class="absolute left-0 top-full mt-2 flex flex-col gap-1 min-w-full"
    >
      {#each options as option}
        <button
          use:liquidButton
          onclick={() => handleOptionClick(option)}
          class="split-option px-4 py-2 text-sm font-mono rounded text-left focus:outline-none focus-visible:ring-2 transition-colors whitespace-nowrap {variantStyles[
            variant
          ]}"
        >
          {option.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
