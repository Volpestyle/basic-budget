<script lang="ts">
  interface Props {
    percentage: number
    totalCents: number
    color?: string
    maxPercentage?: number
    onchange: (percentage: number) => void
  }

  let { percentage, totalCents, color = '#6BCB77', maxPercentage = 100, onchange }: Props = $props()

  let sliderTrack: HTMLDivElement | undefined = $state()
  let isDragging = $state(false)
  let isEditing = $state(false)
  let inputValue = $state('')
  let inputEl: HTMLInputElement | undefined = $state()

  const amountCents = $derived(Math.round((percentage / 100) * totalCents))
  const effectiveMax = $derived(Math.min(100, maxPercentage))
  const isAtMax = $derived(percentage >= effectiveMax && effectiveMax < 100)

  function updateFromPosition(clientX: number) {
    if (!sliderTrack) return

    const rect = sliderTrack.getBoundingClientRect()
    const x = clientX - rect.left
    const newPercentage = Math.max(0, Math.min(effectiveMax, (x / rect.width) * 100))
    onchange(Math.round(newPercentage * 10) / 10)
  }

  function handlePointerDown(e: PointerEvent) {
    isDragging = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    updateFromPosition(e.clientX)
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return
    updateFromPosition(e.clientX)
  }

  function handlePointerUp() {
    isDragging = false
  }

  function increment() {
    const newVal = Math.min(effectiveMax, percentage + 1)
    onchange(newVal)
  }

  function decrement() {
    const newVal = Math.max(0, percentage - 1)
    onchange(newVal)
  }

  function startEditing() {
    inputValue = percentage.toFixed(1)
    isEditing = true
    // Focus input after it renders
    setTimeout(() => inputEl?.select(), 0)
  }

  function commitEdit() {
    const parsed = parseFloat(inputValue)
    if (!isNaN(parsed)) {
      const clamped = Math.max(0, Math.min(effectiveMax, parsed))
      onchange(Math.round(clamped * 10) / 10)
    }
    isEditing = false
  }

  function handleInputKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      commitEdit()
    } else if (e.key === 'Escape') {
      isEditing = false
    }
  }
</script>

<div class="space-y-3">
  <!-- Percentage display with +/- controls -->
  <div class="flex items-center justify-between">
    <button
      type="button"
      onclick={decrement}
      class="w-10 h-10 rounded-full bg-ink-800 border border-white/10 text-white text-xl font-medium
             flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
    >
      −
    </button>

    <button type="button" class="text-center" onclick={startEditing}>
      {#if isEditing}
        <div class="flex items-center justify-center gap-1">
          <input
            bind:this={inputEl}
            bind:value={inputValue}
            type="number"
            inputmode="decimal"
            step="0.1"
            min="0"
            max={effectiveMax}
            onblur={commitEdit}
            onkeydown={handleInputKeydown}
            class="w-20 text-3xl font-semibold tabular-nums text-center bg-white dark:bg-ink-800 text-black dark:text-white caret-black dark:caret-white border border-black/20 dark:border-white/20 rounded-lg outline-none focus:border-black/40 dark:focus:border-white/40 appearance-none"
          />
          <span class="text-3xl font-semibold text-white">%</span>
        </div>
      {:else}
        <span class="text-3xl font-semibold text-white tabular-nums">
          {percentage.toFixed(1)}%
        </span>
      {/if}
      <p class="text-sm text-gray-400 font-mono">
        ${(amountCents / 100).toFixed(2)}
      </p>
    </button>

    <button
      type="button"
      onclick={increment}
      disabled={isAtMax}
      class="w-10 h-10 rounded-full bg-ink-800 border text-xl font-medium
             flex items-center justify-center active:scale-95 transition-all touch-manipulation
             {isAtMax ? 'border-red-500/30 text-red-400/50 cursor-not-allowed' : 'border-white/10 text-white'}"
    >
      +
    </button>
  </div>

  <!-- Slider track -->
  <div
    bind:this={sliderTrack}
    role="slider"
    tabindex="0"
    aria-valuenow={percentage}
    aria-valuemin={0}
    aria-valuemax={100}
    class="relative h-12 rounded-full bg-ink-800 border border-white/10 overflow-hidden cursor-pointer touch-none select-none"
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
  >
    <!-- Filled portion -->
    <div
      class="absolute inset-y-0 left-0 transition-[width] duration-75 ease-out"
      style="width: {percentage}%; background-color: {color}; opacity: 0.3;"
    ></div>

    <!-- Thumb -->
    <div
      class="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-lg transition-[left] duration-75 ease-out
             {isDragging ? 'scale-110' : ''}"
      style="left: calc({percentage}% - 12px); background-color: {color};"
    >
      <div class="absolute inset-0 rounded-full bg-white/20"></div>
    </div>

    <!-- Track marks at 25%, 50%, 75% -->
    <div class="absolute inset-0 flex items-center justify-between px-[25%]">
      {#each [25, 50, 75] as mark}
        <div
          class="w-px h-4 bg-white/10"
          style="position: absolute; left: {mark}%;"
        ></div>
      {/each}
    </div>
  </div>
</div>
