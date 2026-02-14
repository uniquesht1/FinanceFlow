// ==========================================
// Types - Centralized type definitions
// ==========================================

/**
 * Account represents a financial account (checking, savings, etc.)
 */
export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: string;
  starting_balance: number;
  currency: string;
  created_at: string;
}

export type AccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'investment';

/**
 * Category for organizing transactions
 */
export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  type: string;
  icon: string | null;
  is_default: boolean | null;
}

/**
 * Transaction type - income or expense
 */
export type TransactionType = 'income' | 'expense';

/**
 * Transaction record
 */
export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  note: string | null;
  title: string | null;
  created_at: string;
  // Joined relations
  category?: Category;
  account?: Account;
}

/**
 * Date range for filtering
 */
export interface DateRange {
  from: Date | null;
  to: Date | null;
}

/**
 * Form data types for creating/editing
 */
export interface TransactionFormData {
  type: TransactionType;
  account_id: string;
  category_id: string;
  amount: string;
  date: string;
  note: string;
}

export interface AccountFormData {
  name: string;
  type: AccountType;
  starting_balance: string;
  currency: string;
}

export interface CategoryFormData {
  name: string;
  type: TransactionType;
}
