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

<div class="p-6 space-y-6">
  {#if loading}
    <div class="flex items-center justify-center py-20">
      <Spinner size="lg" />
    </div>
  {:else if summary}
    <!-- Summary cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card variant="glass">
        <p class="text-sm text-gray-400 mb-1">Income</p>
        <AmountDisplay cents={summary.income_total_cents} type="income" size="lg" />
      </Card>

      <Card variant="glass">
        <p class="text-sm text-gray-400 mb-1">Spent</p>
        <AmountDisplay cents={summary.expense_total_cents} type="expense" size="lg" />
      </Card>

      <Card variant="glass">
        <p class="text-sm text-gray-400 mb-1">Net</p>
        <AmountDisplay
          cents={summary.net_cents}
          type={summary.net_cents >= 0 ? 'income' : 'expense'}
          size="lg"
        />
      </Card>

      <Card variant="glass">
        <p class="text-sm text-gray-400 mb-1">Remaining</p>
        <p class="text-2xl font-bold font-mono {remainingPercentage >= 0 ? 'text-primary-400' : 'text-red-400'}">
          {remainingPercentage}%
        </p>
      </Card>
    </div>

    <!-- Charts row -->
    <div class="grid md:grid-cols-2 gap-6">
      <!-- Category breakdown donut -->
      <Card variant="default" padding="lg">
        <h3 class="text-lg font-semibold text-white mb-6">Spending by Category</h3>
        {#if chartSegments.length > 0}
          <div class="flex flex-col items-center">
            <DonutChart
              segments={chartSegments}
              size={200}
              centerValue={formatter.format(summary.expense_total_cents / 100)}
              centerLabel="Total Spent"
            />

            <!-- Legend -->
            <div class="mt-6 grid grid-cols-2 gap-3 w-full">
              {#each summary.category_breakdown as cat}
                <div class="flex items-center gap-2">
                  <span
                    class="w-3 h-3 rounded-full flex-shrink-0"
                    style="background-color: {cat.category_color};"
                  ></span>
                  <span class="text-sm text-gray-400 truncate">{cat.category_name}</span>
                  <span class="text-sm font-mono text-white ml-auto">
                    {formatter.format(cat.spent_cents / 100)}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <p class="text-center text-gray-500 py-10">No spending data yet</p>
        {/if}
      </Card>

      <!-- Income vs Expenses -->
      <Card variant="default" padding="lg">
        <h3 class="text-lg font-semibold text-white mb-6">Income vs Expenses</h3>
        <div class="h-[200px] flex items-center justify-center">
          <BarChart data={barChartData} height={180} />
        </div>

        <!-- Recurring vs Variable -->
        <div class="mt-6 pt-6 border-t border-white/10">
          <h4 class="text-sm font-medium text-gray-400 mb-4">Expense Breakdown</h4>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-400">Recurring</span>
              <span class="text-sm font-mono text-white">
                {formatter.format(summary.recurring_vs_variable.recurring_expenses_cents / 100)}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-400">Variable</span>
              <span class="text-sm font-mono text-white">
                {formatter.format(summary.recurring_vs_variable.variable_expenses_cents / 100)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <!-- Upcoming recurring -->
    <Card variant="default" padding="lg">
      <h3 class="text-lg font-semibold text-white mb-4">Upcoming Recurring</h3>
      {#if $upcomingRecurring.length > 0}
        <div class="space-y-3">
          {#each $upcomingRecurring.slice(0, 5) as rule}
            {@const category = $categoriesById[rule.category_id]}
            <div class="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div class="flex items-center gap-3">
                {#if category}
                  <CategoryTag name={category.name} color={category.color} size="sm" />
                {/if}
                <span class="text-white">{rule.label}</span>
              </div>
              <div class="flex items-center gap-4">
                <AmountDisplay
                  cents={rule.amount_cents}
                  type={rule.type === 'expense' ? 'expense' : 'income'}
                  size="sm"
                />
                <span class="text-sm text-gray-400">
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
          <a href="/recurring" class="block mt-4 text-sm text-primary-400 hover:text-primary-300">
            View all {$upcomingRecurring.length} upcoming
          </a>
        {/if}
      {:else}
        <p class="text-gray-500">No upcoming recurring payments</p>
      {/if}
    </Card>
  {:else}
    <!-- Empty state -->
    <div class="text-center py-20">
      <h2 class="text-2xl font-semibold text-white mb-4">Welcome to Basic Budget</h2>
      <p class="text-gray-400 mb-6">Get started by adding your first transaction or setting up your categories.</p>
      <div class="flex items-center justify-center gap-4">
        <a
          href="/transactions"
          class="px-4 py-2 bg-primary-500 text-background font-medium rounded-lg hover:bg-primary-400 transition-colors"
        >
          Add Transaction
        </a>
        <a
          href="/budgets"
          class="px-4 py-2 border border-white/10 text-white font-medium rounded-lg hover:bg-white/5 transition-colors"
        >
          Set Up Budgets
        </a>
      </div>
    </div>
  {/if}
</div>
