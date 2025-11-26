<script lang="ts">
  interface Segment {
    value: number
    color: string
    label: string
  }

  interface Props {
    segments: Segment[]
    size?: number
    strokeWidth?: number
    centerLabel?: string
    centerValue?: string
  }

  let {
    segments,
    size = 200,
    strokeWidth = 24,
    centerLabel,
    centerValue
  }: Props = $props()

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  const total = segments.reduce((sum, s) => sum + s.value, 0)

  let paths = $state<Array<{ color: string; offset: number; length: number; label: string }>>([])

  $effect(() => {
    let currentOffset = 0
    paths = segments.map((segment) => {
      const length = total > 0 ? (segment.value / total) * circumference : 0
      const path = {
        color: segment.color,
        offset: currentOffset,
        length,
        label: segment.label
      }
      currentOffset += length
      return path
    })
  })
</script>

<div class="relative inline-flex items-center justify-center" style="width: {size}px; height: {size}px;">
  <svg width={size} height={size} class="transform -rotate-90">
    <!-- Background circle -->
    <circle
      cx={center}
      cy={center}
      r={radius}
      fill="none"
      stroke="currentColor"
      stroke-width={strokeWidth}
      class="text-white/5"
    />

    <!-- Segments -->
    {#each paths as path}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={path.color}
        stroke-width={strokeWidth}
        stroke-dasharray="{path.length} {circumference}"
        stroke-dashoffset={-path.offset}
        stroke-linecap="round"
        class="transition-all duration-700 ease-out"
      >
        <title>{path.label}</title>
      </circle>
    {/each}
  </svg>

  <!-- Center content -->
  {#if centerLabel || centerValue}
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      {#if centerValue}
        <span class="text-2xl font-bold font-mono text-white">{centerValue}</span>
      {/if}
      {#if centerLabel}
        <span class="text-sm text-gray-400">{centerLabel}</span>
      {/if}
    </div>
  {/if}
</div>
