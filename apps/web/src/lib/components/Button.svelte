<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'
  import { liquidButton } from '$lib/motion/actions'

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    animate?: boolean
    children: Snippet
  }

  let {
    variant = 'primary',
    size = 'md',
    loading = false,
    animate = true,
    disabled,
    class: className = '',
    children,
    ...rest
  }: Props = $props()

  const baseStyles =
    'inline-flex items-center justify-center font-mono transition-colors duration-150 focus:outline-none focus-visible:ring-2 disabled:opacity-40 disabled:cursor-not-allowed'

  const variants = {
    primary:
      'bg-ink-900 text-cream-50 hover:bg-ink-700 dark:bg-white dark:text-ink-900 dark:hover:bg-cream-200 focus-visible:ring-ink-900 dark:focus-visible:ring-white',
    secondary:
      'bg-cream-300 text-ink-900 hover:bg-cream-400 dark:bg-ink-700 dark:text-white dark:hover:bg-ink-800 focus-visible:ring-cream-400 dark:focus-visible:ring-ink-700',
    ghost:
      'bg-transparent text-ink-900 hover:bg-ink-900/5 dark:text-white dark:hover:bg-white/5 border border-ink-900/10 dark:border-white/10',
    danger: 'bg-negative text-white hover:bg-negative/90 focus-visible:ring-negative',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-sm',
  }
</script>

{#if animate}
  <button
    use:liquidButton
    class="{baseStyles} {variants[variant]} {sizes[size]} {className}"
    disabled={disabled || loading}
    {...rest}
  >
    {#if loading}
      <svg
        class="animate-spin -ml-1 mr-2 h-3 w-3"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    {/if}
    {@render children()}
  </button>
{:else}
  <button
    class="{baseStyles} {variants[variant]} {sizes[size]} {className}"
    disabled={disabled || loading}
    {...rest}
  >
    {#if loading}
      <svg
        class="animate-spin -ml-1 mr-2 h-3 w-3"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    {/if}
    {@render children()}
  </button>
{/if}
