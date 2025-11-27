<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'

  interface Props extends HTMLInputAttributes {
    label?: string
    error?: string
    value?: string
  }

  let { label, error, id, value = $bindable(''), class: className = '', ...rest }: Props = $props()

  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 9)}`
</script>

<div class="space-y-1.5">
  {#if label}
    <label for={inputId} class="block text-xs uppercase tracking-wider text-ink-900/60 dark:text-white/60">
      {label}
    </label>
  {/if}
  <input
    {id}
    bind:value
    class="w-full px-3 py-2 bg-cream-100 dark:bg-ink-700 border text-ink-900 dark:text-white placeholder-ink-900/30 dark:placeholder-white/30
           text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ink-900/20 dark:focus:ring-white/20
           {error ? 'border-negative' : 'border-ink-900/10 dark:border-white/10 hover:border-ink-900/20 dark:hover:border-white/20'}
           {className}"
    {...rest}
  />
  {#if error}
    <p class="text-xs text-negative">{error}</p>
  {/if}
</div>
