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
    <label for={inputId} class="block text-sm font-medium text-gray-300">
      {label}
    </label>
  {/if}
  <input
    {id}
    bind:value
    class="w-full px-4 py-2.5 bg-surface-800 border rounded-lg text-white placeholder-gray-500
           transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50
           {error ? 'border-red-500' : 'border-white/10 hover:border-white/20'}
           {className}"
    {...rest}
  />
  {#if error}
    <p class="text-sm text-red-400">{error}</p>
  {/if}
</div>
