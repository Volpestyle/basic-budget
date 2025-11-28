<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'

  interface Props extends Omit<HTMLInputAttributes, 'type'> {
    label?: string
    error?: string
    value?: string
    min?: string
    max?: string
  }

  let {
    label,
    error,
    id,
    value = $bindable(''),
    min,
    max,
    name,
    disabled,
    required,
    class: className = '',
    autocomplete,
    onchange,
    oninput,
    onblur,
    onfocus
  }: Props = $props()

  const inputId = id ?? `datepicker-${Math.random().toString(36).slice(2, 9)}`
</script>

<div class="space-y-1.5">
  {#if label}
    <label for={inputId} class="block text-xs uppercase tracking-wider text-ink-900/60 dark:text-white/60">
      {label}
    </label>
  {/if}
  <div class="relative datepicker-wrapper">
    <input
      id={inputId}
      type="date"
      bind:value
      name={name}
      {disabled}
      {required}
      {min}
      {max}
      autocomplete={autocomplete}
      class="datepicker-input w-full px-3 py-2 bg-cream-100 dark:bg-ink-700 border text-ink-900 dark:text-white
             text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ink-900/20 dark:focus:ring-white/20
             {error ? 'border-negative' : 'border-ink-900/10 dark:border-white/10 hover:border-ink-900/20 dark:hover:border-white/20'}
             {className}"
      onchange={onchange}
      oninput={oninput}
      onblur={onblur}
      onfocus={onfocus}
    />
  </div>
  {#if error}
    <p class="text-xs text-negative">{error}</p>
  {/if}
</div>

<style>
  .datepicker-input {
    position: relative;
    color-scheme: light;
  }

  /* Calendar icon styling - Light mode (default dark icon) */
  .datepicker-input::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.4;
    transition: opacity 0.15s ease, filter 0.15s ease;
    filter: invert(0);
  }

  .datepicker-input:hover::-webkit-calendar-picker-indicator {
    opacity: 0.7;
  }

  /* Firefox calendar icon - Light mode */
  .datepicker-input::-moz-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.4;
    transition: opacity 0.15s ease, filter 0.15s ease;
    filter: invert(0);
  }

  .datepicker-input:hover::-moz-calendar-picker-indicator {
    opacity: 0.7;
  }

  /* Remove default date input clear/spin buttons */
  .datepicker-input::-webkit-inner-spin-button,
  .datepicker-input::-webkit-clear-button {
    display: none;
    -webkit-appearance: none;
  }

  /* Ensure proper text color for date values */
  .datepicker-input::-webkit-datetime-edit {
    padding: 0;
  }

  .datepicker-input::-webkit-datetime-edit-fields-wrapper {
    padding: 0;
  }

  /* Individual date field segments */
  .datepicker-input::-webkit-datetime-edit-text,
  .datepicker-input::-webkit-datetime-edit-month-field,
  .datepicker-input::-webkit-datetime-edit-day-field,
  .datepicker-input::-webkit-datetime-edit-year-field {
    color: inherit;
  }

  /* Dark mode calendar icon - webkit (Chrome/Safari) */
  :global(.dark) .datepicker-wrapper .datepicker-input::-webkit-calendar-picker-indicator {
    filter: invert(1) brightness(1.5);
    opacity: 0.85;
  }

  :global(.dark) .datepicker-wrapper .datepicker-input:hover::-webkit-calendar-picker-indicator {
    opacity: 1;
  }

  /* Dark mode calendar icon - Firefox */
  :global(.dark) .datepicker-wrapper .datepicker-input::-moz-calendar-picker-indicator {
    filter: invert(1) brightness(1.5);
    opacity: 0.85;
  }

  :global(.dark) .datepicker-wrapper .datepicker-input:hover::-moz-calendar-picker-indicator {
    opacity: 1;
  }
</style>
