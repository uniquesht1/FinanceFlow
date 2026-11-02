import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFinance } from '@/contexts/FinanceContext';
import { Transaction } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { TransactionDetailDialog } from '@/components/TransactionDetailDialog';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar as CalendarIcon,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Eye,
  Inbox,
} from 'lucide-react';
import {
  format,
  isSameMonth,
  isSameDay,
  isToday,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  setMonth,
  setYear,
  getYear,
  getMonth,
  parseISO,
  isValid,
} from 'date-fns';

interface TransactionCalendarProps {
  transactions?: Transaction[];
  className?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const TransactionCalendar: React.FC<TransactionCalendarProps> = ({
  transactions: propTransactions,
  className,
}) => {
  const { transactions: contextTransactions, selectedAccountId, selectedCurrency, hideMoney, accounts, categories } = useFinance();
  const transactions = propTransactions || contextTransactions;
  const currency = selectedCurrency || 'USD';

  // Current display month & selected day
  const [displayMonth, setDisplayMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [inspectTransaction, setInspectTransaction] = useState<Transaction | null>(null);

  // Filter transactions to selected account if not already filtered
  const accountScopedTransactions = useMemo(() => {
    return selectedAccountId
      ? transactions.filter((t) => t.account_id === selectedAccountId)
      : transactions;
  }, [transactions, selectedAccountId]);

  // Year options: past 5 years to next 5 years, plus any year with transaction data
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const set = new Set<number>();
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
      set.add(y);
    }
    accountScopedTransactions.forEach((t) => {
      const parsed = parseISO(t.date);
      if (isValid(parsed)) set.add(getYear(parsed));
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [accountScopedTransactions]);

  // Group transactions by "yyyy-MM-dd"
  const transactionsByDate = useMemo(() => {
    const map = new Map<string, {
      items: Transaction[];
      income: number;
      expense: number;
      transfer: number;
    }>();

    accountScopedTransactions.forEach((t) => {
      const parsed = parseISO(t.date);
      if (!isValid(parsed)) return;
      const key = format(parsed, 'yyyy-MM-dd');
      const amt = Number(t.amount);
      const curr = map.get(key) || { items: [], income: 0, expense: 0, transfer: 0 };

      curr.items.push(t);
      if (t.is_transfer) {
        curr.transfer += amt;
      } else if (t.type === 'income') {
        curr.income += amt;
      } else if (t.type === 'expense') {
        curr.expense += amt;
      }
      map.set(key, curr);
    });

    return map;
  }, [accountScopedTransactions]);

  // Calendar days grid calculation (Starts on Sunday: weekStartsOn = 0)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(displayMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [displayMonth]);

  // Monthly summary stats for the active displayed month
  const monthStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let count = 0;
    let peakDaySpend = 0;
    let peakDayStr = '';

    const currentMonthKey = format(displayMonth, 'yyyy-MM');

    transactionsByDate.forEach((dayData, dateKey) => {
      if (dateKey.startsWith(currentMonthKey)) {
        income += dayData.income;
        expense += dayData.expense;
        count += dayData.items.length;
        if (dayData.expense > peakDaySpend) {
          peakDaySpend = dayData.expense;
          peakDayStr = dateKey;
        }
      }
    });

    const net = income - expense;
    return {
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      net: Math.round(net * 100) / 100,
      count,
      peakDaySpend,
      peakDayStr,
    };
  }, [displayMonth, transactionsByDate]);

  // Selected date's details
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedDayData = transactionsByDate.get(selectedDateKey);
  const selectedDayTransactions = selectedDayData?.items || [];
  const selectedDayIncome = selectedDayData?.income || 0;
  const selectedDayExpense = selectedDayData?.expense || 0;
  const selectedDayNet = selectedDayIncome - selectedDayExpense;

  // Handlers for month/year navigation
  const handlePrevMonth = () => setDisplayMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setDisplayMonth((prev) => addMonths(prev, 1));
  const handleJumpToday = () => {
    const today = new Date();
    setDisplayMonth(today);
    setSelectedDate(today);
  };
  const handleMonthSelect = (mIndex: string) => {
    setDisplayMonth((prev) => setMonth(prev, parseInt(mIndex, 10)));
  };
  const handleYearSelect = (yStr: string) => {
    setDisplayMonth((prev) => setYear(prev, parseInt(yStr, 10)));
  };

