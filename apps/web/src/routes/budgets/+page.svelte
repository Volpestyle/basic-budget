<script lang="ts">
  import { onMount } from 'svelte'
  import type { BulkBudgetRequest } from '@basic-budget/types'
  import Header from '$components/Header.svelte'
  import Card from '$components/Card.svelte'
  import Button from '$components/Button.svelte'
  import ProgressBar from '$components/ProgressBar.svelte'
  import AmountDisplay from '$components/AmountDisplay.svelte'
  import Spinner from '$components/Spinner.svelte'
  import BudgetSlider from '$components/BudgetSlider.svelte'
  import {
    currentMonthStore,
    budgetsStore,
    budgetsByCategoryId,
    categoriesStore,
    expenseCategories,
    summaryStore
  } from '$stores'

  let editing = $state(false)
  let saving = $state(false)
  let budgetPercentages = $state<Record<string, number>>({})
  let budgetError = $state<string | null>(null)
  let prefilled = $state(false)

  onMount(() => {
    loadData()

    const unsubscribe = currentMonthStore.subscribe(() => {
      loadData()
    })

    return unsubscribe
  })

  async function loadData() {
    await Promise.all([
      budgetsStore.load($currentMonthStore),
      categoriesStore.load(),
      summaryStore.loadMonth($currentMonthStore)
    ])

    initPercentages()
  }

  function initPercentages() {
    const incomeCents = $summaryStore.monthly?.income_total_cents ?? 0
    if (incomeCents <= 0) return

    const percentages: Record<string, number> = {}
    for (const budget of $budgetsStore.items) {
      percentages[budget.category_id] = (budget.planned_amount_cents / incomeCents) * 100
    }
    budgetPercentages = percentages
  }

  // Prefill once when we have data and no budgets saved
  $effect(() => {
    if (
      prefilled ||
      $budgetsStore.loading ||
      $categoriesStore.loading ||
      $budgetsStore.items.length > 0 ||
      $expenseCategories.length === 0 ||
      (summary?.income_total_cents ?? 0) <= 0
    ) {
      return
    }

    const perCategory = 100 / $expenseCategories.length
    const defaults: Record<string, number> = {}
    $expenseCategories.forEach((cat) => {
      defaults[cat.id] = Math.round(perCategory * 10) / 10
    })
    budgetPercentages = defaults
    prefilled = true
  })

  function startEditing() {
    const incomeCents = summary?.income_total_cents ?? 0
    const percentages: Record<string, number> = {}
    for (const cat of $expenseCategories) {
      const budget = $budgetsByCategoryId[cat.id]
      if (budget && incomeCents > 0) {
        percentages[cat.id] = (budget.planned_amount_cents / incomeCents) * 100
      } else {
        percentages[cat.id] = 0
      }
    }
    budgetPercentages = percentages
    editing = true
  }

  function cancelEditing() {
    editing = false
    initPercentages()
  }

  async function saveBudgets() {
    budgetError = null
    saving = true

    try {
      const incomeCents = summary?.income_total_cents ?? 0
      const budgets: BulkBudgetRequest['budgets'] = []

      for (const [categoryId, percentage] of Object.entries(budgetPercentages)) {
        const amountCents = Math.round((percentage / 100) * incomeCents)
        if (amountCents > 0) {
          budgets.push({ category_id: categoryId, planned_amount_cents: amountCents })
        }
      }

      const totalPercentage = Object.values(budgetPercentages).reduce((sum, p) => sum + p, 0)

      if (totalPercentage > 100) {
        budgetError = `Total allocation (${totalPercentage.toFixed(1)}%) cannot exceed 100%.`
        saving = false
        return
      }

      await budgetsStore.bulkUpsert($currentMonthStore, { budgets })
      editing = false
    } catch (err) {
      console.error('Failed to save budgets:', err)
    } finally {
      saving = false
    }
  }

  const summary = $derived($summaryStore.monthly)

  const categoryBreakdown = $derived(
    summary?.category_breakdown ?? []
  )

  const totalAllocatedPercentage = $derived(
    Object.values(budgetPercentages).reduce((sum, p) => sum + p, 0)
  )

  const plannedBudgetsTotal = $derived(
    Math.round((totalAllocatedPercentage / 100) * (summary?.income_total_cents ?? 0))
  )

  const totalBudget = $derived(
    (summary?.income_total_cents ?? 0) || plannedBudgetsTotal
  )

  const totalSpent = $derived(
    categoryBreakdown.reduce((sum, cat) => sum + cat.spent_cents, 0)
  )
</script>

