<script lang="ts">
  interface Props {
    value: number
    max: number
    color?: string
    showLabel?: boolean
    size?: 'sm' | 'md' | 'lg'
  }

  let { value, max, color, showLabel = false, size = 'md' }: Props = $props()

  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const isOverBudget = value > max

  const barColor = color ?? (isOverBudget ? '#FF6B6B' : percentage > 80 ? '#FFD3B6' : '#6BCB77')

  const heights = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2'
  }
</script>

<div class="w-full">
  <div class="relative w-full bg-ink-900/10 dark:bg-white/10 overflow-hidden {heights[size]}">
    <div
      class="absolute inset-y-0 left-0 transition-all duration-500 ease-out"
      style="width: {percentage}%; background-color: {barColor};"
    ></div>
  </div>
  {#if showLabel}
    <div class="mt-1 flex justify-between text-xs">
      <span class="text-ink-900/40 dark:text-white/40">{Math.round(percentage)}%</span>
      {#if isOverBudget}
        <span class="text-negative">Over budget</span>
      {/if}
    </div>
  {/if}
</div>
