<script lang="ts">
  import type { Transaction, CreateTransactionRequest, TransactionFilters } from '@basic-budget/types'
  import Header from '$components/Header.svelte'
  import Card from '$components/Card.svelte'
  import Button from '$components/Button.svelte'
  import Input from '$components/Input.svelte'
  import Select from '$components/Select.svelte'
  import CategoryTag from '$components/CategoryTag.svelte'
  import AmountDisplay from '$components/AmountDisplay.svelte'
  import Spinner from '$components/Spinner.svelte'
  import TransactionModal from '$components/TransactionModal.svelte'
  import {
    transactionsStore,
    categoriesStore,
    categoriesById,
    activeCategories,
    incomeStreamsStore,
    currentMonthStore,
    authReady
  } from '$stores'

  let showModal = $state(false)
  let editingTransaction = $state<Transaction | undefined>(undefined)
  let filters = $state<TransactionFilters>({})

  // Filter states
  let searchQuery = $state('')
  let selectedCategory = $state('')
  let selectedType = $state('')

  async function loadData() {
    // Get date range for current month
    const parts = $currentMonthStore.split('-')
    const year = parts[0] ?? String(new Date().getFullYear())
    const month = parts[1] ?? '01'
    const from = `${year}-${month}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

    const loadFilters = { from, to }
    filters = loadFilters

    await Promise.all([
      transactionsStore.load(loadFilters),
      categoriesStore.load(),
      incomeStreamsStore.load()
    ])
  }

  async function handleSave(data: CreateTransactionRequest) {
    if (editingTransaction) {
      await transactionsStore.update(editingTransaction.id, data)
    } else {
      await transactionsStore.create(data)
    }
  }

  function openNewModal() {
    editingTransaction = undefined
    showModal = true
  }

  function openEditModal(tx: Transaction) {
    editingTransaction = tx
    showModal = true
  }

  const categoryOptions = $derived([
    { value: '', label: 'All Categories' },
    ...$activeCategories.map((cat) => ({ value: cat.id, label: cat.name }))
  ])

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
    { value: 'transfer', label: 'Transfer' }
  ]

  // Extract store items to derived value first (avoids issues with store subscriptions inside $derived.by)
  const transactionItems = $derived($transactionsStore.items)

  const filteredTransactions = $derived.by(() => {
    let transactions = transactionItems

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      transactions = transactions.filter(
        (tx) =>
          tx.description.toLowerCase().includes(query) ||
          tx.merchant.toLowerCase().includes(query)
      )
    }

    if (selectedCategory) {
      transactions = transactions.filter((tx) => tx.category_id === selectedCategory)
    }

    if (selectedType) {
      transactions = transactions.filter((tx) => tx.type === selectedType)
    }

    return transactions
  })

  const groupedTransactions = $derived.by(() => {
    const grouped: Record<string, Transaction[]> = {}
    for (const tx of filteredTransactions) {
      if (!grouped[tx.date]) {
        grouped[tx.date] = []
      }
      const dateGroup = grouped[tx.date]
      if (dateGroup) {
        dateGroup.push(tx)
      }
    }
    return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a))
  })

  // Load when auth is ready and month changes
  $effect(() => {
    if (!$authReady) return
    // dependency on month
    $currentMonthStore
    void loadData()
  })
</script>

<svelte:head>
  <title>Transactions - Basic Budget</title>
</svelte:head>

<Header title="Transactions" showMonthPicker>
  {#snippet actions()}
    <Button variant="primary" onclick={openNewModal}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Add
    </Button>
  {/snippet}
</Header>

<div class="p-6 space-y-6">
  <!-- Filters -->
  <Card variant="glass" padding="md">
    <div class="flex flex-col md:flex-row gap-4">
      <div class="flex-1">
        <Input placeholder="Search transactions..." bind:value={searchQuery} />
      </div>
      <div class="w-full md:w-48">
        <Select options={categoryOptions} bind:value={selectedCategory} />
      </div>
      <div class="w-full md:w-40">
        <Select options={typeOptions} bind:value={selectedType} />
      </div>
    </div>
  </Card>

  <!-- Transactions list -->
  {#if $transactionsStore.loading}
    <div class="flex items-center justify-center py-20">
      <Spinner size="lg" />
    </div>
  {:else if groupedTransactions.length === 0}
    <div class="text-center py-20">
      <p class="text-gray-400 mb-4">No transactions found</p>
      <Button variant="primary" onclick={openNewModal}>Add your first transaction</Button>
    </div>
  {:else}
    <div class="space-y-6">
      {#each groupedTransactions as [date, transactions]}
        <div>
          <h3 class="text-sm font-medium text-gray-400 mb-3">
            {new Date(date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </h3>
          <Card variant="default" padding="none">
            <div class="divide-y divide-white/5">
              {#each transactions as tx}
                {@const category = $categoriesById[tx.category_id]}
                <button
                  type="button"
                  class="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
                  onclick={() => openEditModal(tx)}
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-white font-medium truncate">{tx.description || tx.merchant || 'Transaction'}</p>
                    <div class="flex items-center gap-2 mt-1">
                      {#if category}
                        <CategoryTag name={category.name} color={category.color} size="sm" />
                      {/if}
                      {#if tx.merchant && tx.description}
                        <span class="text-xs text-gray-500">{tx.merchant}</span>
                      {/if}
                    </div>
                  </div>
                  <AmountDisplay
                    cents={tx.amount_cents}
                    type={tx.type === 'expense' ? 'expense' : tx.type === 'income' ? 'income' : 'default'}
                  />
                </button>
              {/each}
            </div>
          </Card>
        </div>
      {/each}
    </div>

    {#if $transactionsStore.hasMore}
      <div class="text-center">
        <Button variant="ghost" onclick={() => transactionsStore.loadMore()} loading={$transactionsStore.loading}>
          Load more
        </Button>
      </div>
    {/if}
  {/if}
</div>

<!-- Floating add button (mobile) -->
<button
  type="button"
  class="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-primary-500 text-background rounded-full shadow-lg shadow-primary-500/30 flex items-center justify-center z-30"
  onclick={openNewModal}
  aria-label="Add transaction"
>
  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
  </svg>
</button>

<TransactionModal
  open={showModal}
  onClose={() => (showModal = false)}
  onSave={handleSave}
  transaction={editingTransaction}
/>