<svelte:head>
  <title>Budgets - Basic Budget</title>
</svelte:head>

<Header title="Budgets" showMonthPicker>
  {#snippet actions()}
    {#if editing}
      <Button variant="ghost" onclick={cancelEditing}>Cancel</Button>
      <Button variant="primary" onclick={saveBudgets} loading={saving}>Save</Button>
    {:else}
      <Button variant="primary" onclick={startEditing}>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit Budgets
      </Button>
    {/if}
  {/snippet}
</Header>

<div class="p-6 space-y-6">
  {#if $budgetsStore.loading || $categoriesStore.loading}
    <div class="flex items-center justify-center py-20">
      <Spinner size="lg" />
    </div>
  {:else}
    {#if budgetError}
      <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
        {budgetError}
      </div>
    {/if}

    {#if editing}
      <!-- Total allocation indicator -->
      <Card variant="default" padding="md">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-400">Total Allocated</span>
          <span class="text-lg font-semibold {totalAllocatedPercentage > 100 ? 'text-red-400' : 'text-white'}">
            {totalAllocatedPercentage.toFixed(1)}%
          </span>
        </div>
        <div class="mt-2 h-2 rounded-full bg-surface-800 overflow-hidden">
          <div
            class="h-full transition-all duration-150 {totalAllocatedPercentage > 100 ? 'bg-red-500' : 'bg-primary-500'}"
            style="width: {Math.min(totalAllocatedPercentage, 100)}%;"
          ></div>
        </div>
        <p class="mt-2 text-xs text-gray-500">
          {#if totalAllocatedPercentage > 100}
            Over by {(totalAllocatedPercentage - 100).toFixed(1)}%
          {:else}
            {(100 - totalAllocatedPercentage).toFixed(1)}% unallocated
          {/if}
        </p>
      </Card>
    {/if}

    <!-- Summary -->
    <Card variant="glass" padding="lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-400">Total Budget</p>
          <AmountDisplay cents={totalBudget} size="xl" />
        </div>
        <div class="text-right">
          <p class="text-sm text-gray-400">Spent</p>
          <AmountDisplay cents={totalSpent} type="expense" size="xl" />
        </div>
      </div>
      <div class="mt-4">
        <ProgressBar
          value={totalSpent}
          max={totalBudget}
          size="lg"
          showLabel
        />
      </div>
    </Card>

    <!-- Category budgets grid -->
    {#if $expenseCategories.length === 0}
      <div class="text-center py-20">
        <h2 class="text-xl font-semibold text-white mb-2">No expense categories</h2>
        <p class="text-gray-400">Create expense categories first to set up budgets.</p>
      </div>
    {:else}
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each $expenseCategories as category}
          {@const budget = $budgetsByCategoryId[category.id]}
          {@const breakdown = categoryBreakdown.find((c) => c.category_id === category.id)}
          {@const planned = budget?.planned_amount_cents ?? 0}
          {@const spent = breakdown?.spent_cents ?? 0}

          <Card variant="default" padding="md">
            <div class="flex items-center gap-3 mb-4">
              <span
                class="w-4 h-4 rounded-full flex-shrink-0"
                style="background-color: {category.color};"
              ></span>
              <h3 class="text-white font-medium flex-1">{category.name}</h3>
            </div>

            {#if editing}
              <BudgetSlider
                percentage={budgetPercentages[category.id] ?? 0}
                totalCents={summary?.income_total_cents ?? 0}
                color={category.color}
                onchange={(p) => budgetPercentages[category.id] = p}
              />
            {:else}
              <div class="space-y-3">
                <div class="flex items-baseline justify-between">
                  <span class="text-sm text-gray-400">Budget</span>
                  <div class="text-right">
                    <AmountDisplay cents={planned} size="md" />
                    {#if summary?.income_total_cents}
                      <div class="text-[11px] text-gray-500">
                        {Math.round((planned / summary.income_total_cents) * 10000) / 100}%
                      </div>
                    {/if}
                  </div>
                </div>
                <ProgressBar value={spent} max={planned} color={category.color} />
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-500">
                    Spent: <span class="font-mono text-white">${(spent / 100).toFixed(2)}</span>
                  </span>
                  {#if planned > 0}
                    <span class={spent > planned ? 'text-red-400' : 'text-gray-500'}>
                      {spent > planned ? 'Over by' : 'Left:'}
                      <span class="font-mono">${Math.abs((planned - spent) / 100).toFixed(2)}</span>
                    </span>
                  {/if}
                </div>
              </div>
            {/if}
          </Card>
        {/each}
      </div>
    {/if}
  {/if}
</div>
