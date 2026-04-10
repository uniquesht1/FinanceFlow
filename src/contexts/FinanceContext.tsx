import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  hideMoney: boolean;

  // Filter actions
  setSelectedAccountId: (id: string | null) => void;
  setSelectedCurrency: (currency: string | null) => void;
  setDateRange: (range: DateRange) => void;
  setHideMoney: (hide: boolean) => void;
  toggleHideMoney: () => void;

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
  addTransaction: (transaction: {
    account_id: string;
    category_id: string | null;
    type: 'income' | 'expense';
    amount: number;
    date: string;
    note?: string | null;
    title?: string | null;
  }) => Promise<void>;
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
  const [hideMoney, setHideMoney] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = window.localStorage.getItem('finance.hideMoney');
      if (stored === null) return true;
      return stored === 'true';
    } catch {
      return true;
    }
  });
  const fetchInFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('finance.hideMoney', String(hideMoney));
    } catch {
      // Ignore storage failures and keep in-memory state.
    }
  }, [hideMoney]);

  const toggleHideMoney = () => {
    setHideMoney((prev) => !prev);
  };

  // Compute available currencies from accounts
  const availableCurrencies = React.useMemo(() => {
    const currencies = [...new Set(accounts.map(a => a.currency))];
    return currencies.sort();
  }, [accounts]);

  // Auto-select default currency (prefer NPR) when accounts load and no currency is selected
  React.useEffect(() => {
    if (availableCurrencies.length > 0 && selectedCurrency === null && selectedAccountId === null) {
      const preferredCurrency = availableCurrencies.includes('NPR')
        ? 'NPR'
        : availableCurrencies[0];
      setSelectedCurrency(preferredCurrency);
    }
  }, [availableCurrencies, selectedCurrency, selectedAccountId]);

  // When selecting an account, auto-set currency; when selecting "All", default to NPR if available
  const setSelectedAccountId = (id: string | null) => {
    setSelectedAccountIdState(id);
    if (id === null) {
      // "All Accounts" selected - default to NPR when available
      if (availableCurrencies.length > 0) {
        const preferredCurrency = availableCurrencies.includes('NPR')
          ? 'NPR'
          : availableCurrencies[0];
        setSelectedCurrency(preferredCurrency);
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
    if (fetchInFlightRef.current) {
      return fetchInFlightRef.current;
    }

    if (!user) {
      setAccounts([]);
      setCategories([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    const request = (async () => {
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
        fetchInFlightRef.current = null;
      }
    })();

    fetchInFlightRef.current = request;
    return request;
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

  const isValidTransactionDate = (value: string) => {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp);
  };

  const sanitizeText = (value?: string | null): string | null => {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
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

  const addTransaction = async (transaction: {
    account_id: string;
    category_id: string | null;
    type: 'income' | 'expense';
    amount: number;
    date: string;
    note?: string | null;
    title?: string | null;
  }) => {
    if (!user) return;

    if (transaction.type !== 'income' && transaction.type !== 'expense') {
      handleError(new Error('Transaction type must be income or expense.'), 'adding transaction');
      return;
    }

    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      handleError(new Error('Amount must be a valid number greater than 0.'), 'adding transaction');
      return;
    }

    if (!transaction.account_id) {
      handleError(new Error('Please select an account.'), 'adding transaction');
      return;
    }

    if (!isValidTransactionDate(transaction.date)) {
      handleError(new Error('Please provide a valid transaction date.'), 'adding transaction');
      return;
    }

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      account_id: transaction.account_id,
      category_id: transaction.category_id,
      type: transaction.type,
      amount,
      date: transaction.date,
      note: sanitizeText(transaction.note),
      title: sanitizeText(transaction.title),
    });
    if (error) return handleError(error, 'adding transaction');
    handleSuccess('Transaction added successfully');
    await fetchData();
  };

  const updateTransaction = async (id: string, transaction: Partial<Transaction>) => {
    if (!id) {
      handleError(new Error('Missing transaction id.'), 'updating transaction');
      return;
    }

    if (transaction.type !== undefined && transaction.type !== 'income' && transaction.type !== 'expense') {
      handleError(new Error('Transaction type must be income or expense.'), 'updating transaction');
      return;
    }

    const existing = transactions.find((t) => t.id === id);
    if (!existing) {
      handleError(new Error('Transaction not found.'), 'updating transaction');
      return;
    }

    if (existing.is_transfer) {
      const attemptsImmutableUpdate =
        transaction.amount !== undefined ||
        transaction.type !== undefined ||
        transaction.account_id !== undefined ||
        transaction.category_id !== undefined ||
        transaction.date !== undefined;

      if (attemptsImmutableUpdate) {
        handleError(new Error('Transfer core fields are immutable. Delete and recreate the transfer to change amount/date/accounts.'), 'updating transfer');
        return;
      }
    }

    if (transaction.amount !== undefined) {
      const amount = Number(transaction.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        handleError(new Error('Amount must be a valid number greater than 0.'), 'updating transaction');
        return;
      }
    }

    if (transaction.date && !isValidTransactionDate(transaction.date)) {
      handleError(new Error('Please provide a valid transaction date.'), 'updating transaction');
      return;
    }

    const updates: Partial<Transaction> = {};
    if (transaction.account_id !== undefined) updates.account_id = transaction.account_id;
    if (transaction.category_id !== undefined) updates.category_id = transaction.category_id;
    if (transaction.type !== undefined) updates.type = transaction.type;
    if (transaction.amount !== undefined) updates.amount = Number(transaction.amount);
    if (transaction.date !== undefined) updates.date = transaction.date;
    if (transaction.note !== undefined) updates.note = sanitizeText(transaction.note);
    if (transaction.title !== undefined) updates.title = sanitizeText(transaction.title);

    const { error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id);
    if (error) return handleError(error, 'updating transaction');
    handleSuccess('Transaction updated successfully');
    await fetchData();
  };

  const deleteTransaction = async (id: string) => {
    if (!id) {
      handleError(new Error('Missing transaction id.'), 'deleting transaction');
      return;
    }

    const toDeleteIds = new Set<string>([id]);
    const transaction = transactions.find((t) => t.id === id);

    if (transaction?.is_transfer) {
      const counterpart = transactions.find(
        (t) =>
          t.id !== id &&
          t.is_transfer &&
          t.user_id === transaction.user_id &&
          t.date === transaction.date &&
          Number(t.amount) === Number(transaction.amount) &&
          t.title === transaction.title &&
          t.note === transaction.note &&
          t.type !== transaction.type
      );

      if (counterpart) {
        toDeleteIds.add(counterpart.id);
      }
    }

    const deleteIds = Array.from(toDeleteIds);
    setTransactions((prev) => prev.filter((t) => !deleteIds.includes(t.id)));

    const { error } = await supabase.from('transactions').delete().in('id', deleteIds);
    if (error) {
      handleError(error, 'deleting transaction');
      await fetchData();
      return;
    }

    handleSuccess(transaction?.is_transfer ? 'Transfer deleted successfully' : 'Transaction deleted successfully');
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

    if (!fromAccountId || !toAccountId) {
      handleError(new Error('Please select both source and destination accounts.'), 'creating transfer');
      return;
    }

    if (fromAccountId === toAccountId) {
      handleError(new Error('Source and destination accounts must be different.'), 'creating transfer');
      return;
    }

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      handleError(new Error('Transfer amount must be greater than 0.'), 'creating transfer');
      return;
    }

    const transferDate = date || new Date().toISOString();
    if (!isValidTransactionDate(transferDate)) {
      handleError(new Error('Please provide a valid transfer date.'), 'creating transfer');
      return;
    }

    const sanitizedTitle = sanitizeText(title);
    const transferTitle = sanitizedTitle
      ? (sanitizedTitle.startsWith('[Transfer]') ? sanitizedTitle : `[Transfer] ${sanitizedTitle}`)
      : '[Transfer]';
    const transferNote = sanitizeText(note);

    // We insert both sides of the transfer in one array
    const { error } = await supabase.from('transactions').insert([
      {
        user_id: user.id,
        account_id: fromAccountId,
        type: 'expense',
        amount: normalizedAmount,
        title: transferTitle,
        is_transfer: true,
        note: transferNote,
        date: transferDate,
      },
      {
        user_id: user.id,
        account_id: toAccountId,
        type: 'income',
        amount: normalizedAmount,
        title: transferTitle,
        is_transfer: true,
        note: transferNote,
        date: transferDate,
      }
    ]);

    if (error) return handleError(error, 'creating transfer');

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
    hideMoney,
    setSelectedAccountId,
    setSelectedCurrency,
    setDateRange,
    setHideMoney,
    toggleHideMoney,
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
