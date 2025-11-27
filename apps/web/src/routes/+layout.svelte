<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto, beforeNavigate, afterNavigate } from '$app/navigation'
  import '../app.css'
  import { authStore, isAuthenticated, currentUser } from '$stores'
  import Sidebar from '$components/Sidebar.svelte'
  import BottomNav from '$components/BottomNav.svelte'
  import Spinner from '$components/Spinner.svelte'
  import {
    captureTransitionElements,
    applyTransitionElements,
  } from '$lib/animations/pageTransition'

  interface Props {
    children: import('svelte').Snippet
  }

  let { children }: Props = $props()

  let initialized = $state(false)
  let darkMode = $state(true)
  let savedTransitionElements: Map<string, DOMRect> | null = null
  let pageKey = $state($page.url.pathname)

  // Public routes that don't require authentication
  const publicRoutes = ['/auth']

  function isPublicRoute(pathname: string): boolean {
    return publicRoutes.some((route) => pathname.startsWith(route))
  }

  function toggleDarkMode() {
    darkMode = !darkMode
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('darkMode', darkMode ? 'true' : 'false')
    }
  }

  // Initialize auth early on the client so API calls have a token on first render
  if (typeof window !== 'undefined') {
    authStore.initialize()
  }

  onMount(() => {
    // Initialize dark mode from localStorage or system preference
    const stored = localStorage.getItem('darkMode')
    if (stored !== null) {
      darkMode = stored === 'true'
    } else {
      darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    const unsubscribe = authStore.subscribe((state) => {
      if (state.initialized) {
        initialized = true

        // Redirect to auth if not authenticated and on protected route
        if (!state.token && !isPublicRoute($page.url.pathname)) {
          goto('/auth')
        }

        // Redirect to home if authenticated and on auth page
        if (state.token && $page.url.pathname === '/auth') {
          goto('/')
        }
      }
    })

    return unsubscribe
  })

  function handleLogout() {
    authStore.logout()
    goto('/auth')
  }

  // Handle page transitions with FLIP technique
  beforeNavigate(() => {
    // Capture positions of elements with transition keys before navigation
    savedTransitionElements = captureTransitionElements()
  })

  afterNavigate(() => {
    // Update page key to trigger re-render
    pageKey = $page.url.pathname

    // Apply FLIP transitions after navigation
    if (savedTransitionElements) {
      requestAnimationFrame(() => {
        applyTransitionElements(savedTransitionElements!)
        savedTransitionElements = null
      })
    }
  })
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
</svelte:head>

<div class={darkMode ? 'dark' : ''}>
  {#if !initialized}
    <!-- Loading state -->
    <div class="min-h-screen bg-cream-100 dark:bg-ink-900 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  {:else if isPublicRoute($page.url.pathname)}
    <!-- Public routes (auth pages) -->
    <div class="min-h-screen bg-cream-100 dark:bg-ink-900">
      {@render children()}
    </div>
  {:else if $isAuthenticated}
    <!-- Authenticated app shell -->
    <div class="min-h-screen bg-cream-100 dark:bg-ink-900">
      <!-- Desktop sidebar -->
      <div class="hidden md:block">
        <Sidebar>
          {#snippet user()}
            {#if $currentUser}
              <div class="flex items-center gap-2">
                {#if $currentUser.avatar_url}
                  <img
                    src={$currentUser.avatar_url}
                    alt={$currentUser.display_name}
                    class="w-8 h-8 rounded-full"
                  />
                {:else}
                  <div
                    class="w-8 h-8 rounded-full bg-ink-900/10 dark:bg-white/10 flex items-center justify-center"
                  >
                    <span class="text-xs text-ink-900 dark:text-white">
                      {$currentUser.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                {/if}
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-ink-900 dark:text-white truncate">
                    {$currentUser.display_name}
                  </p>
                  <button
                    type="button"
                    class="text-[10px] text-ink-900/40 hover:text-ink-900 dark:text-white/40 dark:hover:text-white transition-colors"
                    onclick={handleLogout}
                  >
                    Sign out
                  </button>
                </div>
                <button
                  type="button"
                  onclick={toggleDarkMode}
                  class="p-1 text-ink-900/40 hover:text-ink-900 dark:text-white/40 dark:hover:text-white transition-colors"
                  aria-label="Toggle dark mode"
                >
                  {#if darkMode}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  {:else}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                      />
                    </svg>
                  {/if}
                </button>
              </div>
            {/if}
          {/snippet}
        </Sidebar>
      </div>

      <!-- Main content area with page transition wrapper -->
      <main class="md:ml-56 pb-16 md:pb-0">
        {#key pageKey}
          <div class="page-content">
            {@render children()}
          </div>
        {/key}
      </main>

      <!-- Mobile bottom nav -->
      <BottomNav />
    </div>
  {:else}
    <!-- Fallback (should redirect to auth) -->
    <div class="min-h-screen bg-cream-100 dark:bg-ink-900 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  {/if}
</div>
