<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    children: Snippet
  }

  let {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    class: className = '',
    children,
    ...rest
  }: Props = $props()

  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:
      'bg-primary-500 text-background hover:bg-primary-400 focus:ring-primary-500 shadow-lg shadow-primary-500/20',
    secondary:
      'bg-secondary-500 text-white hover:bg-secondary-400 focus:ring-secondary-500 shadow-lg shadow-secondary-500/20',
    ghost:
      'bg-transparent text-gray-300 hover:bg-white/10 focus:ring-white/20 border border-white/10',
    danger: 'bg-red-500 text-white hover:bg-red-400 focus:ring-red-500 shadow-lg shadow-red-500/20'
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }
</script>

<button
  class="{baseStyles} {variants[variant]} {sizes[size]} {className}"
  disabled={disabled || loading}
  {...rest}
>
  {#if loading}
    <svg
      class="animate-spin -ml-1 mr-2 h-4 w-4"
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
