<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { authStore, isAuthenticated } from '$stores'
  import { authApi } from '$api'
  import Button from '$components/Button.svelte'
  import Spinner from '$components/Spinner.svelte'

  let loading = $state(false)
  let error = $state<string | null>(null)

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

  onMount(() => {
    // Redirect if already authenticated
    const unsubscribe = isAuthenticated.subscribe((authenticated) => {
      if (authenticated) {
        goto('/')
      }
    })

    // Initialize Google Identity Services
    if (typeof google !== 'undefined' && GOOGLE_CLIENT_ID) {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        auto_select: false,
        cancel_on_tap_outside: true
      })
    }

    return unsubscribe
  })

  async function handleGoogleCallback(response: google.accounts.id.CredentialResponse) {
    loading = true
    error = null

    try {
      const result = await authApi.loginWithGoogle(response.credential)
      authStore.setAuth(result.token, result.user)
      goto('/')
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to sign in'
      loading = false
    }
  }

  function handleGoogleSignIn() {
    if (typeof google !== 'undefined' && GOOGLE_CLIENT_ID) {
      google.accounts.id.prompt()
    } else {
      error = 'Google Sign-In is not configured'
    }
  }
</script>

<svelte:head>
  <title>Sign In - Basic Budget</title>
</svelte:head>

<div class="min-h-screen flex flex-col items-center justify-center p-5">
  <div class="w-full max-w-sm">
    <!-- Logo and tagline -->
    <div class="text-center mb-10">
      <h1 class="text-2xl font-display font-bold text-ink-900 dark:text-white mb-2">basic budget</h1>
      <p class="text-sm text-ink-900/60 dark:text-white/60">Stay on top of your month.</p>
    </div>

    <!-- Sign in card -->
    <div class="bg-cream-50 dark:bg-ink-800 border border-ink-900/5 dark:border-white/5 rounded-lg p-6">
      <h2 class="text-base font-display font-bold text-ink-900 dark:text-white text-center mb-5">Welcome</h2>

      {#if error}
        <div class="mb-5 p-3 bg-negative/10 border border-negative/20">
          <p class="text-xs text-negative">{error}</p>
        </div>
      {/if}

      <Button
        variant="ghost"
        size="lg"
        class="w-full justify-center gap-2"
        onclick={handleGoogleSignIn}
        disabled={loading}
      >
        {#if loading}
          <Spinner size="sm" />
          <span>Signing in...</span>
        {:else}
          <svg class="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Continue with Google</span>
        {/if}
      </Button>

      <p class="mt-5 text-center text-[10px] text-ink-900/40 dark:text-white/40">
        By signing in, you agree to our terms of service and privacy policy.
      </p>
    </div>

    <!-- Features -->
    <div class="mt-10 grid grid-cols-2 gap-3 text-center">
      <div class="p-3">
        <div class="text-ink-900/40 dark:text-white/40 mb-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p class="text-xs text-ink-900/60 dark:text-white/60">Track spending</p>
      </div>
      <div class="p-3">
        <div class="text-ink-900/40 dark:text-white/40 mb-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        </div>
        <p class="text-xs text-ink-900/60 dark:text-white/60">Budget by category</p>
      </div>
      <div class="p-3">
        <div class="text-ink-900/40 dark:text-white/40 mb-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <p class="text-xs text-ink-900/60 dark:text-white/60">Recurring payments</p>
      </div>
      <div class="p-3">
        <div class="text-ink-900/40 dark:text-white/40 mb-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <p class="text-xs text-ink-900/60 dark:text-white/60">Works offline</p>
      </div>
    </div>
  </div>
</div>
