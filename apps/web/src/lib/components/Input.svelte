<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'

  interface Props extends HTMLInputAttributes {
    label?: string
    error?: string
    value?: string
  }

  let {
    label,
    error,
    id,
    value = $bindable(''),
    type = 'text',
    placeholder,
    name,
    min,
    max,
    step,
    autocomplete,
    inputmode,
    pattern,
    disabled,
    required,
    readonly,
    ariaDescribedby,
    ariaLabel,
    ariaInvalid,
    class: className = '',
    onchange,
    oninput,
    onblur,
    onfocus
  }: Props = $props()

  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 9)}`
</script>

<div class="space-y-1.5">
  {#if label}
    <label for={inputId} class="block text-xs uppercase tracking-wider text-ink-900/60 dark:text-white/60">
      {label}
    </label>
  {/if}
  <input
    id={inputId}
    type={type}
    name={name}
    {placeholder}
    bind:value
    {min}
    {max}
    {step}
    autocomplete={autocomplete}
    inputmode={inputmode}
    pattern={pattern}
    {disabled}
    {required}
    {readonly}
    aria-describedby={ariaDescribedby}
    aria-label={ariaLabel}
    aria-invalid={ariaInvalid}
    class="w-full px-3 py-2 bg-cream-100 dark:bg-ink-700 border text-ink-900 dark:text-white placeholder-ink-900/30 dark:placeholder-white/30
           text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ink-900/20 dark:focus:ring-white/20
           {error ? 'border-negative' : 'border-ink-900/10 dark:border-white/10 hover:border-ink-900/20 dark:hover:border-white/20'}
           {className}"
    onchange={onchange}
    oninput={oninput}
    onblur={onblur}
    onfocus={onfocus}
  />
  {#if error}
    <p class="text-xs text-negative">{error}</p>
  {/if}
</div>
