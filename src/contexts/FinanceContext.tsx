import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Account, Category, Transaction, DateRange } from '@/types';

// ==========================================
// Context Types
// ==========================================

interface FinanceContextType {
  // Data
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  
  // Filters
  selectedAccountId: string | null;
  selectedCurrency: string | null;
  dateRange: DateRange;
  
  // Computed
  availableCurrencies: string[];
  
  // State
  loading: boolean;
  
  // Filter actions
  setSelectedAccountId: (id: string | null) => void;
  setSelectedCurrency: (currency: string | null) => void;
  setDateRange: (range: DateRange) => void;
  
  // Data actions
  refreshData: () => Promise<void>;
  
  // Account CRUD
  addAccount: (account: Omit<Account, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateAccount: (id: string, account: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  
  // Category CRUD
  addCategory: (category: Omit<Category, 'id' | 'user_id' | 'is_default'>) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Transaction CRUD
  addTransaction: (transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'category' | 'account'>) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addTransfer: (fromAccountId: string, toAccountId: string, amount: number, title?: string, note?: string, date?: string) => Promise<void>;
}

// ==========================================
// Context & Hook
// ==========================================

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const useFinance = (): FinanceContextType => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};

// ==========================================
// Provider Component
// ==========================================

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountIdState] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [loading, setLoading] = useState(true);

  // Compute available currencies from accounts
  const availableCurrencies = React.useMemo(() => {
    const currencies = [...new Set(accounts.map(a => a.currency))];
    return currencies.sort();
  }, [accounts]);

  // Auto-select first currency when accounts load and no currency is selected
  React.useEffect(() => {
    if (availableCurrencies.length > 0 && selectedCurrency === null && selectedAccountId === null) {
      setSelectedCurrency(availableCurrencies[0]);
    }
  }, [availableCurrencies, selectedCurrency, selectedAccountId]);

  // When selecting an account, auto-set currency; when selecting "All", default to first currency
  const setSelectedAccountId = (id: string | null) => {
    setSelectedAccountIdState(id);
    if (id === null) {
      // "All Accounts" selected - default to first available currency
      if (availableCurrencies.length > 0) {
        setSelectedCurrency(availableCurrencies[0]);
      }
    } else {
      // Specific account selected - set its currency
      const account = accounts.find(a => a.id === id);
      if (account) {
        setSelectedCurrency(account.currency);
      }
    }
  };

  // ==========================================
  // Data Fetching
  // ==========================================

  const fetchData = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setCategories([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [accountsResult, categoriesResult, transactionsResult] = await Promise.all([
        supabase.from('accounts').select('*').order('created_at', { ascending: true }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
        supabase.from('transactions')
          .select('*, category:categories(*), account:accounts(*)')
          .order('date', { ascending: false }),
      ]);

      if (accountsResult.error) throw accountsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      if (transactionsResult.error) throw transactionsResult.error;

      setAccounts(accountsResult.data ?? []);
      setCategories((categoriesResult.data ?? []) as Category[]);
      setTransactions((transactionsResult.data ?? []) as Transaction[]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({ title: 'Error loading data', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ==========================================
  // Helper for error handling
  // ==========================================

  const handleError = (error: unknown, action: string) => {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    toast({ title: `Error ${action}`, description: message, variant: 'destructive' });
  };

  const handleSuccess = (message: string) => {
    toast({ title: message });
  };

  // ==========================================
  // Account Operations
  // ==========================================

  const addAccount = async (account: Omit<Account, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    const { error } = await supabase.from('accounts').insert({ ...account, user_id: user.id });
    if (error) return handleError(error, 'creating account');
    handleSuccess('Account created successfully');
    await fetchData();
  };

  const updateAccount = async (id: string, account: Partial<Account>) => {
    const { error } = await supabase.from('accounts').update(account).eq('id', id);
    if (error) return handleError(error, 'updating account');
    handleSuccess('Account updated successfully');
    await fetchData();
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) return handleError(error, 'deleting account');
    handleSuccess('Account deleted successfully');
    await fetchData();
  };

  // ==========================================
  // Category Operations
  // ==========================================

  const addCategory = async (category: Omit<Category, 'id' | 'user_id' | 'is_default'>) => {
    if (!user) return;
    const { error } = await supabase
      .from('categories')
      .insert({ ...category, user_id: user.id, is_default: false });
    if (error) return handleError(error, 'creating category');
    handleSuccess('Category created successfully');
    await fetchData();
  };

  const updateCategory = async (id: string, category: Partial<Category>) => {
    const { error } = await supabase.from('categories').update(category).eq('id', id);
    if (error) return handleError(error, 'updating category');
    handleSuccess('Category updated successfully');
    await fetchData();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) return handleError(error, 'deleting category');
    handleSuccess('Category deleted successfully');
    await fetchData();
  };

  // ==========================================
  // Transaction Operations
  // ==========================================

  const addTransaction = async (
    transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'category' | 'account'>
  ) => {
    if (!user) return;
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      account_id: transaction.account_id,
      category_id: transaction.category_id,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date,
      note: transaction.note,
      title: transaction.title,
    });
    if (error) return handleError(error, 'adding transaction');
    handleSuccess('Transaction added successfully');
    await fetchData();
  };

  const updateTransaction = async (id: string, transaction: Partial<Transaction>) => {
    const { error } = await supabase
      .from('transactions')
      .update({
        account_id: transaction.account_id,
        category_id: transaction.category_id,
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date,
        note: transaction.note,
        title: transaction.title,
      })
      .eq('id', id);
    if (error) return handleError(error, 'updating transaction');
    handleSuccess('Transaction updated successfully');
    await fetchData();
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) return handleError(error, 'deleting transaction');
    handleSuccess('Transaction deleted successfully');
    await fetchData();
  };

  // ==========================================
  // Transfer Operation
  // ==========================================

  const addTransfer = async (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    title?: string,
    note?: string,
    date?: string
  ) => {
    if (!user) return;
    const transferTitle = title ? `[Transfer] ${title}` : '[Transfer]';
    const transferDate = date || new Date().toISOString();

    const { error: expError } = await supabase.from('transactions').insert({
      user_id: user.id,
      account_id: fromAccountId,
      type: 'expense',
      amount,
      title: transferTitle,
      note,
      date: transferDate,
    });

    if (expError) return handleError(expError, 'creating transfer');

    const { error: incError } = await supabase.from('transactions').insert({
      user_id: user.id,
      account_id: toAccountId,
      type: 'income',
      amount,
      title: transferTitle,
      note,
      date: transferDate,
    });

    if (incError) return handleError(incError, 'creating transfer');

    handleSuccess('Transfer completed successfully');
    await fetchData();
  };

  // ==========================================
  // Render
  // ==========================================

  const value: FinanceContextType = {
    accounts,
    categories,
    transactions,
    selectedAccountId,
    selectedCurrency,
    dateRange,
    availableCurrencies,
    loading,
    setSelectedAccountId,
    setSelectedCurrency,
    setDateRange,
    refreshData: fetchData,
    addAccount,
    updateAccount,
    deleteAccount,
    addCategory,
    updateCategory,
    deleteCategory,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addTransfer,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

// Re-export types for convenience
export type { Account, Category, Transaction, DateRange } from '@/types';
