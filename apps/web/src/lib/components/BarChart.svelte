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
        <div class="w-full flex items-end justify-center gap-1 h-full">
          <!-- Income bar -->
          <div class="w-5 flex flex-col items-center justify-end h-full">
            <div
              class="w-full bg-green-500/80 rounded-t transition-all duration-500 ease-out"
              style="height: {getHeight(point.income)}%;"
              title="Income: {formatter.format(point.income / 100)}"
            ></div>
          </div>
          <!-- Expense bar -->
          <div class="w-5 flex flex-col items-center justify-end h-full">
            <div
              class="w-full bg-red-500/80 rounded-t transition-all duration-500 ease-out"
              style="height: {getHeight(point.expense)}%;"
              title="Expense: {formatter.format(point.expense / 100)}"
            ></div>
          </div>
        </div>
        <span class="text-xs text-gray-400 mt-2">{point.label}</span>
      </div>
    {/each}
  </div>

  <!-- Legend -->
  <div class="flex items-center justify-center gap-6 mt-4">
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded bg-green-500"></div>
      <span class="text-xs text-gray-400">Income</span>
    </div>
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded bg-red-500"></div>
      <span class="text-xs text-gray-400">Expenses</span>
    </div>
  </div>
</div>
