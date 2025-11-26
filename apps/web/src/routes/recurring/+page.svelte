<script lang="ts">
  import { onMount } from 'svelte'
  import type { RecurringRule, CreateRecurringRuleRequest, RecurringInterval } from '@basic-budget/types'
  import Header from '$components/Header.svelte'
  import Card from '$components/Card.svelte'
  import Button from '$components/Button.svelte'
  import Input from '$components/Input.svelte'
  import Select from '$components/Select.svelte'
  import Modal from '$components/Modal.svelte'
  import CategoryTag from '$components/CategoryTag.svelte'
  import AmountDisplay from '$components/AmountDisplay.svelte'
  import Spinner from '$components/Spinner.svelte'
  import { recurringStore, categoriesStore, categoriesById, activeCategories } from '$stores'

  let showModal = $state(false)
  let editingRule = $state<RecurringRule | undefined>(undefined)
  let saving = $state(false)
  let error = $state<string | null>(null)

  // Form fields
  let type = $state<'expense' | 'income'>('expense')
  let label = $state('')
  let categoryId = $state('')
  let amount = $state('')
  let interval = $state<RecurringInterval>('monthly')
  let dayOfMonth = $state('1')
  let startDate = $state(new Date().toISOString().split('T')[0])

  onMount(() => {
    loadData()
  })

  async function loadData() {
    await Promise.all([recurringStore.load(), categoriesStore.load()])
  }

  function openNewModal() {
    editingRule = undefined
    type = 'expense'
    label = ''
    categoryId = ''
    amount = ''
    interval = 'monthly'
    dayOfMonth = '1'
    startDate = new Date().toISOString().split('T')[0]
    error = null
    showModal = true
  }

  function openEditModal(rule: RecurringRule) {
    editingRule = rule
    type = rule.type
    label = rule.label
    categoryId = rule.category_id
    amount = (rule.amount_cents / 100).toString()
    interval = rule.interval
    dayOfMonth = rule.day_of_month?.toString() ?? '1'
    startDate = rule.start_date
    error = null
    showModal = true
  }

  async function handleSave() {
    error = null

    if (!label || !categoryId || !amount) {
      error = 'Please fill in all required fields'
      return
    }

    const amountCents = Math.round(parseFloat(amount) * 100)
    if (isNaN(amountCents) || amountCents <= 0) {
      error = 'Please enter a valid amount'
      return
    }

    saving = true

    try {
      const data: CreateRecurringRuleRequest = {
        type,
        label,
        category_id: categoryId,
        amount_cents: amountCents,
        currency: 'USD',
        interval,
        day_of_month: parseInt(dayOfMonth),
        start_date: startDate || new Date().toISOString().split('T')[0] || ''
      }

      if (editingRule) {
        await recurringStore.update(editingRule.id, data)
      } else {
        await recurringStore.create(data)
      }
      showModal = false
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save recurring rule'
    } finally {
      saving = false
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this recurring rule?')) {
      await recurringStore.delete(id)
    }
  }

  const typeOptions = [
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' }
  ]

  const intervalOptions = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' }
  ]

  const categoryOptions = $derived(
    $activeCategories
      .filter((cat) => cat.type === type)
      .map((cat) => ({ value: cat.id, label: cat.name }))
  )

  const dayOptions = Array.from({ length: 28 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1)
  }))

  const intervalLabels: Record<string, string> = {
    monthly: 'Monthly',
    weekly: 'Weekly',
    biweekly: 'Bi-weekly'
  }

  const groupedRules = $derived(() => {
    const expenses = $recurringStore.items.filter((r) => r.type === 'expense')
    const incomes = $recurringStore.items.filter((r) => r.type === 'income')
    return { expenses, incomes }
  })
</script>

<svelte:head>
  <title>Recurring Payments - Basic Budget</title>
</svelte:head>

