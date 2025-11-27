<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    open: boolean
    onClose: () => void
    title?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    children: Snippet
    footer?: Snippet
  }

  let { open, onClose, title, size = 'md', children, footer }: Props = $props()

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose()
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 dark:bg-black/60 backdrop-blur-sm"
    onclick={handleBackdropClick}
  >
    <div
      class="w-full {sizes[size]} bg-cream-50 dark:bg-ink-900 border border-ink-900/10 dark:border-white/10 rounded-lg shadow-xl
             transform transition-all"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {#if title}
        <div class="flex items-center justify-between px-5 py-4 border-b border-ink-900/10 dark:border-white/10">
          <h2 id="modal-title" class="text-base font-display font-bold text-ink-900 dark:text-white">{title}</h2>
          <button
            type="button"
            class="p-1 text-ink-900/40 hover:text-ink-900 dark:text-white/40 dark:hover:text-white transition-colors"
            onclick={onClose}
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      {/if}

      <div class="p-5">
        {@render children()}
      </div>

      {#if footer}
        <div class="px-5 py-4 border-t border-ink-900/10 dark:border-white/10 bg-cream-100/50 dark:bg-ink-800/50 rounded-b-lg">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}
