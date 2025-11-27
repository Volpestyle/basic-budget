<script lang="ts">
  import { page } from '$app/stores'
  import { onMount, tick } from 'svelte'
  import { gsap } from 'gsap'
  import { duration, ease, prefersReducedMotion } from '$lib/motion/config'

  interface NavItem {
    href: string
    label: string
    icon: string
  }

  let navContainerRef = $state<HTMLElement>()
  let highlightRef = $state<HTMLDivElement>()
  let initialized = $state(false)

  const navItems: NavItem[] = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/transactions', label: 'Transactions', icon: 'receipt' },
    { href: '/budgets', label: 'Budgets', icon: 'pie-chart' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
  ]

  function isActive(href: string, pathname: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  // Initialize highlight position after mount
  onMount(async () => {
    await tick()
    updateHighlightPosition(false)
    initialized = true
  })

  // Update highlight when page changes
  $effect(() => {
    if ($page.url.pathname && initialized) {
      updateHighlightPosition(true)
    }
  })

  function updateHighlightPosition(animate: boolean) {
    if (!navContainerRef || !highlightRef) return

    const activeLink = navContainerRef.querySelector('.nav-item-active') as HTMLElement

    if (!activeLink) {
      gsap.set(highlightRef, { opacity: 0 })
      return
    }

    const containerRect = navContainerRef.getBoundingClientRect()
    const linkRect = activeLink.getBoundingClientRect()

    const x = linkRect.left - containerRect.left
    const width = linkRect.width

    if (prefersReducedMotion() || !animate) {
      gsap.set(highlightRef, {
        x,
        width,
        opacity: 1,
      })
    } else {
      gsap.to(highlightRef, {
        x,
        width,
        opacity: 1,
        duration: duration.normal,
        ease: ease.elastic,
      })
    }
  }
</script>

<nav
  class="fixed bottom-0 left-0 right-0 bg-cream-50 dark:bg-ink-900 border-t border-ink-900/5 dark:border-white/5 z-40 md:hidden safe-area-bottom"
>
  <div bind:this={navContainerRef} class="relative flex items-center justify-around py-1.5">
    <!-- Liquid morphing highlight (subtle glow under active item) -->
    <div
      bind:this={highlightRef}
      class="absolute bottom-0 h-0.5 bg-ink-900 dark:bg-white opacity-0 transition-colors rounded-full"
      aria-hidden="true"
    ></div>

    {#each navItems as item}
      {@const active = isActive(item.href, $page.url.pathname)}
      <a
        href={item.href}
        class="flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors duration-150 {active
          ? 'nav-item-active text-ink-900 dark:text-white'
          : 'text-ink-900/40 dark:text-white/40'}"
      >
        <span class="w-5 h-5">
          {#if item.icon === 'home'}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          {:else if item.icon === 'receipt'}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          {:else if item.icon === 'pie-chart'}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
              />
            </svg>
          {:else if item.icon === 'settings'}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          {/if}
        </span>
        <span class="text-[10px]">{item.label}</span>
      </a>
    {/each}
  </div>
</nav>

<style>
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
</style>
