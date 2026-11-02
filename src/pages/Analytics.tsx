import React, { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { AccountFilter } from '@/components/dashboard/AccountFilter';
import { TransactionStats } from '@/components/transactions/TransactionStats';
import { DateFilterPopover } from '@/components/DateFilterPopover';
import { useFinance } from '@/contexts/FinanceContext';
import { BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter,
  startOfYear, endOfYear, isWithinInterval, parseISO, isAfter, isBefore, startOfDay, endOfDay
} from 'date-fns';

type QuickPeriod = 'this-month' | 'last-month' | 'this-quarter' | 'this-year' | 'all' | 'custom';

const Analytics: React.FC = () => {
  const { transactions, selectedAccountId } = useFinance();
  const [period, setPeriod] = useState<QuickPeriod>('this-month');
  const [startDate, setStartDate] = useState<Date | undefined>(() => startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(() => endOfMonth(new Date()));

  const handlePeriodChange = (val: QuickPeriod) => {
    setPeriod(val);
    const now = new Date();
    if (val === 'this-month') {
      setStartDate(startOfMonth(now));
      setEndDate(endOfMonth(now));
    } else if (val === 'last-month') {
      const lm = subMonths(now, 1);
      setStartDate(startOfMonth(lm));
      setEndDate(endOfMonth(lm));
    } else if (val === 'this-quarter') {
      setStartDate(startOfQuarter(now));
      setEndDate(endOfQuarter(now));
    } else if (val === 'this-year') {
      setStartDate(startOfYear(now));
      setEndDate(endOfYear(now));
    } else if (val === 'all') {
      setStartDate(undefined);
      setEndDate(undefined);
    }
  };

  const accountTransactions = useMemo(() => {
    return selectedAccountId
      ? transactions.filter((t) => t.account_id === selectedAccountId)
      : transactions;
  }, [transactions, selectedAccountId]);

  const filteredTransactions = useMemo(() => {
    return accountTransactions.filter((t) => {
      if (!startDate && !endDate) return true;

      const txDate = parseISO(t.date);

      if (startDate && endDate) {
        return isWithinInterval(txDate, {
          start: startOfDay(startDate),
          end: endOfDay(endDate),
        });
      }
      if (startDate && isBefore(txDate, startOfDay(startDate))) return false;
      if (endDate && isAfter(txDate, endOfDay(endDate))) return false;

      return true;
    });
  }, [accountTransactions, startDate, endDate]);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <PageHeader
          icon={<BarChart2 className="h-6 w-6 text-primary" />}
          title="Analytics & Reports"
          description="Comprehensive visual breakdown, trend analysis, and detailed financial statistics"
        />

        {/* Filter controls row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/50 shadow-xs">
          <AccountFilter />

          <div className="flex flex-wrap items-center gap-2">
            <Select value={period} onValueChange={(v: QuickPeriod) => handlePeriodChange(v)}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-quarter">This Quarter</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Date Range Picker */}
            <DateFilterPopover
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={(d) => { setStartDate(d); setPeriod('custom'); }}
              onEndDateChange={(d) => { setEndDate(d); setPeriod('custom'); }}
              onClear={() => { setStartDate(undefined); setEndDate(undefined); setPeriod('all'); }}
            />

            {(startDate || endDate || period !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePeriodChange('all')}
                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset Filter
              </Button>
            )}
          </div>
        </div>

        {/* Master Transaction Stats Component */}
        <TransactionStats transactions={filteredTransactions} allTransactions={accountTransactions} />
      </div>
    </AppLayout>
  );
};

export default Analytics;
