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
    name,
    disabled,
    required,
    class: className = '',
    onchange,
    onblur,
    onfocus
  }: Props = $props()

  const selectId = id ?? `select-${Math.random().toString(36).slice(2, 9)}`
</script>

<div class="space-y-1.5">
  {#if label}
    <label for={selectId} class="block text-xs uppercase tracking-wider text-ink-900/60 dark:text-white/60">
      {label}
    </label>
  {/if}
  <select
    id={selectId}
    bind:value
    name={name}
    {disabled}
    {required}
    class="w-full px-3 py-2 bg-cream-100 dark:bg-ink-700 border text-ink-900 dark:text-white
           text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ink-900/20 dark:focus:ring-white/20
           appearance-none cursor-pointer
           {error ? 'border-negative' : 'border-ink-900/10 dark:border-white/10 hover:border-ink-900/20 dark:hover:border-white/20'}
           {className}"
    onchange={onchange}
    onblur={onblur}
    onfocus={onfocus}
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
    <p class="text-xs text-negative">{error}</p>
  {/if}
</div>

<style>
  select {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23666' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 0.5rem center;
    background-repeat: no-repeat;
    background-size: 1rem 1rem;
    padding-right: 2rem;
  }
</style>
