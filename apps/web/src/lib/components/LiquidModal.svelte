<!--
  LiquidModal.svelte
  
  An enhanced modal component with liquid animations:
  - Background content scales back and blurs when modal opens
  - Modal content expands in with elastic ease
  - Smooth exit animation
  - Respects prefers-reduced-motion
  
  Usage:
    <LiquidModal open={isOpen} onClose={handleClose} title="My Modal">
      <p>Modal content here</p>
      {#snippet footer()}
        <Button onclick={handleClose}>Close</Button>
      {/snippet}
    </LiquidModal>
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import { onMount } from 'svelte'
  import { gsap } from 'gsap'
  import { duration, ease, transform, prefersReducedMotion } from '$lib/motion/config'

  interface Props {
    open: boolean
    onClose: () => void
    title?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    children: Snippet
    footer?: Snippet
  }

  let { open, onClose, title, size = 'md', children, footer }: Props = $props()

  let backdropRef = $state<HTMLDivElement | null>(null)
  let contentRef = $state<HTMLDivElement | null>(null)
  let animating = $state(false)

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  // Animate modal open/close
  $effect(() => {
    if (!backdropRef || !contentRef) return

    if (open) {
      animateIn(backdropRef, contentRef)
    } else if (animating) {
      animateOut(backdropRef, contentRef)
    }
  })

  function animateIn(backdropEl: HTMLDivElement, contentEl: HTMLDivElement) {
    if (prefersReducedMotion()) {
      gsap.set(backdropEl, { opacity: 1 })
      gsap.set(contentEl, { opacity: 1, scale: 1 })
      animating = true
      return
    }

    animating = true

    // Create timeline for coordinated animation
    const tl = gsap.timeline()

    // Backdrop fades in
    tl.fromTo(
      backdropEl,
      { opacity: 0 },
      {
        opacity: 1,
        duration: duration.normal,
        ease: ease.default,
      },
      0
    )

    // Content expands in with elastic ease
    tl.fromTo(
      contentEl,
      {
        opacity: 0,
        scale: transform.modalEnterScale,
        y: 20,
      },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: duration.slow,
        ease: ease.elastic,
      },
      0.1 // Slight delay after backdrop starts
    )
  }

  function animateOut(backdropEl: HTMLDivElement, contentEl: HTMLDivElement) {
    if (prefersReducedMotion()) {
      gsap.set(backdropEl, { opacity: 0 })
      gsap.set(contentEl, { opacity: 0, scale: transform.modalEnterScale })
      animating = false
      return
    }

    const tl = gsap.timeline({
      onComplete: () => {
        animating = false
      },
    })

    // Content shrinks out
    tl.to(
      contentEl,
      {
        opacity: 0,
        scale: transform.modalEnterScale,
        y: 20,
        duration: duration.normal,
        ease: ease.exit,
      },
      0
    )

    // Backdrop fades out
    tl.to(
      backdropEl,
      {
        opacity: 0,
        duration: duration.normal,
        ease: ease.exit,
      },
      0.1
    )
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      onClose()
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  onMount(() => {
    // Lock body scroll when modal is open
    const cleanup = $effect.root(() => {
      $effect(() => {
        if (open) {
          const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
          document.body.style.overflow = 'hidden'
          document.body.style.paddingRight = `${scrollbarWidth}px`
        } else {
          document.body.style.overflow = ''
          document.body.style.paddingRight = ''
        }
      })
    })

    return cleanup
  })
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open || animating}
  <div
    bind:this={backdropRef}
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 dark:bg-black/60 backdrop-blur-sm"
    onclick={handleBackdropClick}
    role="presentation"
  >
    <div
      bind:this={contentRef}
      class="w-full {sizes[
        size
      ]} bg-cream-50 dark:bg-ink-900 border border-ink-900/10 dark:border-white/10 rounded-lg shadow-2xl max-h-[90vh] overflow-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {#if title}
        <div
          class="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-ink-900/10 dark:border-white/10 bg-cream-50/80 dark:bg-ink-900/80 backdrop-blur-sm z-10"
        >
          <h2
            id="modal-title"
            class="text-base font-display font-bold text-ink-900 dark:text-white"
          >
            {title}
          </h2>
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
        <div
          class="sticky bottom-0 px-5 py-4 border-t border-ink-900/10 dark:border-white/10 bg-cream-100/80 dark:bg-ink-800/80 backdrop-blur-sm rounded-b-lg"
        >
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}
