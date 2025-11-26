<script lang="ts">
  import type { HTMLSelectAttributes } from 'svelte/elements'

  interface Option {
    value: string
    label: string
    disabled?: boolean
  }

  interface Props extends HTMLSelectAttributes {
    label?: string
    error?: string
    options: Option[]
    placeholder?: string
    value?: string
  }

  let {
    label,
    error,
    options,
    placeholder,
    id,
    value = $bindable(''),
    class: className = '',
    ...rest
  }: Props = $props()

  const selectId = id ?? `select-${Math.random().toString(36).slice(2, 9)}`
</script>

<div class="space-y-1.5">
  {#if label}
    <label for={selectId} class="block text-sm font-medium text-gray-300">
      {label}
    </label>
  {/if}
  <select
    id={selectId}
    bind:value
    class="w-full px-4 py-2.5 bg-surface-800 border rounded-lg text-white
           transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50
           appearance-none cursor-pointer
           {error ? 'border-red-500' : 'border-white/10 hover:border-white/20'}
           {className}"
    {...rest}
  >
    {#if placeholder}
      <option value="" disabled>{placeholder}</option>
    {/if}
    {#each options as option}
      <option value={option.value} disabled={option.disabled}>
        {option.label}
      </option>
    {/each}
  </select>
  {#if error}
    <p class="text-sm text-red-400">{error}</p>
  {/if}
</div>

<style>
  select {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 0.75rem center;
    background-repeat: no-repeat;
    background-size: 1.25rem 1.25rem;
    padding-right: 2.5rem;
  }
</style>
