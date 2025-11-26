<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  interface Props extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass' | 'bordered'
    padding?: 'none' | 'sm' | 'md' | 'lg'
    children: Snippet
  }

  let {
    variant = 'default',
    padding = 'md',
    class: className = '',
    children,
    ...rest
  }: Props = $props()

  const variants = {
    default: 'bg-surface-800 border border-white/5',
    glass: 'glass',
    bordered: 'bg-transparent border border-white/10'
  }

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }
</script>

<div class="rounded-xl {variants[variant]} {paddings[padding]} {className}" {...rest}>
  {@render children()}
</div>
