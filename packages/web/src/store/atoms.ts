import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Types
export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  budgeted: number;
  actual: number;
  color: string;
  icon?: string;
}

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  categoryId: string;
  accountId?: string;
}

export interface BankAccount {
  id: string;
  institution: string;
  name: string;
  balance: number;
  type: 'checking' | 'savings' | 'credit';
  lastSync?: Date;
}

export interface Budget {
  id: string;
  month: string; // YYYY-MM format
  categories: Category[];
  totalIncome: number;
  totalExpenses: number;
  savedAmount: number;
}

export interface Paystub {
  id: string;
  date: Date;
  grossPay: number;
  netPay: number;
  deductions: Record<string, number>;
  fileName: string;
  uploadDate: Date;
}

// Atoms
export const currentBudgetAtom = atomWithStorage<Budget | null>('currentBudget', null);

export const categoriesAtom = atomWithStorage<Category[]>('categories', [
  { id: '1', name: 'Salary', type: 'income', budgeted: 5000, actual: 0, color: '#10b981' },
  { id: '2', name: 'Freelance', type: 'income', budgeted: 1000, actual: 0, color: '#3b82f6' },
  { id: '3', name: 'Housing', type: 'expense', budgeted: 1500, actual: 0, color: '#ef4444' },
  { id: '4', name: 'Food', type: 'expense', budgeted: 600, actual: 0, color: '#f59e0b' },
  { id: '5', name: 'Transportation', type: 'expense', budgeted: 400, actual: 0, color: '#8b5cf6' },
  { id: '6', name: 'Utilities', type: 'expense', budgeted: 200, actual: 0, color: '#6366f1' },
  { id: '7', name: 'Entertainment', type: 'expense', budgeted: 300, actual: 0, color: '#ec4899' },
  { id: '8', name: 'Healthcare', type: 'expense', budgeted: 200, actual: 0, color: '#14b8a6' },
]);

export const transactionsAtom = atomWithStorage<Transaction[]>('transactions', []);

export const bankAccountsAtom = atomWithStorage<BankAccount[]>('bankAccounts', []);

export const paystubsAtom = atomWithStorage<Paystub[]>('paystubs', []);

// Derived atoms
export const totalIncomeAtom = atom((get) => {
  const categories = get(categoriesAtom);
  return categories
    .filter(c => c.type === 'income')
    .reduce((sum, c) => sum + c.budgeted, 0);
});

export const totalExpensesAtom = atom((get) => {
  const categories = get(categoriesAtom);
  return categories
    .filter(c => c.type === 'expense')
    .reduce((sum, c) => sum + c.budgeted, 0);
});

export const totalSavingsAtom = atom((get) => {
  const income = get(totalIncomeAtom);
  const expenses = get(totalExpensesAtom);
  return income - expenses;
});

export const actualSpendingAtom = atom((get) => {
  const categories = get(categoriesAtom);
  return categories
    .filter(c => c.type === 'expense')
    .reduce((sum, c) => sum + c.actual, 0);
});

export const budgetHealthAtom = atom((get) => {
  const budgeted = get(totalExpensesAtom);
  const actual = get(actualSpendingAtom);
  
  if (actual === 0) return 'neutral';
  const percentage = (actual / budgeted) * 100;
  
  if (percentage <= 80) return 'excellent';
  if (percentage <= 95) return 'good';
  if (percentage <= 100) return 'warning';
  return 'danger';
});

// UI State atoms
export const sidebarCollapsedAtom = atomWithStorage('sidebarCollapsed', false);
export const selectedMonthAtom = atom(new Date().toISOString().slice(0, 7));
export const modalOpenAtom = atom<string | null>(null);