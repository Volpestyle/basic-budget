<script lang="ts">
  import type { MonthlySummary, MonthBudget, Category } from '@basic-budget/types'
  import Card from './Card.svelte'
  import AmountDisplay from './AmountDisplay.svelte'
  import ProgressBar from './ProgressBar.svelte'

  interface Props {
    summary: MonthlySummary
    budgets: MonthBudget[]
    categories: Category[]
    currentMonth: string
    selectedCategoryId?: string | null
  }

  let { summary, budgets, categories, currentMonth, selectedCategoryId = null }: Props = $props()

  // Parse the month to get date info
  const monthDate = $derived(new Date(currentMonth + '-01'))
  const daysInMonth = $derived(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate())

  // Check if current month matches today's month
  const today = new Date()
  const isCurrentMonth = $derived(
    monthDate.getFullYear() === today.getFullYear() && monthDate.getMonth() === today.getMonth()
  )

  const currentDay = $derived(isCurrentMonth ? today.getDate() : daysInMonth)
  const remainingDays = $derived(Math.max(1, daysInMonth - currentDay + 1))
  const daysPassed = $derived(currentDay)

  // Build lookups
  const categoryById = $derived(
    categories.reduce(
      (acc, cat) => {
        acc[cat.id] = cat
        return acc
      },
      {} as Record<string, Category>
    )
  )

  const budgetByCategoryId = $derived(
    budgets.reduce(
      (acc, b) => {
        acc[b.category_id] = b
        return acc
      },
      {} as Record<string, MonthBudget>
    )
  )

  // Calculate totals (anchor to month income so overall daily number stays stable)
  const totalPlannedCents = $derived(
    budgets.reduce((sum, b) => sum + b.planned_amount_cents, 0)
  )

  const plannedFromSummary = $derived(
    summary.category_breakdown.reduce((sum, cb) => sum + (cb.planned_cents ?? 0), 0)
  )

  const totalBudgetCents = $derived(
    summary.income_total_cents > 0
      ? summary.income_total_cents
      : totalPlannedCents > 0
        ? totalPlannedCents
        : plannedFromSummary
  )

  const totalSpentCents = $derived(
    summary.expense_total_cents ?? summary.category_breakdown.reduce((sum, cb) => sum + cb.spent_cents, 0)
  )

  // Selected category data
  const selectedCategory = $derived.by(() => {
    if (!selectedCategoryId) return null
    const category = categoryById[selectedCategoryId]
    const budget = budgetByCategoryId[selectedCategoryId]
    const breakdown = summary.category_breakdown.find((cb) => cb.category_id === selectedCategoryId)
    if (!category || !budget) return null

    return {
      name: category.name,
      color: category.color,
      plannedCents: budget.planned_amount_cents,
      spentCents: breakdown?.spent_cents ?? 0
    }
  })

  // Calculate display values based on selection
  const data = $derived.by(() => {
    const cat = selectedCategory
    if (cat) {
      // Selected category: daily budget = planned / days in month
      const dailyCents = Math.round(cat.plannedCents / daysInMonth)
      const remainingCents = Math.max(0, cat.plannedCents - cat.spentCents)
      const idealSpentByNow = Math.round((cat.plannedCents / daysInMonth) * daysPassed)
      const pace = cat.spentCents - idealSpentByNow

      return {
        label: cat.name,
        color: cat.color,
        dailyCents,
        remainingCents,
        spentCents: cat.spentCents,
        plannedCents: cat.plannedCents,
        pace
      }
    } else {
      // All Categories: daily budget = (planned - spent) / days in month
      const remainingCents = Math.max(0, totalBudgetCents - totalSpentCents)
      const dailyCents = Math.round(remainingCents / daysInMonth)
      const idealSpentByNow = Math.round((totalBudgetCents / daysInMonth) * daysPassed)
      const pace = totalSpentCents - idealSpentByNow

      return {
        label: 'All Categories',
        color: null,
        dailyCents,
        remainingCents,
        spentCents: totalSpentCents,
        plannedCents: totalBudgetCents,
        pace
      }
    }
  })
</script>

<div class="space-y-4">
  <h2 class="text-lg font-semibold text-ink-900 dark:text-white">Daily Budget</h2>

  <Card variant="glass" padding="lg">
    <div class="text-center space-y-4">
      <div class="flex items-center justify-center gap-2">
        {#if data.color}
          <span class="w-4 h-4 rounded-full" style="background-color: {data.color};"></span>
        {/if}
        <p class="text-sm text-gray-400">{data.label}</p>
      </div>

      <div>
        <AmountDisplay cents={data.dailyCents} size="xl" />
        <p class="text-xs text-gray-500 mt-1">per day ({daysInMonth} days this month)</p>
      </div>

      <div class="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
        <div>
          <p class="text-xs text-gray-400">Remaining</p>
          <AmountDisplay cents={data.remainingCents} size="md" type="income" />
        </div>
        <div>
          <p class="text-xs text-gray-400">Spent</p>
          <AmountDisplay cents={data.spentCents} size="md" type="expense" />
        </div>
      </div>

      <div class="pt-4">
        <ProgressBar value={data.spentCents} max={data.plannedCents} color={data.color ?? undefined} size="md" />
        <div class="flex justify-between mt-2 text-xs">
          <span class="text-gray-400">
            ${(data.spentCents / 100).toFixed(0)} of ${(data.plannedCents / 100).toFixed(0)}
          </span>
          <span class={data.pace > 0 ? 'text-red-400' : data.pace < 0 ? 'text-green-400' : 'text-gray-400'}>
            {#if data.pace > 0}
              ${(data.pace / 100).toFixed(0)} over pace
            {:else if data.pace < 0}
              ${(Math.abs(data.pace) / 100).toFixed(0)} under pace
            {:else}
              On pace
            {/if}
          </span>
        </div>
      </div>

      <div class="pt-4 border-t border-white/10">
        <div class="flex justify-between text-xs text-gray-400 mb-1">
          <span>Day {currentDay} of {daysInMonth}</span>
          <span>{Math.round((currentDay / daysInMonth) * 100)}% through month</span>
        </div>
        <ProgressBar value={currentDay} max={daysInMonth} size="sm" />
      </div>
    </div>
  </Card>
</div>
