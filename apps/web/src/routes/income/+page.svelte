<script lang="ts">
  import { tick } from 'svelte'
  import { gsap } from 'gsap'
  import type { IncomeStream, CreateIncomeStreamRequest } from '@basic-budget/types'
  import Header from '$components/Header.svelte'
  import Card from '$components/Card.svelte'
  import Button from '$components/Button.svelte'
  import Input from '$components/Input.svelte'
  import DatePicker from '$components/DatePicker.svelte'
  import Select from '$components/Select.svelte'
  import LiquidModal from '$components/LiquidModal.svelte'
  import AmountDisplay from '$components/AmountDisplay.svelte'
  import ProgressBar from '$components/ProgressBar.svelte'
  import Spinner from '$components/Spinner.svelte'
  import { duration, ease, stagger as staggerConfig, prefersReducedMotion } from '$lib/motion/config'
  import { incomeStreamsStore, categoriesStore, incomeCategories, summaryStore, authReady } from '$stores'

  let showModal = $state(false)
  let cardsGridRef = $state<HTMLDivElement>()
  let hasAnimatedInitial = false
  let editingStream = $state<IncomeStream | undefined>(undefined)
  let saving = $state(false)
  let error = $state<string | null>(null)

  // Form fields
  let name = $state('')
  let categoryId = $state('')
  let period = $state<'monthly' | 'biweekly' | 'once'>('monthly')
  let expectedAmount = $state('')
  let startDate = $state(new Date().toISOString().split('T')[0])
  let endDate = $state('')

  async function loadData() {
    await Promise.all([incomeStreamsStore.load(), categoriesStore.load()])
  }

  function openNewModal() {
    editingStream = undefined
    name = ''
    categoryId = ''
    period = 'monthly'
    expectedAmount = ''
    startDate = new Date().toISOString().split('T')[0]
    endDate = ''
    error = null
    showModal = true
  }

  function openEditModal(stream: IncomeStream) {
    editingStream = stream
    name = stream.name
    categoryId = stream.default_category_id
    period = stream.period
    expectedAmount = (stream.expected_amount_cents / 100).toString()
    startDate = stream.start_date || new Date().toISOString().split('T')[0]
    endDate = stream.end_date ?? ''
    error = null
    showModal = true
  }

  async function handleSave() {
    error = null

    if (!name || !categoryId || !expectedAmount || !startDate) {
      error = 'Please fill in all required fields'
      return
    }

    const amountCents = Math.round(parseFloat(expectedAmount) * 100)
    if (isNaN(amountCents) || amountCents <= 0) {
      error = 'Please enter a valid amount'
      return
    }

    saving = true

    try {
      const data: CreateIncomeStreamRequest = {
        name,
        default_category_id: categoryId,
        period,
        expected_amount_cents: amountCents,
        start_date: startDate,
        end_date: endDate || undefined
      }

      if (editingStream) {
        await incomeStreamsStore.update(editingStream.id, data)
      } else {
        await incomeStreamsStore.create(data)
      }
      showModal = false
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save income stream'
    } finally {
      saving = false
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this income stream?')) {
      await incomeStreamsStore.delete(id)
    }
  }

  async function handleToggleActive(stream: IncomeStream) {
    await incomeStreamsStore.update(stream.id, { active: !stream.active })
  }

  const categoryOptions = $derived(
    $incomeCategories.map((cat) => ({ value: cat.id, label: cat.name }))
  )

  const periodOptions = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'once', label: 'One-time' }
  ]

  const periodLabels: Record<string, string> = {
    monthly: '/month',
    biweekly: '/2 weeks',
    once: 'one-time'
  }

  // Load when auth is ready
  $effect(() => {
    if (!$authReady) return
    void loadData()
  })

  // Animate cards on initial page load
  $effect(() => {
    if ($incomeStreamsStore.loading || hasAnimatedInitial) return
    hasAnimatedInitial = true

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
            stagger: staggerConfig.sm
          }
        )
      }
    })
  })
</script>

<svelte:head>
  <title>Income Streams - Basic Budget</title>
</svelte:head>

<Header title="Income Streams">
  {#snippet actions()}
    <Button variant="primary" onclick={openNewModal}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Add Stream
    </Button>
  {/snippet}
</Header>

<div class="p-6 space-y-6">
  {#if $summaryStore.error}
    <div class="p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-100 text-sm">
      {$summaryStore.error}. Summary data may be stale.
    </div>
  {/if}

  {#if $incomeStreamsStore.loading}
    <div class="flex items-center justify-center py-20">
      <Spinner size="lg" />
    </div>
  {:else if $incomeStreamsStore.items.length === 0}
    <div class="text-center py-20">
      <h2 class="text-xl font-semibold text-white mb-2">No income streams yet</h2>
      <p class="text-gray-400 mb-6">Set up your income sources to track planned vs actual income.</p>
      <Button variant="primary" onclick={openNewModal}>Add your first income stream</Button>
    </div>
  {:else}
    <div bind:this={cardsGridRef} class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each $incomeStreamsStore.items as stream}
        <div><Card variant="default" padding="lg">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-lg font-semibold text-white">{stream.name}</h3>
              <p class="text-sm text-gray-400">{periodLabels[stream.period]}</p>
            </div>
            <button
              type="button"
              class="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              onclick={() => openEditModal(stream)}
              aria-label="Edit stream"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>

          <div class="mb-4">
            <div class="flex items-baseline justify-between mb-2">
              <span class="text-sm text-gray-400">Expected</span>
              <AmountDisplay cents={stream.expected_amount_cents} type="income" size="lg" />
            </div>
            <ProgressBar value={0} max={stream.expected_amount_cents} color="#22c55e" />
            <p class="text-xs text-gray-500 mt-1">$0.00 received this period</p>
          </div>

          <div class="flex items-center justify-between pt-4 border-t border-white/10">
            <button
              type="button"
              class="text-sm {stream.active ? 'text-green-400' : 'text-gray-500'}"
              onclick={() => handleToggleActive(stream)}
            >
              {stream.active ? 'Active' : 'Inactive'}
            </button>
            <button
              type="button"
              class="text-sm text-red-400 hover:text-red-300"
              onclick={() => handleDelete(stream.id)}
            >
              Delete
            </button>
          </div>
        </Card></div>
      {/each}
    </div>
  {/if}
</div>

<LiquidModal
  open={showModal}
  onClose={() => (showModal = false)}
  title={editingStream ? 'Edit Income Stream' : 'New Income Stream'}
  size="md"
>
  <form id="income-stream-form" onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
    {#if error}
      <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <p class="text-sm text-red-400">{error}</p>
      </div>
    {/if}

    <Input label="Name" placeholder="e.g., ACME Salary" bind:value={name} />

    <Select label="Category" options={categoryOptions} placeholder="Select a category" bind:value={categoryId} />

    <Select label="Payment Period" options={periodOptions} bind:value={period} />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <DatePicker label="Start Date" bind:value={startDate} />
      <DatePicker label="End Date (optional)" bind:value={endDate} />
    </div>

    <Input label="Expected Amount" type="number" step="0.01" min="0" placeholder="0.00" bind:value={expectedAmount} />
  </form>

  {#snippet footer()}
    <div class="flex items-center justify-end gap-3">
      <Button variant="ghost" type="button" onclick={() => (showModal = false)}>Cancel</Button>
      <Button variant="primary" type="submit" form="income-stream-form" loading={saving}>
        {editingStream ? 'Update' : 'Create'} Stream
      </Button>
    </div>
  {/snippet}
</LiquidModal>
