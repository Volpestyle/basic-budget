<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import type { UpdateUserRequest, CreateCategoryRequest } from '@basic-budget/types'
  import Header from '$components/Header.svelte'
  import Card from '$components/Card.svelte'
  import Button from '$components/Button.svelte'
  import Input from '$components/Input.svelte'
  import Select from '$components/Select.svelte'
  import LiquidModal from '$components/LiquidModal.svelte'
  import Spinner from '$components/Spinner.svelte'
  import { authStore, currentUser, categoriesStore, activeCategories, authReady } from '$stores'
  import { usersApi } from '$api'

  let saving = $state(false)
  let showCategoryModal = $state(false)
  let categoryError = $state<string | null>(null)

  // User settings
  let displayName = $state('')
  let currency = $state('USD')
  let locale = $state('en-US')

  // New category form
  let newCategoryName = $state('')
  let newCategoryType = $state<'expense' | 'income'>('expense')
  let newCategoryColor = $state('#00F5D4')

  onMount(() => {
    const maybeLoad = () => {
      if ($authReady) {
        void categoriesStore.load()
      }
    }

    maybeLoad()

    const unsubscribeAuth = authReady.subscribe(maybeLoad)
    const unsubscribeUser = currentUser.subscribe((user) => {
      if (user) {
        displayName = user.display_name
        currency = user.default_currency
        locale = user.locale
      }
    })

    return () => {
      unsubscribeAuth()
      unsubscribeUser()
    }
  })

  async function saveSettings() {
    saving = true
    try {
      const data: UpdateUserRequest = {
        display_name: displayName,
        default_currency: currency,
        locale
      }
      const updated = await usersApi.updateMe(data)
      authStore.updateUser(updated)
    } catch (err) {
      console.error('Failed to save settings:', err)
    } finally {
      saving = false
    }
  }

  function handleLogout() {
    authStore.logout()
    goto('/auth')
  }

  async function createCategory() {
    categoryError = null

    if (!newCategoryName) {
      categoryError = 'Please enter a category name'
      return
    }

    try {
      const data: CreateCategoryRequest = {
        name: newCategoryName,
        type: newCategoryType,
        color: newCategoryColor,
        icon: 'tag'
      }
      await categoriesStore.create(data)
      showCategoryModal = false
      newCategoryName = ''
      newCategoryType = 'expense'
      newCategoryColor = '#00F5D4'
    } catch (err) {
      categoryError = err instanceof Error ? err.message : 'Failed to create category'
    }
  }

  async function archiveCategory(id: string) {
    if (confirm('Are you sure you want to archive this category?')) {
      await categoriesStore.archive(id)
    }
  }

  const currencyOptions = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'CAD', label: 'CAD - Canadian Dollar' },
    { value: 'AUD', label: 'AUD - Australian Dollar' }
  ]

  const localeOptions = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'es-ES', label: 'Spanish' },
    { value: 'fr-FR', label: 'French' },
    { value: 'de-DE', label: 'German' }
  ]

  const categoryTypeOptions = [
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' }
  ]

  const colorOptions = [
    '#00F5D4', '#9B5DE5', '#F15BB5', '#FEE440', '#00BBF9',
    '#22c55e', '#ef4444', '#f59e0b', '#6366f1', '#ec4899'
  ]
</script>

<svelte:head>
  <title>Settings - Basic Budget</title>
</svelte:head>

<Header title="Settings" />

<div class="p-6 space-y-8 max-w-2xl">
  <!-- Profile Settings -->
  <section>
    <h2 class="text-lg font-semibold text-white mb-4">Profile</h2>
    <Card variant="default" padding="lg">
      <div class="space-y-4">
        {#if $currentUser}
          <div class="flex items-center gap-4 pb-4 border-b border-white/10">
            {#if $currentUser.avatar_url}
              <img
                src={$currentUser.avatar_url}
                alt={$currentUser.display_name}
                class="w-16 h-16 rounded-full"
              />
            {:else}
              <div class="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center">
                <span class="text-2xl font-semibold text-primary-400">
                  {$currentUser.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
            {/if}
            <div>
              <p class="text-white font-medium">{$currentUser.email}</p>
              <p class="text-sm text-gray-400">Signed in with Google</p>
            </div>
          </div>
        {/if}

        <Input label="Display Name" bind:value={displayName} />

        <Select label="Currency" options={currencyOptions} bind:value={currency} />

        <Select label="Locale" options={localeOptions} bind:value={locale} />

        <div class="pt-4">
          <Button variant="primary" onclick={saveSettings} loading={saving}>
            Save Changes
          </Button>
        </div>
      </div>
    </Card>
  </section>

  <!-- Categories -->
  <section>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-white">Categories</h2>
      <Button variant="ghost" size="sm" onclick={() => (showCategoryModal = true)}>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Category
      </Button>
    </div>

    <Card variant="default" padding="none">
      {#if $categoriesStore.loading}
        <div class="p-8 text-center">
          <Spinner size="md" />
        </div>
      {:else if $activeCategories.length === 0}
        <div class="p-8 text-center">
          <p class="text-gray-400">No categories yet</p>
        </div>
      {:else}
        <div class="divide-y divide-white/5">
          {#each $activeCategories as category}
            <div class="flex items-center justify-between p-4">
              <div class="flex items-center gap-3">
                <span
                  class="w-4 h-4 rounded-full"
                  style="background-color: {category.color};"
                ></span>
                <span class="text-white">{category.name}</span>
                <span class="text-xs text-gray-500 px-2 py-0.5 bg-white/5 rounded">
                  {category.type}
                </span>
              </div>
              <button
                type="button"
                class="text-sm text-gray-400 hover:text-red-400 transition-colors"
                onclick={() => archiveCategory(category.id)}
              >
                Archive
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  </section>

  <!-- Danger Zone -->
  <section>
    <h2 class="text-lg font-semibold text-white mb-4">Account</h2>
    <Card variant="bordered" padding="lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-white font-medium">Sign out</p>
          <p class="text-sm text-gray-400">Sign out of your account on this device</p>
        </div>
        <Button variant="danger" onclick={handleLogout}>
          Sign Out
        </Button>
      </div>
    </Card>
  </section>
</div>

<!-- New Category Modal -->
<LiquidModal
  open={showCategoryModal}
  onClose={() => (showCategoryModal = false)}
  title="New Category"
  size="sm"
>
  <form id="new-category-form" onsubmit={(e) => { e.preventDefault(); createCategory(); }} class="space-y-4">
    {#if categoryError}
      <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <p class="text-sm text-red-400">{categoryError}</p>
      </div>
    {/if}

    <Input label="Name" placeholder="e.g., Groceries" bind:value={newCategoryName} />

    <Select label="Type" options={categoryTypeOptions} bind:value={newCategoryType} />

    <div class="space-y-2">
      <span class="block text-sm font-medium text-gray-300">Color</span>
      <div class="flex flex-wrap gap-2">
        {#each colorOptions as color}
          <button
            type="button"
            class="w-8 h-8 rounded-full border-2 transition-all {newCategoryColor === color ? 'border-white scale-110' : 'border-transparent'}"
            style="background-color: {color};"
            onclick={() => (newCategoryColor = color)}
            aria-label="Select color {color}"
          ></button>
        {/each}
      </div>
    </div>
  </form>

  {#snippet footer()}
    <div class="flex items-center justify-end gap-3">
      <Button variant="ghost" type="button" onclick={() => (showCategoryModal = false)}>
        Cancel
      </Button>
      <Button variant="primary" type="submit" form="new-category-form">
        Create Category
      </Button>
    </div>
  {/snippet}
</LiquidModal>
