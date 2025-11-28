<!--
  LiquidPanel.svelte
  
  A reusable panel component with liquid entrance animations.
  Panels fade and slide in smoothly, with optional morph capability
  for expanding/collapsing states.
  
  Usage:
    <LiquidPanel enterFrom="bottom" delay={0.1}>
      <h3>Panel Title</h3>
      <p>Panel content...</p>
    </LiquidPanel>
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { liquidEnter } from '$lib/motion/actions'

  interface Props extends HTMLAttributes<HTMLDivElement> {
    enterFrom?: 'top' | 'bottom' | 'left' | 'right' | 'center'
    delay?: number
    animate?: boolean
    children: Snippet
  }

  let {
    enterFrom = 'bottom',
    delay = 0,
    animate = true,
    class: className = '',
    children,
    id,
    role,
    style,
    ariaLabel,
    onclick
  }: Props = $props()

  // Calculate entrance position based on direction
  const entranceConfig = {
    top: { y: -20 },
    bottom: { y: 20 },
    left: { y: 0, x: -20 },
    right: { y: 0, x: 20 },
    center: { y: 0, scale: 0.95 },
  }

  const config = $derived(entranceConfig[enterFrom] || entranceConfig.bottom)
</script>

{#if animate}
  <div
    use:liquidEnter={{
      y: config.y || 20,
      scale: config.scale,
      delay,
    }}
    id={id}
    role={role}
    style={style}
    aria-label={ariaLabel}
    class="bg-cream-50 dark:bg-ink-900 border border-ink-900/10 dark:border-white/10 rounded-lg p-5 {className}"
    onclick={onclick}
  >
    {@render children()}
  </div>
{:else}
  <div
    id={id}
    role={role}
    style={style}
    aria-label={ariaLabel}
    class="bg-cream-50 dark:bg-ink-900 border border-ink-900/10 dark:border-white/10 rounded-lg p-5 {className}"
    onclick={onclick}
  >
    {@render children()}
  </div>
{/if}