  const fmt = (val: number) => (hideMoney ? '••••' : formatCurrency(val, currency));

  return (
    <div className={cn('space-y-4', className)}>
      {/* Month Metrics Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 bg-card/60 border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Month Inflow</span>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-base font-bold text-emerald-500 mt-1">{fmt(monthStats.income)}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{format(displayMonth, 'MMMM yyyy')}</p>
        </Card>

        <Card className="p-3 bg-card/60 border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Month Outflow</span>
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
          </div>
          <div className="text-base font-bold text-destructive mt-1">{fmt(monthStats.expense)}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{format(displayMonth, 'MMMM yyyy')}</p>
        </Card>

        <Card className="p-3 bg-card/60 border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Month Net Flow</span>
            <Scale className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className={cn('text-base font-bold mt-1', monthStats.net >= 0 ? 'text-emerald-500' : 'text-destructive')}>
            {!hideMoney && monthStats.net >= 0 ? '+' : ''}{fmt(monthStats.net)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{monthStats.net >= 0 ? 'Surplus' : 'Deficit'}</p>
        </Card>

        <Card className="p-3 bg-card/60 border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Total Activity</span>
            <Receipt className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-base font-bold text-foreground mt-1">{monthStats.count} txns</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {monthStats.peakDayStr ? `Peak: ${format(parseISO(monthStats.peakDayStr), 'MMM d')}` : 'No recorded activity'}
          </p>
        </Card>
      </div>

      {/* Main Grid: Calendar on Left, Selected Day Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Calendar View (7 cols on lg) */}
        <Card className="lg:col-span-7 border-border/50 bg-card shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span>{format(displayMonth, 'MMMM yyyy')}</span>
            </CardTitle>

            <div className="flex items-center gap-1.5">
              {/* Month Selector */}
              <Select value={getMonth(displayMonth).toString()} onValueChange={handleMonthSelect}>
                <SelectTrigger className="h-8 w-28 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {MONTHS.map((m, idx) => (
                    <SelectItem key={m} value={idx.toString()} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Year Selector */}
              <Select value={getYear(displayMonth).toString()} onValueChange={handleYearSelect}>
                <SelectTrigger className="h-8 w-20 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {yearOptions.map((yr) => (
                    <SelectItem key={yr} value={yr.toString()} className="text-xs">
                      {yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Prev / Next / Today */}
              <div className="flex items-center ml-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-r-none border-r-0"
                  onClick={handlePrevMonth}
                  title="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-l-none"
                  onClick={handleNextMonth}
                  title="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleJumpToday}
              >
                Today
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-1">
            {/* Weekday Row */}
            <div className="grid grid-cols-7 mb-2 text-center text-xs font-medium text-muted-foreground">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days 7x5 or 7x6 Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const isCurrentMonth = isSameMonth(day, displayMonth);
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentDay = isToday(day);
                const dayData = transactionsByDate.get(dayKey);
                const hasTransactions = Boolean(dayData && dayData.items.length > 0);

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'min-h-[64px] sm:min-h-[72px] p-1.5 rounded-lg border text-left transition-all flex flex-col justify-between relative group',
                      isCurrentMonth
                        ? 'bg-card hover:bg-muted/50 border-border/40 text-foreground'
                        : 'bg-muted/15 border-transparent text-muted-foreground/40 hover:bg-muted/30',
                      isSelected && 'ring-2 ring-primary border-primary bg-primary/10 shadow-sm z-10',
                      isCurrentDay && !isSelected && 'border-primary/60 bg-primary/5 font-semibold'
                    )}
                  >
                    {/* Header: Date Number + Today indicator */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={cn(
                          'text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium',
                          isCurrentDay
                            ? 'bg-primary text-primary-foreground font-bold'
                            : isSelected
                            ? 'text-primary font-bold'
                            : ''
                        )}
                      >
                        {format(day, 'd')}
                      </span>

                      {hasTransactions && (
                        <span className="text-[10px] font-semibold px-1 rounded bg-muted text-muted-foreground">
                          {dayData?.items.length}
                        </span>
                      )}
                    </div>

                    {/* Transaction Badges on Cell */}
                    <div className="mt-1 space-y-0.5 w-full">
                      {hasTransactions && dayData && (
                        <>
                          {dayData.income > 0 && (
                            <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 truncate flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 flex-shrink-0" />
                              <span className="truncate">+{hideMoney ? '••' : Math.round(dayData.income)}</span>
                            </div>
                          )}
                          {dayData.expense > 0 && (
                            <div className="text-[10px] font-medium text-destructive truncate flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-destructive mr-1 flex-shrink-0" />
                              <span className="truncate">-{hideMoney ? '••' : Math.round(dayData.expense)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Details Panel (5 cols on lg) */}
        <Card className="lg:col-span-5 border-border/50 bg-card shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedDayTransactions.length} transaction{selectedDayTransactions.length !== 1 ? 's' : ''}
                </p>
              </div>

              {isToday(selectedDate) && (
                <Badge variant="outline" className="text-primary border-primary/40 text-[10px]">
                  Today
                </Badge>
              )}
            </div>

            {/* Daily Inflow / Outflow / Net chips if day has transactions */}
            {selectedDayTransactions.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[10px] text-muted-foreground block">Inflow</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    +{fmt(selectedDayIncome)}
                  </span>
                </div>
                <div className="p-1.5 rounded bg-destructive/10 border border-destructive/20 text-center">
                  <span className="text-[10px] text-muted-foreground block">Outflow</span>
                  <span className="text-xs font-bold text-destructive">
                    -{fmt(selectedDayExpense)}
                  </span>
                </div>
                <div className="p-1.5 rounded bg-muted/60 border border-border/50 text-center">
                  <span className="text-[10px] text-muted-foreground block">Net</span>
                  <span className={cn('text-xs font-bold', selectedDayNet >= 0 ? 'text-emerald-500' : 'text-destructive')}>
                    {!hideMoney && selectedDayNet >= 0 ? '+' : ''}{fmt(selectedDayNet)}
                  </span>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-3 flex-1 flex flex-col justify-between">
            {selectedDayTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center my-auto">
                <div className="p-3 rounded-full bg-muted/60 mb-2">
                  <Inbox className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  No transactions on this day
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                  No financial activity was recorded for {format(selectedDate, 'MMMM d, yyyy')}.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[280px] pr-2">
                <div className="space-y-2">
                  {selectedDayTransactions.map((tx) => {
                    const category = categories.find((c) => c.id === tx.category_id);
                    const account = accounts.find((a) => a.id === tx.account_id);
                    const isIncome = tx.type === 'income';
                    const isExpense = tx.type === 'expense';
                    const isTransfer = tx.is_transfer;

                    return (
                      <div
                        key={tx.id}
                        onClick={() => setInspectTransaction(tx)}
                        className="p-2.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/50 transition-colors cursor-pointer group flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              'p-2 rounded-md flex-shrink-0',
                              isIncome
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : isExpense
                                ? 'bg-destructive/15 text-destructive'
                                : 'bg-primary/15 text-primary'
                            )}
                          >
                            {isIncome && <ArrowUpRight className="h-4 w-4" />}
                            {isExpense && <ArrowDownRight className="h-4 w-4" />}
                            {isTransfer && <ArrowRightLeft className="h-4 w-4" />}
                          </div>

                          <div className="min-w-0 truncate">
                            <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {tx.title || category?.name || 'Untitled Transaction'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground truncate">
                              {category && (
                                <span className="px-1.5 py-0.2 rounded bg-muted font-medium">
                                  {category.name}
                                </span>
                              )}
                              {account && (
                                <span className="truncate">
                                  • {account.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 flex items-center gap-2">
                          <div>
                            <span
                              className={cn(
                                'text-xs font-bold block',
                                isIncome
                                  ? 'text-emerald-500'
                                  : isExpense
                                  ? 'text-destructive'
                                  : 'text-foreground'
                              )}
                            >
                              {isIncome ? '+' : isExpense ? '-' : ''}
                              {fmt(Number(tx.amount))}
                            </span>
                          </div>
                          <Eye className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog for inspection */}
      <TransactionDetailDialog
        transaction={inspectTransaction}
        open={Boolean(inspectTransaction)}
        onOpenChange={(open) => {
          if (!open) setInspectTransaction(null);
        }}
      />
    </div>
  );
};
