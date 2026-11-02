import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryBreakdownChart } from './CategoryBreakdownChart';
import { CashFlowBarChart } from './CashFlowBarChart';
import { BorrowTrackerChart } from './BorrowTrackerChart';
import { SpendingPatternsChart } from './SpendingPatternsChart';
import { TransactionCalendar } from './TransactionCalendar';
import { useFinance } from '@/contexts/FinanceContext';
import { Transaction } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Receipt,
  PieChart as PieIcon,
  HandCoins,
  CalendarDays,
  Calendar,
} from 'lucide-react';

interface TransactionStatsProps {
  transactions: Transaction[];
  allTransactions?: Transaction[];
}

export const TransactionStats: React.FC<TransactionStatsProps> = ({ transactions, allTransactions }) => {
  const { selectedCurrency, hideMoney } = useFinance();
  const currency = selectedCurrency || 'USD';

  const kpis = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    transactions.forEach((t) => {
      if (t.is_transfer) return;
      const amt = Number(t.amount);
      if (t.type === 'income') { totalIncome += amt; incomeCount++; }
      else if (t.type === 'expense') { totalExpense += amt; expenseCount++; }
    });

    const validCount = incomeCount + expenseCount;
    const netFlow = totalIncome - totalExpense;
    const avgTxSize = validCount > 0 ? (totalIncome + totalExpense) / validCount : 0;

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netFlow: Math.round(netFlow * 100) / 100,
      avgTxSize: Math.round(avgTxSize * 100) / 100,
      incomeCount,
      expenseCount,
      validCount,
    };
  }, [transactions]);

  const fmt = (amount: number) => hideMoney ? '••••' : formatCurrency(amount, currency);

  return (
    <div className="space-y-4 mb-2">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Inflow */}
        <Card className="border-border/50 bg-card/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Total Inflow</span>
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg font-bold text-emerald-500">{fmt(kpis.totalIncome)}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{kpis.incomeCount} income entries</p>
        </Card>

        {/* Total Outflow */}
        <Card className="border-border/50 bg-card/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Total Outflow</span>
            <div className="p-1.5 rounded-md bg-destructive/10 text-destructive">
              <TrendingDown className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg font-bold text-destructive">{fmt(kpis.totalExpense)}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{kpis.expenseCount} expense entries</p>
        </Card>

        {/* Net Cash Flow */}
        <Card className="border-border/50 bg-card/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Net Cash Flow</span>
            <div className={cn(
              'p-1.5 rounded-md',
              kpis.netFlow >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
            )}>
              <Scale className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className={cn('text-lg font-bold', kpis.netFlow >= 0 ? 'text-emerald-500' : 'text-destructive')}>
            {!hideMoney && kpis.netFlow >= 0 ? '+' : ''}{fmt(kpis.netFlow)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {kpis.netFlow >= 0 ? 'Net positive savings' : 'Deficit in period'}
          </p>
        </Card>

        {/* Avg Transaction */}
        <Card className="border-border/50 bg-card/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Avg Transaction</span>
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Receipt className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg font-bold text-foreground">{fmt(kpis.avgTxSize)}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Across {kpis.validCount} entries</p>
        </Card>
      </div>

      {/* Chart Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted/60 border border-border/40 p-1 mb-3">
          <TabsTrigger value="overview" className="text-xs gap-1.5 data-[state=active]:shadow-sm">
            <PieIcon className="h-3.5 w-3.5" />
            Category &amp; Cashflow
          </TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs gap-1.5 data-[state=active]:shadow-sm">
            <Calendar className="h-3.5 w-3.5" />
            Transaction Calendar
          </TabsTrigger>
          <TabsTrigger value="patterns" className="text-xs gap-1.5 data-[state=active]:shadow-sm">
            <CalendarDays className="h-3.5 w-3.5" />
            Patterns &amp; Drivers
          </TabsTrigger>
          <TabsTrigger value="borrow" className="text-xs gap-1.5 data-[state=active]:shadow-sm">
            <HandCoins className="h-3.5 w-3.5" />
            Borrow &amp; Debt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CategoryBreakdownChart transactions={transactions} />
            <CashFlowBarChart transactions={transactions} />
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <TransactionCalendar transactions={allTransactions || transactions} />
        </TabsContent>

        <TabsContent value="patterns" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SpendingPatternsChart transactions={transactions} />
            <CashFlowBarChart transactions={transactions} />
          </div>
        </TabsContent>

        <TabsContent value="borrow" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BorrowTrackerChart transactions={transactions} />
            <CategoryBreakdownChart transactions={transactions} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
