import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export interface ExpenseCategory {
  id: string;
  name: string;
  budgeted: number;
  spent: number;
  color: string;
}

export interface Transaction {
  id: string;
  categoryId: string;
  amount: number;
  description: string;
  date: string;
  type: 'income' | 'expense';
}

// Persistent atoms using localStorage
export const incomeAtom = atomWithStorage('budget-income', 3500);
export const categoriesAtom = atomWithStorage<ExpenseCategory[]>('budget-categories', [
  { id: '1', name: 'Housing', budgeted: 1200, spent: 1200, color: 'var(--chart-1)' },
  { id: '2', name: 'Food', budgeted: 400, spent: 320, color: 'var(--chart-2)' },
  { id: '3', name: 'Transportation', budgeted: 300, spent: 280, color: 'var(--chart-3)' },
  { id: '4', name: 'Utilities', budgeted: 200, spent: 180, color: 'var(--chart-4)' },
  { id: '5', name: 'Entertainment', budgeted: 150, spent: 120, color: 'var(--chart-5)' },
]);

export const transactionsAtom = atomWithStorage<Transaction[]>('budget-transactions', []);

// Derived atoms for computed values
export const totalBudgetedAtom = atom((get) => {
  const categories = get(categoriesAtom);
  return categories.reduce((sum, cat) => sum + cat.budgeted, 0);
});

export const totalSpentAtom = atom((get) => {
  const categories = get(categoriesAtom);
  return categories.reduce((sum, cat) => sum + cat.spent, 0);
});

export const remainingAtom = atom((get) => {
  const income = get(incomeAtom);
  const totalSpent = get(totalSpentAtom);
  return income - totalSpent;
});

export const budgetRemainingAtom = atom((get) => {
  const income = get(incomeAtom);
  const totalBudgeted = get(totalBudgetedAtom);
  return income - totalBudgeted;
});

export const budgetStatusAtom = atom((get) => {
  const remaining = get(remainingAtom);
  const budgetRemaining = get(budgetRemainingAtom);
  
  return {
    isOverBudget: remaining < 0,
    isOverAllocated: budgetRemaining < 0,
    healthScore: Math.max(0, Math.min(100, (remaining / get(incomeAtom)) * 100)),
  };
});

// Atoms for UI state
export const selectedCategoryIdAtom = atom<string | null>(null);
export const isAddingCategoryAtom = atom(false);
export const currentViewAtom = atom<string>('dashboard');