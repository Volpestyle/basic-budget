<!--
  Liquid UI Demo Page
  
  This page demonstrates all the liquid UI components and interactions.
  Use this as a reference for implementing liquid animations throughout the app.
-->
<script lang="ts">
  import {
    Button,
    ButtonGroup,
    LiquidPanel,
    LiquidModal,
    LiquidDrawer,
    LiquidMenu,
    SplitButton,
    SelectionToolbar,
  } from '$components'
  import { liquidEnter, liquidStagger } from '$lib/motion/actions'

  let modalOpen = $state(false)
  let drawerOpen = $state(false)
  let selectedItems = $state(0)
  let selectedTab = $state('overview')

  function handleSave() {
    console.log('Save clicked')
  }

  function handleSaveClose() {
    console.log('Save & Close clicked')
  }

  function handleSaveDraft() {
    console.log('Save as Draft clicked')
  }

  function handleDelete() {
    console.log('Delete', selectedItems, 'items')
    selectedItems = 0
  }

  function handleExport() {
    console.log('Export', selectedItems, 'items')
  }
</script>

<div class="container mx-auto px-4 py-8 space-y-12">
  <!-- Header -->
  <header use:liquidEnter>
    <h1 class="text-3xl font-display font-bold text-ink-900 dark:text-white mb-2">
      Liquid UI Demo
    </h1>
    <p class="text-sm text-ink-900/60 dark:text-white/60">
      Explore all the liquid UI components and interactions
    </p>
  </header>

  <!-- Button Examples -->
  <section>
    <LiquidPanel>
      <h2 class="text-xl font-display font-bold text-ink-900 dark:text-white mb-4">Buttons</h2>

      <div class="space-y-6">
        <!-- Basic buttons with liquid animations -->
        <div>
          <h3 class="text-sm font-bold text-ink-900 dark:text-white mb-3">
            Basic Buttons (with liquid hover/press)
          </h3>
          <div class="flex flex-wrap gap-3">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="danger">Danger Button</Button>
          </div>
        </div>

        <!-- Button Group with morphing selection -->
        <div>
          <h3 class="text-sm font-bold text-ink-900 dark:text-white mb-3">
            Button Group (morphing selection highlight)
          </h3>
          <div class="inline-flex">
            <div class="flex gap-1 bg-cream-200 dark:bg-ink-800 rounded-md p-1">
              {#each ['overview', 'details', 'settings'] as tab}
                <button
                  class="button-group-item px-4 py-2 text-sm font-mono rounded transition-colors {selectedTab ===
                  tab
                    ? 'text-cream-50 dark:text-ink-900'
                    : 'text-ink-900/60 dark:text-white/60 hover:text-ink-900 dark:hover:text-white'}"
                  data-value={tab}
                  data-selected={selectedTab === tab}
                  onclick={() => (selectedTab = tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <!-- Split Button -->
        <div>
          <h3 class="text-sm font-bold text-ink-900 dark:text-white mb-3">
            Split Button (merge/split behavior)
          </h3>
          <SplitButton
            primary={{ label: 'Save', action: handleSave }}
            options={[
              { label: 'Save & Close', action: handleSaveClose },
              { label: 'Save as Draft', action: handleSaveDraft },
            ]}
          />
        </div>
      </div>
    </LiquidPanel>
  </section>

  <!-- Modal & Drawer Examples -->
  <section>
    <LiquidPanel enterFrom="bottom" delay={0.1}>
      <h2 class="text-xl font-display font-bold text-ink-900 dark:text-white mb-4">
        Modals & Drawers
      </h2>

      <div class="flex flex-wrap gap-3">
        <Button onclick={() => (modalOpen = true)}>Open Modal</Button>
        <Button onclick={() => (drawerOpen = true)} variant="secondary">Open Drawer</Button>
      </div>
    </LiquidPanel>
  </section>

  <!-- Menu Example -->
  <section>
    <LiquidPanel enterFrom="bottom" delay={0.2}>
      <h2 class="text-xl font-display font-bold text-ink-900 dark:text-white mb-4">
        Dropdown Menu
      </h2>

      <LiquidMenu align="left">
        {#snippet trigger()}
          <Button variant="ghost">
            Open Menu
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 ml-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        {/snippet}

        <button class="liquid-menu-item">Profile</button>
        <button class="liquid-menu-item">Settings</button>
        <div class="border-t border-ink-900/10 dark:border-white/10 my-1"></div>
        <button class="liquid-menu-item">Logout</button>
      </LiquidMenu>
    </LiquidPanel>
  </section>

  <!-- Selection Toolbar Example -->
  <section>
    <LiquidPanel enterFrom="bottom" delay={0.3}>
      <h2 class="text-xl font-display font-bold text-ink-900 dark:text-white mb-4">
        Selection Toolbar
      </h2>

      <p class="text-sm text-ink-900/60 dark:text-white/60 mb-4">
        Click items below to see the selection toolbar appear from the bottom
      </p>

      <div use:liquidStagger class="grid grid-cols-2 md:grid-cols-4 gap-3">
        {#each Array(8) as _, i}
          <button
            class="p-4 bg-cream-200 dark:bg-ink-800 rounded-lg border-2 transition-colors {selectedItems >
            i
              ? 'border-ink-900 dark:border-white'
              : 'border-transparent'}"
            onclick={() => (selectedItems = selectedItems > i ? 0 : i + 1)}
          >
            <div class="text-sm font-mono">Item {i + 1}</div>
          </button>
        {/each}
      </div>
    </LiquidPanel>
  </section>

  <!-- Staggered Cards Example -->
  <section>
    <h2
      class="text-xl font-display font-bold text-ink-900 dark:text-white mb-4"
      use:liquidEnter={{ delay: 0.4 }}
    >
      Staggered Entrance
    </h2>

    <div use:liquidStagger={{ stagger: 0.08 }} class="grid md:grid-cols-3 gap-4">
      {#each ['Feature 1', 'Feature 2', 'Feature 3'] as feature}
        <div
          class="bg-cream-50 dark:bg-ink-900 border border-ink-900/10 dark:border-white/10 rounded-lg p-5"
        >
          <h3 class="text-base font-bold text-ink-900 dark:text-white mb-2">{feature}</h3>
          <p class="text-sm text-ink-900/60 dark:text-white/60">
            This card enters with a staggered animation along with its siblings.
          </p>
        </div>
      {/each}
    </div>
  </section>
</div>

<!-- Modal -->
<LiquidModal open={modalOpen} onClose={() => (modalOpen = false)} title="Example Modal" size="md">
  <div class="space-y-4">
    <p class="text-sm text-ink-900 dark:text-white">
      This modal enters with a liquid animation. The background blurs and the content expands in
      with an elastic ease.
    </p>
    <p class="text-sm text-ink-900/60 dark:text-white/60">
      Try pressing Escape or clicking outside to close it with the exit animation.
    </p>
  </div>

  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="ghost" onclick={() => (modalOpen = false)}>Cancel</Button>
      <Button onclick={() => (modalOpen = false)}>Confirm</Button>
    </div>
  {/snippet}
</LiquidModal>

<!-- Drawer -->
<LiquidDrawer open={drawerOpen} onClose={() => (drawerOpen = false)} title="Example Drawer">
  <div class="space-y-4">
    <p class="text-sm text-ink-900 dark:text-white">
      This drawer slides in from the side with children staggering in.
    </p>
    <div class="p-4 bg-cream-200 dark:bg-ink-800 rounded">
      <p class="text-sm">Item 1</p>
    </div>
    <div class="p-4 bg-cream-200 dark:bg-ink-800 rounded">
      <p class="text-sm">Item 2</p>
    </div>
    <div class="p-4 bg-cream-200 dark:bg-ink-800 rounded">
      <p class="text-sm">Item 3</p>
    </div>
  </div>
</LiquidDrawer>

<!-- Selection Toolbar -->
<SelectionToolbar selectedCount={selectedItems}>
  {#snippet children()}
    <Button size="sm" variant="ghost" onclick={handleDelete}>Delete</Button>
    <Button size="sm" variant="ghost" onclick={handleExport}>Export</Button>
    <Button size="sm" variant="ghost" onclick={() => (selectedItems = 0)}>Clear</Button>
  {/snippet}
</SelectionToolbar>
