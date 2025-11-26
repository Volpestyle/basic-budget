<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import '../app.css'
  import { authStore, isAuthenticated, currentUser } from '$stores'
  import Sidebar from '$components/Sidebar.svelte'
  import BottomNav from '$components/BottomNav.svelte'
  import Spinner from '$components/Spinner.svelte'

  interface Props {
    children: import('svelte').Snippet
  }

  let { children }: Props = $props()

  let initialized = $state(false)

  // Public routes that don't require authentication
  const publicRoutes = ['/auth']

  function isPublicRoute(pathname: string): boolean {
    return publicRoutes.some((route) => pathname.startsWith(route))
  }

  onMount(() => {
    authStore.initialize()

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
</script>

{#if !initialized}
  <!-- Loading state -->
  <div class="min-h-screen flex items-center justify-center">
    <Spinner size="lg" />
  </div>
{:else if isPublicRoute($page.url.pathname)}
  <!-- Public routes (auth pages) -->
  <div class="min-h-screen">
    {@render children()}
  </div>
{:else if $isAuthenticated}
  <!-- Authenticated app shell -->
  <div class="min-h-screen">
    <!-- Desktop sidebar -->
    <div class="hidden md:block">
      <Sidebar>
        {#snippet user()}
          {#if $currentUser}
            <div class="flex items-center gap-3">
              {#if $currentUser.avatar_url}
                <img
                  src={$currentUser.avatar_url}
                  alt={$currentUser.display_name}
                  class="w-10 h-10 rounded-full"
                />
              {:else}
                <div class="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                  <span class="text-primary-400 font-semibold">
                    {$currentUser.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              {/if}
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-white truncate">{$currentUser.display_name}</p>
                <button
                  type="button"
                  class="text-xs text-gray-400 hover:text-white transition-colors"
                  onclick={handleLogout}
                >
                  Sign out
                </button>
              </div>
            </div>
          {/if}
        {/snippet}
      </Sidebar>
    </div>

    <!-- Main content area -->
    <main class="md:ml-64 pb-20 md:pb-0">
      {@render children()}
    </main>

    <!-- Mobile bottom nav -->
    <BottomNav />
  </div>
{:else}
  <!-- Fallback (should redirect to auth) -->
  <div class="min-h-screen flex items-center justify-center">
    <Spinner size="lg" />
  </div>
{/if}
