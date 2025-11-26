<script lang="ts">
  import { onMount } from 'svelte'
  import type { BulkBudgetRequest } from '@basic-budget/types'
  import Header from '$components/Header.svelte'
  import Card from '$components/Card.svelte'
  import Button from '$components/Button.svelte'
  import ProgressBar from '$components/ProgressBar.svelte'
  import AmountDisplay from '$components/AmountDisplay.svelte'
  import Spinner from '$components/Spinner.svelte'
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
  let budgetAmounts = $state<Record<string, string>>({})

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

    // Initialize budget amounts from current budgets
    const amounts: Record<string, string> = {}
    for (const budget of $budgetsStore.items) {
      amounts[budget.category_id] = (budget.planned_amount_cents / 100).toString()
    }
    budgetAmounts = amounts
  }

  function startEditing() {
    // Initialize all categories with their current budget or 0
    const amounts: Record<string, string> = {}
    for (const cat of $expenseCategories) {
      const budget = $budgetsByCategoryId[cat.id]
      amounts[cat.id] = budget ? (budget.planned_amount_cents / 100).toString() : '0'
    }
    budgetAmounts = amounts
    editing = true
  }

  function cancelEditing() {
    editing = false
    // Reset to original values
    const amounts: Record<string, string> = {}
    for (const budget of $budgetsStore.items) {
      amounts[budget.category_id] = (budget.planned_amount_cents / 100).toString()
    }
    budgetAmounts = amounts
  }

  async function saveBudgets() {
    saving = true

    try {
      const budgets: BulkBudgetRequest['budgets'] = []

      for (const [categoryId, amount] of Object.entries(budgetAmounts)) {
        const amountCents = Math.round(parseFloat(amount || '0') * 100)
        if (amountCents > 0) {
          budgets.push({ category_id: categoryId, planned_amount_cents: amountCents })
        }
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

  const totalBudget = $derived(
    Object.values(budgetAmounts).reduce((sum, val) => sum + (parseFloat(val || '0') * 100), 0)
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
              <div class="flex items-center gap-2">
                <span class="text-gray-400">$</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  class="flex-1 px-3 py-2 bg-surface-800 border border-white/10 rounded-lg text-white font-mono
                         focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  bind:value={budgetAmounts[category.id]}
                />
              </div>
            {:else}
              <div class="space-y-3">
                <div class="flex items-baseline justify-between">
                  <span class="text-sm text-gray-400">Budget</span>
                  <AmountDisplay cents={planned} size="md" />
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
