<script lang="ts">
  import { onMount } from 'svelte'
  import Header from '$components/Header.svelte'
  import Card from '$components/Card.svelte'
  import AmountDisplay from '$components/AmountDisplay.svelte'
  import DonutChart from '$components/DonutChart.svelte'
  import BarChart from '$components/BarChart.svelte'
  import CategoryTag from '$components/CategoryTag.svelte'
  import Spinner from '$components/Spinner.svelte'
  import {
    currentMonthStore,
    summaryStore,
    categoriesStore,
    categoriesById,
    recurringStore,
    upcomingRecurring
  } from '$stores'

  let loading = $state(true)

  onMount(() => {
    loadData()

    const unsubscribe = currentMonthStore.subscribe(() => {
      loadData()
    })

    return unsubscribe
  })

  async function loadData() {
    loading = true
    try {
      await Promise.all([
        summaryStore.loadMonth($currentMonthStore),
        categoriesStore.load(),
        recurringStore.load()
      ])
    } catch {
      // Error handled by stores
    } finally {
      loading = false
    }
  }

  const summary = $derived($summaryStore.monthly)

  const chartSegments = $derived(
    summary?.category_breakdown.map((cat) => ({
      value: cat.spent_cents,
      color: cat.category_color,
      label: cat.category_name
    })) ?? []
  )

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })

  const barChartData = $derived([
    {
      label: 'This Month',
      income: summary?.income_total_cents ?? 0,
      expense: summary?.expense_total_cents ?? 0
    }
  ])

  const remainingPercentage = $derived(
    summary && summary.income_total_cents > 0
      ? Math.round(((summary.income_total_cents - summary.expense_total_cents) / summary.income_total_cents) * 100)
      : 0
  )
</script>

<svelte:head>
  <title>Dashboard - Basic Budget</title>
</svelte:head>

<Header showMonthPicker />