<Header title="Recurring Payments">
  {#snippet actions()}
    <Button variant="primary" onclick={openNewModal}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Add Rule
    </Button>
  {/snippet}
</Header>

<div class="p-6 space-y-8">
  {#if $recurringStore.loading}
    <div class="flex items-center justify-center py-20">
      <Spinner size="lg" />
    </div>
  {:else if $recurringStore.items.length === 0}
    <div class="text-center py-20">
      <h2 class="text-xl font-semibold text-white mb-2">No recurring payments</h2>
      <p class="text-gray-400 mb-6">Set up recurring expenses and income to auto-generate transactions.</p>
      <Button variant="primary" onclick={openNewModal}>Add your first recurring rule</Button>
    </div>
  {:else}
    <!-- Recurring Expenses -->
    {#if groupedRules().expenses.length > 0}
      <section>
        <h2 class="text-lg font-semibold text-white mb-4">Recurring Expenses</h2>
        <div class="space-y-3">
          {#each groupedRules().expenses as rule}
            {@const category = $categoriesById[rule.category_id]}
            <Card variant="default" padding="md">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div>
                    <p class="text-white font-medium">{rule.label}</p>
                    <div class="flex items-center gap-2 mt-1">
                      {#if category}
                        <CategoryTag name={category.name} color={category.color} size="sm" />
                      {/if}
                      <span class="text-xs text-gray-500">{intervalLabels[rule.interval]}</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <div class="text-right">
                    <AmountDisplay cents={rule.amount_cents} type="expense" />
                    <p class="text-xs text-gray-500 mt-1">
                      Next: {new Date(rule.next_occurrence).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                      onclick={() => openEditModal(rule)}
                      aria-label="Edit rule"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/10"
                      onclick={() => handleDelete(rule.id)}
                      aria-label="Delete rule"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Recurring Income -->
    {#if groupedRules().incomes.length > 0}
      <section>
        <h2 class="text-lg font-semibold text-white mb-4">Recurring Income</h2>
        <div class="space-y-3">
          {#each groupedRules().incomes as rule}
            {@const category = $categoriesById[rule.category_id]}
            <Card variant="default" padding="md">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div>
                    <p class="text-white font-medium">{rule.label}</p>
                    <div class="flex items-center gap-2 mt-1">
                      {#if category}
                        <CategoryTag name={category.name} color={category.color} size="sm" />
                      {/if}
                      <span class="text-xs text-gray-500">{intervalLabels[rule.interval]}</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <div class="text-right">
                    <AmountDisplay cents={rule.amount_cents} type="income" />
                    <p class="text-xs text-gray-500 mt-1">
                      Next: {new Date(rule.next_occurrence).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                      onclick={() => openEditModal(rule)}
                      aria-label="Edit rule"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/10"
                      onclick={() => handleDelete(rule.id)}
                      aria-label="Delete rule"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          {/each}
        </div>
      </section>
    {/if}
  {/if}
</div>

<Modal
  open={showModal}
  onClose={() => (showModal = false)}
  title={editingRule ? 'Edit Recurring Rule' : 'New Recurring Rule'}
  size="md"
>
  <form id="recurring-rule-form" onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
    {#if error}
      <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <p class="text-sm text-red-400">{error}</p>
      </div>
    {/if}

    <Select label="Type" options={typeOptions} bind:value={type} />

    <Input label="Label" placeholder="e.g., Netflix, Rent" bind:value={label} />

    <Select label="Category" options={categoryOptions} placeholder="Select a category" bind:value={categoryId} />

    <Input label="Amount" type="number" step="0.01" min="0" placeholder="0.00" bind:value={amount} />

    <Select label="Interval" options={intervalOptions} bind:value={interval} />

    {#if interval === 'monthly'}
      <Select label="Day of Month" options={dayOptions} bind:value={dayOfMonth} />
    {/if}

    <Input label="Start Date" type="date" bind:value={startDate} />
  </form>

  {#snippet footer()}
    <div class="flex items-center justify-end gap-3">
      <Button variant="ghost" type="button" onclick={() => (showModal = false)}>Cancel</Button>
      <Button variant="primary" type="submit" form="recurring-rule-form" loading={saving}>
        {editingRule ? 'Update' : 'Create'} Rule
      </Button>
    </div>
  {/snippet}
</Modal>
