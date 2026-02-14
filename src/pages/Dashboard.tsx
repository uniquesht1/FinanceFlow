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

const Dashboard: React.FC = () => {
  const { accounts, transactions, selectedAccountId, selectedCurrency, loading } = useFinance();
  const [showTransactionForm, setShowTransactionForm] = React.useState(false);

  const { totalBalance, totalIncome, totalExpenses, currency } = useMemo(() => {
    // Filter accounts by selected currency when "All Accounts" is selected
    const currencyFilteredAccounts = selectedAccountId
      ? accounts.filter((a) => a.id === selectedAccountId)
      : selectedCurrency
        ? accounts.filter((a) => a.currency === selectedCurrency)
        : accounts;

    const accountIds = new Set(currencyFilteredAccounts.map(a => a.id));

    const filteredTransactions = transactions.filter((t) => accountIds.has(t.account_id));

    const startingBalance = currencyFilteredAccounts.reduce(
      (sum, a) => sum + Number(a.starting_balance),
      0
    );

    const income = filteredTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Get currency from selected account or selected currency filter or default to USD
    const selectedAccount = selectedAccountId 
      ? accounts.find(a => a.id === selectedAccountId)
      : null;
    const accountCurrency = selectedAccount?.currency || selectedCurrency || 'USD';

    return {
      totalBalance: startingBalance + income - expenses,
      totalIncome: income,
      totalExpenses: expenses,
      currency: accountCurrency
    };
  }, [accounts, transactions, selectedAccountId, selectedCurrency]);

  if (loading) {
    return (
      <AppLayout>
        <LoadingPage message="Loading your finances..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Dashboard
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            </h1>
            <p className="text-muted-foreground">Track your financial overview</p>
          </div>
          <Button 
            onClick={() => setShowTransactionForm(true)}
            className="group shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:rotate-90" />
            Add Transaction
          </Button>
        </div>

        {/* Onboarding */}
        <WelcomeCard />

        {/* Account & Currency Filters */}
        {accounts.length > 0 && (
          <div className="space-y-3">
            <AccountFilter />
            <CurrencyFilter />
          </div>
        )}

        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
            <BalanceCard title="Total Balance" amount={totalBalance} currency={currency} type="total" />
          </div>
          <div className="animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            <BalanceCard title="Total Income" amount={totalIncome} currency={currency} type="income" />
          </div>
          <div className="animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
            <BalanceCard title="Total Expenses" amount={totalExpenses} currency={currency} type="expense" />
          </div>
        </div>

        {/* Charts & Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
            <ExpenseChart />
          </div>
          <div className="animate-fade-up" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
            <CategoryPieChart />
          </div>
          <div className="lg:col-span-2 animate-fade-up" style={{ animationDelay: '550ms', animationFillMode: 'both' }}>
            <RecentTransactions />
          </div>
          <div className="animate-fade-up" style={{ animationDelay: '600ms', animationFillMode: 'both' }}>
            <TransactionCalendar />
          </div>
        </div>

        {/* Net Worth Chart */}
        <div className="animate-fade-up" style={{ animationDelay: '700ms', animationFillMode: 'both' }}>
          <NetWorthChart />
        </div>

        {/* Transaction Form Modal */}
        <TransactionForm open={showTransactionForm} onOpenChange={setShowTransactionForm} />
      </div>
    </AppLayout>
  );
};

export default Dashboard;
