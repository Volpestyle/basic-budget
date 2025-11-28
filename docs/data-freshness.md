# Data Freshness Guide

How to keep the UI showing the latest data across the app, including offline recovery.

## Goals
- Always refetch after user-visible mutations.
- Refresh when the network comes back.
- Refresh when the user returns to the tab.
- Avoid showing cached/offline data longer than necessary.

## One-time boot hooks (recommended in `apps/web/src/routes/+layout.svelte`)
1) Initialize offline storage and cache cleanup:
   ```ts
   import { initOfflineDB, setupSyncListeners, registerBackgroundSync } from '$lib/offline'

   onMount(() => {
     void initOfflineDB()
     const teardownSync = setupSyncListeners()
     void registerBackgroundSync()
     return () => teardownSync()
   })
   ```
   - `setupSyncListeners` auto-syncs queued transactions on `online` and triggers once if already online.
   - `registerBackgroundSync` lets the browser retry sync in the background (when supported).

2) Optional: global visibility/focus refresh hook:
   ```ts
   import { transactionsStore, summaryStore, currentMonthStore } from '$stores'

   function refreshActiveMonth() {
     const month = $currentMonthStore
     void Promise.all([
       transactionsStore.load({ /* inject current filters if available */ }),
       summaryStore.loadMonth(month),
     ])
   }

   onMount(() => {
     const handler = () => document.visibilityState === 'visible' && refreshActiveMonth()
     window.addEventListener('visibilitychange', handler)
     window.addEventListener('focus', handler)
     return () => {
       window.removeEventListener('visibilitychange', handler)
       window.removeEventListener('focus', handler)
     }
   })
   ```
   - Keep the current filters for transactions; store them in `transactionsStore.filters` so the reload matches the list the user sees.

## After-write refresh rules
- Transactions (`apps/web/src/lib/stores/transactions.ts`):
  - After `create/update/delete`, call `summaryStore.loadMonth($currentMonthStore)` so dashboard and budgets update immediately.
  - After `loadMore` that changes the current list, no extra refresh needed.
  - On offline queueing, surface `pendingCount` and trigger a refresh when the queue drains (see below).
- Budgets (`apps/web/src/lib/routes/budgets/+page.svelte`): Already reloads summary + budgets after `bulkUpsert`; keep as-is.
- Income Streams / Recurring (`apps/web/src/lib/stores/incomeStreams.ts`, `apps/web/src/lib/stores/recurring.ts`):
  - Already refresh `summaryStore` after mutations; ensure errors are surfaced to users if refresh fails.
- Categories (`apps/web/src/lib/stores/categories.ts`):
  - No freshness coupling, but if categories affect current views (e.g., filters), consider reloading transactions with current filters after creates/archives.

## Offline queue and cache behavior
- `transactionsStore.load`:
  - If offline, shows cached transactions and flags `offline: true`.
  - On network errors it falls back to cache. Without a later refresh, UI stays stale. The `setupSyncListeners` hook above is required to recover.
- `transactionsStore.create` while offline:
  - Adds an optimistic item and increments `pendingCount`.
  - Queue is pushed to IndexedDB; must be flushed on reconnect.
- `syncPendingTransactions` (from `apps/web/src/lib/offline/sync.ts`):
  - Run on `online` and at boot; after it completes, re-run:
    ```ts
    await Promise.all([
      transactionsStore.load(transactionsStore.getFilters?.() ?? {}),
      summaryStore.loadMonth($currentMonthStore),
    ])
    ```
  - If you add `getFilters` to the store, you can reuse the user’s current filters for the reload.

## Page-level refresh patterns
- Month-scoped pages already react to `$currentMonthStore` and call `loadData()` inside `$effect` (`dashboard`, `transactions`, `budgets`). Keep that pattern consistent in new pages.
- If a page holds local filters (e.g., search/type/category), expose a `reload()` that reuses the current filter state and call it from:
  - Visibility/focus handlers (optional).
  - Post-sync handlers (after offline queue flush).

## Quick checklist
- [ ] `+layout.svelte` calls `initOfflineDB`, `setupSyncListeners` (with cleanup), and optionally `registerBackgroundSync`.
- [ ] `transactionsStore` refreshes `summaryStore` after create/update/delete and exposes current filters for reloads.
- [ ] After `syncPendingTransactions`, re-run `transactionsStore.load(currentFilters)` and `summaryStore.loadMonth(currentMonth)`.
- [ ] Visibility/focus listeners reload active month data (optional but recommended).
- [ ] Error states surface toasts/banners when refresh fails so users know they might be seeing stale data.
