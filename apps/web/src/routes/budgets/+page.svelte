<script lang="ts">
  import { tick } from 'svelte'
  import { gsap } from 'gsap'
  import type { BulkBudgetRequest } from '@basic-budget/types'
  import Header from '$components/Header.svelte'
  import Card from '$components/Card.svelte'
  import Button from '$components/Button.svelte'
  import ProgressBar from '$components/ProgressBar.svelte'
  import AmountDisplay from '$components/AmountDisplay.svelte'
  import Spinner from '$components/Spinner.svelte'
  import BudgetSlider from '$components/BudgetSlider.svelte'
  import DailyBudgetView from '$components/DailyBudgetView.svelte'
  import { duration, ease, prefersReducedMotion } from '$lib/motion/config'
  import { liquidEnter } from '$lib/motion/actions'
  import {
    currentMonthStore,
    budgetsStore,
    budgetsByCategoryId,
    categoriesStore,
    expenseCategories,
    summaryStore,
    authReady
  } from '$stores'

  let editing = $state(false)
  let saving = $state(false)
  let selectedCategoryId = $state<string | null>(null)
  let budgetPercentages = $state<Record<string, number>>({})
  let budgetError = $state<string | null>(null)
  let prefilled = $state(false)
  let pageLoading = $state(true)

  // Button refs for liquid animation
  let editButtonRef = $state<HTMLDivElement>()
  let editModeButtonsRef = $state<HTMLDivElement>()

  // Content refs for mode transition animations
  let allocationCardRef = $state<HTMLDivElement>()
  let cardsGridRef = $state<HTMLDivElement>()

  let pendingLoad: Promise<void> | null = null

  async function loadData() {
    if (pendingLoad) return
    pendingLoad = (async () => {
      pageLoading = true
      await Promise.all([
        budgetsStore.load($currentMonthStore),
        categoriesStore.load(),
        summaryStore.loadMonth($currentMonthStore)
      ])
      initPercentages()
      pageLoading = false
    })().finally(() => {
      pendingLoad = null
    })
    await pendingLoad
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

  async function startEditing() {
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

    // Capture refs before async operations
    const editBtn = editButtonRef
    const cardsGrid = cardsGridRef

    // Animate out current content
    if (!prefersReducedMotion()) {
      const tl = gsap.timeline()

      // Animate button out
      if (editBtn) {
        tl.to(editBtn, {
          opacity: 0,
          scale: 0.9,
          x: -10,
          duration: duration.fast,
          ease: ease.exit
        }, 0)
      }

      // Animate cards content out (scale down slightly)
      if (cardsGrid) {
        const cards = cardsGrid.querySelectorAll(':scope > div')
        tl.to(cards, {
          opacity: 0.5,
          scale: 0.98,
          duration: duration.fast,
          ease: ease.exit,
          stagger: 0.02
        }, 0)
      }

      await tl
    }

    editing = true
    await tick()

    // Animate in new content
    if (!prefersReducedMotion()) {
      const tl = gsap.timeline()

      // Animate in the edit mode buttons
      const editModeContainer = editModeButtonsRef
      if (editModeContainer) {
        const buttons = editModeContainer.querySelectorAll('button')
        tl.fromTo(
          buttons,
          { opacity: 0, scale: 0.9, x: 10 },
          {
            opacity: 1,
            scale: 1,
            x: 0,
            duration: duration.normal,
            ease: ease.elastic,
            stagger: 0.05
          },
          0
        )
      }

      // Animate in allocation card
      const allocationCard = allocationCardRef
      if (allocationCard) {
        tl.fromTo(
          allocationCard,
          { opacity: 0, scale: 0.95, y: -10 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: duration.normal,
            ease: ease.elastic
          },
          0.05
        )
      }

      // Animate cards back in with new content
      const newCardsGrid = cardsGridRef
      if (newCardsGrid) {
        const cards = newCardsGrid.querySelectorAll(':scope > div')
        tl.fromTo(
          cards,
          { opacity: 0.5, scale: 0.98 },
          {
            opacity: 1,
            scale: 1,
            duration: duration.normal,
            ease: ease.elastic,
            stagger: 0.03
          },
          0.1
        )
      }
    }
  }

  async function cancelEditing() {
    // Capture refs before async operations
    const editModeContainer = editModeButtonsRef
    const allocationCard = allocationCardRef
    const cardsGrid = cardsGridRef

    // Animate out edit mode content
    if (!prefersReducedMotion()) {
      const tl = gsap.timeline()

      // Animate buttons out
      if (editModeContainer) {
        const buttons = editModeContainer.querySelectorAll('button')
        tl.to(buttons, {
          opacity: 0,
          scale: 0.9,
          x: 10,
          duration: duration.fast,
          ease: ease.exit,
          stagger: 0.03
        }, 0)
      }

      // Animate allocation card out
      if (allocationCard) {
        tl.to(allocationCard, {
          opacity: 0,
          scale: 0.95,
          y: -10,
          duration: duration.fast,
          ease: ease.exit
        }, 0)
      }

      // Animate cards content out
      if (cardsGrid) {
        const cards = cardsGrid.querySelectorAll(':scope > div')
        tl.to(cards, {
          opacity: 0.5,
          scale: 0.98,
          duration: duration.fast,
          ease: ease.exit,
          stagger: 0.02
        }, 0)
      }

      await tl
    }

    editing = false
    initPercentages()
    await tick()

    // Animate in view mode content
    if (!prefersReducedMotion()) {
      const tl = gsap.timeline()

      // Animate edit button in
      const editBtn = editButtonRef
      if (editBtn) {
        tl.fromTo(
          editBtn,
          { opacity: 0, scale: 0.9, x: -10 },
          {
            opacity: 1,
            scale: 1,
            x: 0,
            duration: duration.normal,
            ease: ease.elastic
          },
          0
        )
      }

      // Animate cards back in
      const newCardsGrid = cardsGridRef
      if (newCardsGrid) {
        const cards = newCardsGrid.querySelectorAll(':scope > div')
        tl.fromTo(
          cards,
          { opacity: 0.5, scale: 0.98 },
          {
            opacity: 1,
            scale: 1,
            duration: duration.normal,
            ease: ease.elastic,
            stagger: 0.03
          },
          0.05
        )
      }
    }
  }

  async function saveBudgets() {
    budgetError = null
    saving = true

    try {
      const incomeCents = summary?.income_total_cents ?? 0
      const budgets: BulkBudgetRequest['budgets'] = []

      for (const [categoryId, percentage] of Object.entries(budgetPercentages)) {
        const amountCents = Math.round((percentage / 100) * incomeCents)
        budgets.push({ category_id: categoryId, planned_amount_cents: amountCents })
      }

      const totalPercentage = Math.round(
        Object.values(budgetPercentages).reduce((sum, p) => sum + p, 0) * 10
      ) / 10

      if (totalPercentage - 100 > 0.0001) {
        budgetError = `Total allocation (${totalPercentage.toFixed(1)}%) cannot exceed 100%.`
        saving = false
        return
      }

      await budgetsStore.bulkUpsert($currentMonthStore, { budgets })
      // Pull fresh data so summary/daily budget updates without a page reload
      await Promise.all([
        summaryStore.loadMonth($currentMonthStore),
        budgetsStore.load($currentMonthStore)
      ])

      // Capture refs before async operations
      const editModeContainer = editModeButtonsRef
      const allocationCard = allocationCardRef
      const cardsGrid = cardsGridRef

      // Animate out edit mode content
      if (!prefersReducedMotion()) {
        const tl = gsap.timeline()

        // Animate buttons out
        if (editModeContainer) {
          const buttons = editModeContainer.querySelectorAll('button')
          tl.to(buttons, {
            opacity: 0,
            scale: 0.9,
            x: 10,
            duration: duration.fast,
            ease: ease.exit,
            stagger: 0.03
          }, 0)
        }

        // Animate allocation card out
        if (allocationCard) {
          tl.to(allocationCard, {
            opacity: 0,
            scale: 0.95,
            y: -10,
            duration: duration.fast,
            ease: ease.exit
          }, 0)
        }

        // Animate cards content out
        if (cardsGrid) {
          const cards = cardsGrid.querySelectorAll(':scope > div')
          tl.to(cards, {
            opacity: 0.5,
            scale: 0.98,
            duration: duration.fast,
            ease: ease.exit,
            stagger: 0.02
          }, 0)
        }

        await tl
      }

      editing = false
      await tick()

      // Animate in view mode content
      if (!prefersReducedMotion()) {
        const tl = gsap.timeline()

        // Animate edit button in
        const editBtn = editButtonRef
        if (editBtn) {
          tl.fromTo(
            editBtn,
            { opacity: 0, scale: 0.9, x: -10 },
            {
              opacity: 1,
              scale: 1,
              x: 0,
              duration: duration.normal,
              ease: ease.elastic
            },
            0
          )
        }

        // Animate cards back in
        const newCardsGrid = cardsGridRef
        if (newCardsGrid) {
          const cards = newCardsGrid.querySelectorAll(':scope > div')
          tl.fromTo(
            cards,
            { opacity: 0.5, scale: 0.98 },
            {
              opacity: 1,
              scale: 1,
              duration: duration.normal,
              ease: ease.elastic,
              stagger: 0.03
            },
            0.05
          )
        }
      }
    } catch (err) {
      console.error('Failed to save budgets:', err)
    } finally {
      saving = false
    }
  }

  const summary = $derived($summaryStore.monthly)

  // Load when auth is ready and on month changes
  $effect(() => {
    if (!$authReady) return
    // Ensure dependency on currentMonthStore
    $currentMonthStore
    void loadData()
  })

  const categoryBreakdown = $derived(
    summary?.category_breakdown ?? []
  )

  const totalAllocatedPercentage = $derived(
    Math.round(
      Object.values(budgetPercentages).reduce((sum, p) => sum + p, 0) * 10
    ) / 10
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

  function handlePercentageChange(categoryId: string, nextPercentage: number) {
    const current = budgetPercentages[categoryId] ?? 0
    const totalWithoutCurrent = totalAllocatedPercentage - current
    const maxForCategory = Math.max(0, 100 - totalWithoutCurrent)
    const clamped = Math.max(0, Math.min(nextPercentage, maxForCategory))
    const rounded = Math.round(clamped * 10) / 10

    budgetPercentages = { ...budgetPercentages, [categoryId]: rounded }
  }

  // Animate cards on initial page load
  let hasAnimatedInitial = false
  $effect(() => {
    if (pageLoading || hasAnimatedInitial) return
    hasAnimatedInitial = true

    // Wait for next tick to ensure DOM is ready
    tick().then(() => {
      if (prefersReducedMotion()) return

      const cardsGrid = cardsGridRef
      if (cardsGrid) {
        const cards = cardsGrid.querySelectorAll(':scope > div')
        gsap.fromTo(
          cards,
          { opacity: 0, y: 20, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: duration.normal,
            ease: ease.elastic,
            stagger: 0.06
          }
        )
      }
    })
  })
</script>

<svelte:head>
  <title>Budgets - Basic Budget</title>
</svelte:head>

<Header title="Budgets" showMonthPicker>
  {#snippet actions()}
    {#if editing}
      <div bind:this={editModeButtonsRef} class="flex items-center gap-2">
        <Button variant="ghost" onclick={cancelEditing}>Cancel</Button>
        <Button variant="primary" onclick={saveBudgets} loading={saving}>Save</Button>
      </div>
    {:else}
      <div bind:this={editButtonRef}>
        <Button variant="primary" onclick={startEditing}>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Budgets
        </Button>
      </div>
    {/if}
  {/snippet}
</Header>

  <div class="p-6 space-y-6">
  {#if pageLoading || $budgetsStore.loading || $categoriesStore.loading}
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
      <div bind:this={allocationCardRef}>
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
      </div>
    {/if}

    <!-- Summary -->
    <div use:liquidEnter>
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
    </div>

    <!-- Daily Budget View (only when not editing) -->
    {#if !editing && summary}
      <DailyBudgetView
        {summary}
        budgets={$budgetsStore.items}
        categories={$categoriesStore.items}
        currentMonth={$currentMonthStore}
        {selectedCategoryId}
      />
    {/if}

    <!-- Category budgets grid -->
    {#if $expenseCategories.length === 0}
      <div class="text-center py-20">
        <h2 class="text-xl font-semibold text-white mb-2">No expense categories</h2>
        <p class="text-gray-400">Create expense categories first to set up budgets.</p>
      </div>
    {:else}
      <div bind:this={cardsGridRef} class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each $expenseCategories as category}
          {@const budget = $budgetsByCategoryId[category.id]}
          {@const breakdown = categoryBreakdown.find((c) => c.category_id === category.id)}
          {@const planned = budget?.planned_amount_cents ?? 0}
          {@const spent = breakdown?.spent_cents ?? 0}

          <div>
            <button
              type="button"
              onclick={() => !editing && (selectedCategoryId = selectedCategoryId === category.id ? null : category.id)}
              disabled={editing}
              class="w-full text-left rounded-lg transition-all
                     {!editing && selectedCategoryId === category.id ? 'ring-2 ring-offset-2 ring-offset-ink-900' : ''}
                     {editing ? 'cursor-default' : 'cursor-pointer'}"
              style={!editing && selectedCategoryId === category.id ? `--tw-ring-color: ${category.color};` : ''}
            >
            <Card variant="default" padding="md">
            <div class="flex items-center gap-3 mb-4">
              <span
                class="w-4 h-4 rounded-full flex-shrink-0"
                style="background-color: {category.color};"
              ></span>
              <h3 class="text-white font-medium flex-1">{category.name}</h3>
            </div>

            {#if editing}
              {@const currentPercentage = budgetPercentages[category.id] ?? 0}
              {@const maxForCategory = Math.max(0, 100 - (totalAllocatedPercentage - currentPercentage))}
              <BudgetSlider
                percentage={currentPercentage}
                totalCents={summary?.income_total_cents ?? 0}
                color={category.color}
                maxPercentage={maxForCategory}
                onchange={(p) => handlePercentageChange(category.id, p)}
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
            </button>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
