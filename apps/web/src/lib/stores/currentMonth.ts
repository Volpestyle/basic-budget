import { writable, derived } from 'svelte/store'

function formatMonth(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function parseMonth(monthStr: string): Date {
  const parts = monthStr.split('-').map(Number)
  const year = parts[0] ?? new Date().getFullYear()
  const month = parts[1] ?? 1
  return new Date(year, month - 1, 1)
}

function createCurrentMonthStore() {
  const now = new Date()
  const { subscribe, set, update } = writable<string>(formatMonth(now))

  return {
    subscribe,

    set(month: string) {
      set(month)
    },

    nextMonth() {
      update((current) => {
        const date = parseMonth(current)
        date.setMonth(date.getMonth() + 1)
        return formatMonth(date)
      })
    },

    previousMonth() {
      update((current) => {
        const date = parseMonth(current)
        date.setMonth(date.getMonth() - 1)
        return formatMonth(date)
      })
    },

    goToToday() {
      set(formatMonth(new Date()))
    }
  }
}

export const currentMonthStore = createCurrentMonthStore()

export const currentMonthDisplay = derived(currentMonthStore, ($month) => {
  const date = parseMonth($month)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

export const currentMonthDate = derived(currentMonthStore, ($month) => parseMonth($month))
