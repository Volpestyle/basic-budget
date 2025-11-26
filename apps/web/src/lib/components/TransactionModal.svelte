<script lang="ts">
  import type { Transaction, TransactionType, CreateTransactionRequest } from '@basic-budget/types'
  import Modal from './Modal.svelte'
  import Button from './Button.svelte'
  import Input from './Input.svelte'
  import Select from './Select.svelte'
  import { activeCategories, incomeStreamsStore } from '$stores'

  interface Props {
    open: boolean
    onClose: () => void
    onSave: (data: CreateTransactionRequest) => Promise<void>
    transaction?: Transaction
  }

  let { open, onClose, onSave, transaction }: Props = $props()

  let type = $state<TransactionType>(transaction?.type ?? 'expense')
  let categoryId = $state(transaction?.category_id ?? '')
  let amount = $state(transaction ? (transaction.amount_cents / 100).toString() : '')
  let date = $state(transaction?.date ?? new Date().toISOString().split('T')[0])
  let description = $state(transaction?.description ?? '')
  let merchant = $state(transaction?.merchant ?? '')
  let incomeStreamId = $state(transaction?.income_stream_id ?? '')
  let saving = $state(false)
  let error = $state<string | null>(null)

  const typeOptions = [
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
    { value: 'transfer', label: 'Transfer' }
  ]

  const categoryOptions = $derived(
    $activeCategories
      .filter((cat) => cat.type === type || cat.type === 'transfer')
      .map((cat) => ({ value: cat.id, label: cat.name }))
  )

  const incomeStreamOptions = $derived(
    $incomeStreamsStore.items
      .filter((s) => s.active)
      .map((s) => ({ value: s.id, label: s.name }))
  )

  async function handleSubmit(e: Event) {
    e.preventDefault()
    error = null

    if (!categoryId || !amount || !date) {
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
      await onSave({
        type,
        category_id: categoryId,
        amount_cents: amountCents,
        currency: 'USD',
        date,
        description,
        merchant: merchant || undefined,
        income_stream_id: incomeStreamId || undefined,
        tags: []
      })
      onClose()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save transaction'
    } finally {
      saving = false
    }
  }

  function handleClose() {
    error = null
    onClose()
  }
</script>

<Modal
  {open}
  onClose={handleClose}
  title={transaction ? 'Edit Transaction' : 'New Transaction'}
  size="md"
>
  <form id="transaction-form" onsubmit={handleSubmit} class="space-y-4">
    {#if error}
      <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <p class="text-sm text-red-400">{error}</p>
      </div>
    {/if}

    <Select
      label="Type"
      options={typeOptions}
      bind:value={type}
    />

    <Select
      label="Category"
      options={categoryOptions}
      placeholder="Select a category"
      bind:value={categoryId}
    />

    {#if type === 'income'}
      <Select
        label="Income Stream (optional)"
        options={[{ value: '', label: 'None' }, ...incomeStreamOptions]}
        bind:value={incomeStreamId}
      />
    {/if}

    <Input
      label="Amount"
      type="number"
      step="0.01"
      min="0"
      placeholder="0.00"
      bind:value={amount}
    />

    <Input label="Date" type="date" bind:value={date} />

    <Input label="Description" placeholder="What was this for?" bind:value={description} />

    <Input label="Merchant (optional)" placeholder="Where did you spend?" bind:value={merchant} />
  </form>

  {#snippet footer()}
    <div class="flex items-center justify-end gap-3">
      <Button variant="ghost" type="button" onclick={handleClose}>
        Cancel
      </Button>
      <Button variant="primary" type="submit" form="transaction-form" loading={saving}>
        {transaction ? 'Update' : 'Add'} Transaction
      </Button>
    </div>
  {/snippet}
</Modal>
