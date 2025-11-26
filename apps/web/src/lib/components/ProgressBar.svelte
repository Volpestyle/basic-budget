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

  const barColor = color ?? (isOverBudget ? '#ef4444' : percentage > 80 ? '#f59e0b' : '#00F5D4')

  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3'
  }
</script>

<div class="w-full">
  <div class="relative w-full bg-white/10 rounded-full overflow-hidden {heights[size]}">
    <div
      class="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
      style="width: {percentage}%; background-color: {barColor};"
    ></div>
  </div>
  {#if showLabel}
    <div class="mt-1 flex justify-between text-xs">
      <span class="text-gray-400">{Math.round(percentage)}%</span>
      {#if isOverBudget}
        <span class="text-red-400">Over budget</span>
      {/if}
    </div>
  {/if}
</div>
