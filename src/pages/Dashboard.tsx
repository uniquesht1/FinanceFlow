import React, { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { WelcomeCard } from '@/components/dashboard/WelcomeCard';
import { NetWorthChart } from '@/components/dashboard/NetWorthChart';
import { TransactionCalendar } from '@/components/dashboard/TransactionCalendar';
import { AccountFilter } from '@/components/dashboard/AccountFilter';
import { CurrencyFilter } from '@/components/dashboard/CurrencyFilter';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
import { TransactionForm } from '@/components/forms/TransactionForm';
import { LoadingPage } from '@/components/ui/loading-spinner';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO, format } from 'date-fns';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Dashboard: React.FC = () => {
  const { accounts, transactions, selectedAccountId, selectedCurrency, loading } = useFinance();
  const [showTransactionForm, setShowTransactionForm] = React.useState(false);
  const [period, setPeriod] = React.useState<'this-month' | 'this-year' | 'all'>('this-month');

  const { totalBalance, periodIncome, periodExpenses, periodTransactions, currency } = useMemo(() => {
    const now = new Date();
    const currencyFilteredAccounts = selectedAccountId
      ? accounts.filter((a) => a.id === selectedAccountId)
      : selectedCurrency
        ? accounts.filter((a) => a.currency === selectedCurrency)
        : accounts;

    const accountIds = new Set(currencyFilteredAccounts.map(a => a.id));
    const baseTransactions = transactions.filter((t) => accountIds.has(t.account_id));

    // 1. BALANCE MATH: Must include ALL transactions (including transfers) to be accurate
    const allTimeIncome = baseTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const allTimeExpenses = baseTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const startingBalance = currencyFilteredAccounts.reduce((sum, a) => sum + Number(a.starting_balance), 0);

    const filteredTxs = baseTransactions.filter((t) => {
      const txDate = parseISO(t.date);
      switch (period) {
        case 'this-month': return isWithinInterval(txDate, { start: startOfMonth(now), end: endOfMonth(now) });
        case 'this-year': return isWithinInterval(txDate, { start: startOfYear(now), end: endOfYear(now) });
        default: return true;
      }
    });

    // 2. INCOME/EXPENSE MATH: Exclude [Transfer] items so income/spending totals aren't inflated
    const income = filteredTxs
      .filter((t) => t.type === 'income' && !t.title?.startsWith('[Transfer]'))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = filteredTxs
      .filter((t) => t.type === 'expense' && !t.title?.startsWith('[Transfer]'))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const selectedAccount = selectedAccountId ? accounts.find(a => a.id === selectedAccountId) : null;
    const accountCurrency = selectedAccount?.currency || selectedCurrency || 'USD';

    return {
      totalBalance: startingBalance + allTimeIncome - allTimeExpenses,
      periodIncome: income,
      periodExpenses: expenses,
      periodTransactions: filteredTxs,
      currency: accountCurrency
    };
  }, [accounts, transactions, selectedAccountId, selectedCurrency, period]);

  const netCashFlow = periodIncome - periodExpenses;

  const periodLabel = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'this-month': return format(now, 'MMMM yyyy');
      case 'this-year': return format(now, 'yyyy');
      default: return 'All Time';
    }
  }, [period]);

  const subtitleLabel = useMemo(() => {
    const accountLabel = selectedAccountId
      ? accounts.find(a => a.id === selectedAccountId)?.name || 'Account'
      : 'All Accounts';
    return `${periodLabel} · ${accountLabel}`;
  }, [periodLabel, selectedAccountId, accounts]);

  // Stable Layout: Sidebar stays, only inner content shows loading if needed
  return (
    <AppLayout>
      {loading && accounts.length === 0 ? (
        <LoadingPage message="Loading your finances..." />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                Dashboard <Sparkles className="h-5 w-5 text-primary" />
              </h1>
              <p className="text-muted-foreground text-sm">{subtitleLabel}</p>
            </div>
            <Button onClick={() => setShowTransactionForm(true)} className="group shadow-lg shadow-primary/25">
              <Plus className="h-4 w-4 mr-2" /> Add Transaction
            </Button>
          </div>

          <WelcomeCard />

          {accounts.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="space-y-3 flex-1">
                <AccountFilter />
                <CurrencyFilter />
              </div>
              <div className="flex items-center gap-2 bg-card border border-border/50 p-1 rounded-lg">
                <span className="text-xs text-muted-foreground pl-2 font-medium">Period</span>
                <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                  <SelectTrigger className="w-[130px] h-8 border-none focus:ring-0" aria-label="Select time period">
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="this-year">This Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <BalanceCard title="Total Balance" amount={totalBalance} currency={currency} type="total" />
            <BalanceCard title="Income" amount={periodIncome} currency={currency} type="income" />
            <BalanceCard title="Expenses" amount={periodExpenses} currency={currency} type="expense" />
            <BalanceCard title="Net Cash Flow" amount={netCashFlow} currency={currency} type={netCashFlow >= 0 ? 'income' : 'expense'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {/* Charts should only show actual spending/income, not transfers */}
              <ExpenseChart
                transactions={periodTransactions.filter(t => !t.title?.startsWith('[Transfer]'))}
                period={period}
              />
            </div>
            <CategoryPieChart
              transactions={periodTransactions.filter(t => !t.title?.startsWith('[Transfer]'))}
            />
            <div className="lg:col-span-2">
              <RecentTransactions transactions={periodTransactions} />
            </div>
            <div className="lg:row-span-2 h-full">
              <TransactionCalendar />
            </div>
            <div className="lg:col-span-2">
              <NetWorthChart />
            </div>
          </div>
          <TransactionForm open={showTransactionForm} onOpenChange={setShowTransactionForm} />
        </div>
      )}
    </AppLayout>
  );
};

export default Dashboard;