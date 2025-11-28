<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { gsap } from 'gsap'
  import { authStore, isAuthenticated } from '$stores'
  import { authApi } from '$api'
  import Spinner from '$components/Spinner.svelte'
  import { duration, ease, stagger as staggerConfig, prefersReducedMotion } from '$lib/motion/config'

  let loading = $state(false)
  let error = $state<string | null>(null)
  let googleButtonContainer: HTMLDivElement
  let containerRef = $state<HTMLDivElement>()

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

  onMount(() => {
    // Redirect if already authenticated
    const unsubscribe = isAuthenticated.subscribe((authenticated) => {
      if (authenticated) {
        goto('/')
      }
    })

    // Initialize Google Identity Services and render button
    // Using renderButton instead of prompt() for mobile compatibility
    if (typeof google !== 'undefined' && GOOGLE_CLIENT_ID) {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        auto_select: false,
        cancel_on_tap_outside: true
      })

      // Render the official Google button - works reliably on mobile
      google.accounts.id.renderButton(googleButtonContainer, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: 320
      })
    }

    // Animate page entrance
    if (!prefersReducedMotion() && containerRef) {
      const logoSection = containerRef.querySelector('.text-center')
      const signInCard = containerRef.querySelector('.bg-cream-50')
      const featuresGrid = containerRef.querySelector('.grid.grid-cols-2')

      const tl = gsap.timeline()

      if (logoSection) {
        tl.fromTo(
          logoSection,
          { opacity: 0, y: 20, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: duration.normal,
            ease: ease.elastic
          },
          0
        )
      }

      if (signInCard) {
        tl.fromTo(
          signInCard,
          { opacity: 0, y: 20, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: duration.normal,
            ease: ease.elastic
          },
          0.1
        )
      }

      if (featuresGrid) {
        const features = featuresGrid.querySelectorAll(':scope > div')
        tl.fromTo(
          features,
          { opacity: 0, y: 15, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: duration.normal,
            ease: ease.elastic,
            stagger: staggerConfig.sm
          },
          0.2
        )
      }
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
</script>

<svelte:head>
  <title>Sign In - Basic Budget</title>
</svelte:head>

<div class="min-h-screen flex flex-col items-center justify-center p-5">
  <div bind:this={containerRef} class="w-full max-w-sm">
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

      {#if loading}
        <div class="flex items-center justify-center gap-2 py-3">
          <Spinner size="sm" />
          <span class="text-sm text-ink-900 dark:text-white">Signing in...</span>
        </div>
      {:else}
        <!-- Google's official button - works on mobile unlike prompt() -->
        <div bind:this={googleButtonContainer} class="flex justify-center"></div>
      {/if}

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
