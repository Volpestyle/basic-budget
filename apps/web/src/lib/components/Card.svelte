<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  interface Props extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'bordered' | 'glass'
    padding?: 'none' | 'sm' | 'md' | 'lg'
    children: Snippet
  }

  let {
    variant = 'default',
    padding = 'md',
    class: className = '',
    children,
    id,
    role,
    style,
    'aria-label': ariaLabel,
    onclick
  }: Props = $props()

  const variants = {
    default: 'bg-cream-50 border border-ink-900/5 dark:bg-ink-800 dark:border-white/5',
    bordered: 'bg-transparent border border-ink-900/10 dark:border-white/10',
    glass: 'bg-white/5 backdrop-blur-xl border border-white/10'
  }

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }
</script>

<div
  id={id}
  role={role}
  style={style}
  aria-label={ariaLabel}
  class="rounded-lg {variants[variant]} {paddings[padding]} {className}"
  onclick={onclick}
>
  {@render children()}
</div>
