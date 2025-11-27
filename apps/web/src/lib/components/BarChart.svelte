<script lang="ts">
  interface DataPoint {
    label: string
    income: number
    expense: number
  }

  interface Props {
    data: DataPoint[]
    height?: number
  }

  let { data, height = 200 }: Props = $props()

  const maxValue = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1)

  function getHeight(value: number): number {
    return (value / maxValue) * 100
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: 'compact'
  })
</script>

<div class="w-full">
  <div class="flex items-end justify-between gap-2" style="height: {height}px;">
    {#each data as point}
      <div class="flex-1 flex flex-col items-center gap-1">
        <div class="w-full flex items-end justify-center gap-1.5 h-full">
          <!-- Income bar -->
          <div class="w-4 flex flex-col items-center justify-end h-full">
            <div
              class="w-full bg-positive transition-all duration-500 ease-out"
              style="height: {getHeight(point.income)}%;"
              title="Income: {formatter.format(point.income / 100)}"
            ></div>
          </div>
          <!-- Expense bar -->
          <div class="w-4 flex flex-col items-center justify-end h-full">
            <div
              class="w-full bg-negative transition-all duration-500 ease-out"
              style="height: {getHeight(point.expense)}%;"
              title="Expense: {formatter.format(point.expense / 100)}"
            ></div>
          </div>
        </div>
        <span class="text-xs text-ink-900/40 dark:text-white/40 mt-2">{point.label}</span>
      </div>
    {/each}
  </div>

  <!-- Legend -->
  <div class="flex items-center justify-center gap-4 mt-4">
    <div class="flex items-center gap-1.5">
      <div class="w-2 h-2 bg-positive"></div>
      <span class="text-xs text-ink-900/60 dark:text-white/60">Income</span>
    </div>
    <div class="flex items-center gap-1.5">
      <div class="w-2 h-2 bg-negative"></div>
      <span class="text-xs text-ink-900/60 dark:text-white/60">Expenses</span>
    </div>
  </div>
</div>