<div class="p-5 space-y-5">
  {#if loading}
    <div class="flex items-center justify-center py-20">
      <Spinner size="lg" />
    </div>
  {:else if summary}
    <!-- Summary cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card>
        <p class="text-[10px] uppercase tracking-wider text-ink-900/40 dark:text-white/40 mb-1">Income</p>
        <AmountDisplay cents={summary.income_total_cents} type="income" size="lg" />
      </Card>

      <Card>
        <p class="text-[10px] uppercase tracking-wider text-ink-900/40 dark:text-white/40 mb-1">Spent</p>
        <AmountDisplay cents={summary.expense_total_cents} type="expense" size="lg" />
      </Card>

      <Card>
        <p class="text-[10px] uppercase tracking-wider text-ink-900/40 dark:text-white/40 mb-1">Net</p>
        <AmountDisplay
          cents={summary.net_cents}
          type={summary.net_cents >= 0 ? 'income' : 'expense'}
          size="lg"
        />
      </Card>

      <Card>
        <p class="text-[10px] uppercase tracking-wider text-ink-900/40 dark:text-white/40 mb-1">Remaining</p>
        <p class="text-lg {remainingPercentage >= 0 ? 'text-positive' : 'text-negative'}">
          {remainingPercentage}%
        </p>
      </Card>
    </div>

    <!-- Charts row -->
    <div class="grid md:grid-cols-2 gap-4">
      <!-- Category breakdown donut -->
      <Card padding="lg">
        <h3 class="text-sm font-display font-bold text-ink-900 dark:text-white mb-5">Spending by Category</h3>
        {#if chartSegments.length > 0}
          <div class="flex flex-col items-center">
            <DonutChart
              segments={chartSegments}
              size={180}
              strokeWidth={20}
              centerValue={formatter.format(summary.expense_total_cents / 100)}
              centerLabel="Total Spent"
            />

            <!-- Legend -->
            <div class="mt-5 grid grid-cols-2 gap-2 w-full">
              {#each summary.category_breakdown as cat}
                <div class="flex items-center gap-1.5">
                  <span
                    class="w-2 h-2 flex-shrink-0"
                    style="background-color: {cat.category_color};"
                  ></span>
                  <span class="text-xs text-ink-900/60 dark:text-white/60 truncate">{cat.category_name}</span>
                  <span class="text-xs text-ink-900 dark:text-white ml-auto">
                    {formatter.format(cat.spent_cents / 100)}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <p class="text-center text-ink-900/40 dark:text-white/40 py-10 text-sm">No spending data yet</p>
        {/if}
      </Card>

      <!-- Income vs Expenses -->
      <Card padding="lg">
        <h3 class="text-sm font-display font-bold text-ink-900 dark:text-white mb-5">Income vs Expenses</h3>
        <div class="h-[180px] flex items-center justify-center">
          <BarChart data={barChartData} height={160} />
        </div>

        <!-- Recurring vs Variable -->
        <div class="mt-5 pt-5 border-t border-ink-900/5 dark:border-white/5">
          <h4 class="text-[10px] uppercase tracking-wider text-ink-900/40 dark:text-white/40 mb-3">Expense Breakdown</h4>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-ink-900/60 dark:text-white/60">Recurring</span>
              <span class="text-xs text-ink-900 dark:text-white">
                {formatter.format(summary.recurring_vs_variable.recurring_expenses_cents / 100)}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-ink-900/60 dark:text-white/60">Variable</span>
              <span class="text-xs text-ink-900 dark:text-white">
                {formatter.format(summary.recurring_vs_variable.variable_expenses_cents / 100)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <!-- Upcoming recurring -->
    <Card padding="lg">
      <h3 class="text-sm font-display font-bold text-ink-900 dark:text-white mb-4">Upcoming Recurring</h3>
      {#if $upcomingRecurring.length > 0}
        <div class="space-y-2">
          {#each $upcomingRecurring.slice(0, 5) as rule}
            {@const category = $categoriesById[rule.category_id]}
            <div class="flex items-center justify-between py-1.5 border-b border-ink-900/5 dark:border-white/5 last:border-0">
              <div class="flex items-center gap-2">
                {#if category}
                  <CategoryTag name={category.name} color={category.color} size="sm" />
                {/if}
                <span class="text-sm text-ink-900 dark:text-white">{rule.label}</span>
              </div>
              <div class="flex items-center gap-3">
                <AmountDisplay
                  cents={rule.amount_cents}
                  type={rule.type === 'expense' ? 'expense' : 'income'}
                  size="sm"
                />
                <span class="text-xs text-ink-900/40 dark:text-white/40">
                  {new Date(rule.next_occurrence).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          {/each}
        </div>
        {#if $upcomingRecurring.length > 5}
          <a href="/recurring" class="block mt-3 text-xs text-ink-900/60 hover:text-ink-900 dark:text-white/60 dark:hover:text-white">
            View all {$upcomingRecurring.length} upcoming →
          </a>
        {/if}
      {:else}
        <p class="text-ink-900/40 dark:text-white/40 text-sm">No upcoming recurring payments</p>
      {/if}
    </Card>
  {:else}
    <!-- Empty state -->
    <div class="text-center py-20">
      <h2 class="text-xl font-display font-bold text-ink-900 dark:text-white mb-3">Welcome to Basic Budget</h2>
      <p class="text-sm text-ink-900/60 dark:text-white/60 mb-5">Get started by adding your first transaction or setting up your categories.</p>
      <div class="flex items-center justify-center gap-3">
        <a
          href="/transactions"
          class="px-4 py-2 bg-ink-900 text-cream-50 dark:bg-white dark:text-ink-900 text-sm hover:opacity-90 transition-opacity"
        >
          Add Transaction
        </a>
        <a
          href="/budgets"
          class="px-4 py-2 border border-ink-900/10 dark:border-white/10 text-ink-900 dark:text-white text-sm hover:bg-ink-900/5 dark:hover:bg-white/5 transition-colors"
        >
          Set Up Budgets
        </a>
      </div>
    </div>
  {/if}
</div>
