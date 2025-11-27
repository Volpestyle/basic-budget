<!--
  LiquidNav.svelte
  
  Navigation component with a morphing highlight that smoothly transitions
  between active items. The highlight "flows" from one nav item to another.
  
  Usage:
    <LiquidNav items={navItems} activeHref={$page.url.pathname} orientation="vertical" />
    
  Or with custom rendering:
    <LiquidNav items={navItems} activeHref={$page.url.pathname}>
      {#snippet item(navItem, isActive)}
        <a href={navItem.href} class:active={isActive}>
          {navItem.label}
        </a>
      {/snippet}
    </LiquidNav>
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import { onMount, tick } from 'svelte'
  import { gsap } from 'gsap'
  import { duration, ease, prefersReducedMotion } from '$lib/motion/config'

  interface NavItem {
    href: string
    label: string
    icon?: string | Snippet
  }

  interface Props {
    items: NavItem[]
    activeHref: string
    orientation?: 'horizontal' | 'vertical'
    variant?: 'default' | 'pills' | 'underline'
    item?: Snippet<[NavItem, boolean]>
  }

  let { items, activeHref, orientation = 'vertical', variant = 'default', item }: Props = $props()

  let containerRef = $state<HTMLElement>()
  let highlightRef = $state<HTMLDivElement>()
  let initialized = $state(false)

  // Initialize highlight position after mount
  onMount(async () => {
    await tick()
    updateHighlightPosition(false)
    initialized = true
  })

  // Update highlight position when active href changes
  $effect(() => {
    if (activeHref && initialized) {
      updateHighlightPosition(true)
    }
  })

  function updateHighlightPosition(animate: boolean) {
    if (!containerRef || !highlightRef) return

    const activeLink = containerRef.querySelector(`[data-href="${activeHref}"]`) as HTMLElement

    if (!activeLink) {
      gsap.set(highlightRef, { opacity: 0 })
      return
    }

    const containerRect = containerRef.getBoundingClientRect()
    const linkRect = activeLink.getBoundingClientRect()

    const x = linkRect.left - containerRect.left
    const y = linkRect.top - containerRect.top
    const width = linkRect.width
    const height = linkRect.height

    if (prefersReducedMotion() || !animate) {
      gsap.set(highlightRef, {
        x,
        y,
        width,
        height,
        opacity: 1,
      })
    } else {
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

  function isActive(href: string): boolean {
    if (href === '/') return activeHref === '/'
    return activeHref.startsWith(href)
  }

  const containerClasses = $derived(
    orientation === 'horizontal' ? 'flex items-center gap-1' : 'flex flex-col gap-0.5'
  )

  const highlightClasses = $derived({
    default: 'bg-ink-900 dark:bg-white rounded',
    pills: 'bg-ink-900 dark:bg-white rounded-full',
    underline: 'bg-ink-900 dark:bg-white h-0.5',
  })
</script>

<nav bind:this={containerRef} class="relative {containerClasses}" aria-label="Main navigation">
  <!-- Morphing highlight indicator -->
  <div
    bind:this={highlightRef}
    class="absolute left-0 top-0 pointer-events-none opacity-0 transition-colors {highlightClasses[
      variant
    ]}"
    aria-hidden="true"
  ></div>

  <!-- Navigation items -->
  {#each items as navItem}
    {@const active = isActive(navItem.href)}
    {#if item}
      <div data-href={navItem.href} class="relative z-10">
        {@render item(navItem, active)}
      </div>
    {:else}
      <a
        href={navItem.href}
        data-href={navItem.href}
        class="relative z-10 flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-150
               {active
          ? 'text-cream-50 dark:text-ink-900'
          : 'text-ink-900/60 hover:text-ink-900 dark:text-white/60 dark:hover:text-white'}"
      >
        {#if typeof navItem.icon === 'string'}
          <span class="w-4 h-4">{navItem.icon}</span>
        {:else if navItem.icon}
          {@render navItem.icon()}
        {/if}
        <span>{navItem.label}</span>
      </a>
    {/if}
  {/each}
</nav>
