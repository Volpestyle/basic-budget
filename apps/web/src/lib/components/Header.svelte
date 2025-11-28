<script lang="ts">
  import type { Snippet } from 'svelte'
  import { currentMonthStore, currentMonthDisplay } from '$stores'

  interface Props {
    title?: string
    showMonthPicker?: boolean
    actions?: Snippet
  }

  let { title, showMonthPicker = false, actions }: Props = $props()
</script>

<header class="sticky top-0 inset-x-0 z-30 bg-cream-100/80 dark:bg-ink-900/80 backdrop-blur-lg border-b border-ink-900/5 dark:border-white/5">
  <div class="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
    <div class="flex flex-wrap items-center gap-3 min-w-0 sm:flex-nowrap">
      {#if title}
        <h1 class="text-lg font-display font-bold text-ink-900 dark:text-white truncate">{title}</h1>
      {/if}

      {#if showMonthPicker}
        <div class="flex flex-wrap items-center gap-1 sm:flex-nowrap">
          <button
            type="button"
            class="p-1.5 text-ink-900/40 hover:text-ink-900 dark:text-white/40 dark:hover:text-white transition-colors"
            onclick={() => currentMonthStore.previousMonth()}
            aria-label="Previous month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            class="flex-1 min-w-[120px] sm:flex-none sm:min-w-[140px] px-3 py-1.5 text-ink-900 dark:text-white text-sm hover:bg-ink-900/5 dark:hover:bg-white/5 transition-colors"
            onclick={() => currentMonthStore.goToToday()}
          >
            {$currentMonthDisplay}
          </button>

          <button
            type="button"
            class="p-1.5 text-ink-900/40 hover:text-ink-900 dark:text-white/40 dark:hover:text-white transition-colors"
            onclick={() => currentMonthStore.nextMonth()}
            aria-label="Next month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      {/if}
    </div>

    <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
      {#if actions}
        {@render actions()}
      {/if}
    </div>
  </div>
</header>
