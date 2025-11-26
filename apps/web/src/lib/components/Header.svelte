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

<header class="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-white/5">
  <div class="flex items-center justify-between px-6 py-4">
    <div class="flex items-center gap-4">
      {#if title}
        <h1 class="text-xl font-semibold text-white">{title}</h1>
      {/if}

      {#if showMonthPicker}
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            onclick={() => currentMonthStore.previousMonth()}
            aria-label="Previous month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            class="px-4 py-2 text-white font-medium rounded-lg hover:bg-white/5 transition-colors min-w-[160px]"
            onclick={() => currentMonthStore.goToToday()}
          >
            {$currentMonthDisplay}
          </button>

          <button
            type="button"
            class="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            onclick={() => currentMonthStore.nextMonth()}
            aria-label="Next month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-4">
      {#if actions}
        {@render actions()}
      {/if}
    </div>
  </div>
</header>
