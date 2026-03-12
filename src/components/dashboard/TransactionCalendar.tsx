import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DayPicker } from 'react-day-picker';
import { useFinance } from '@/contexts/FinanceContext';
import { format, isSameDay, getYear, getMonth, setMonth } from 'date-fns';
import { CalendarDays, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { buttonVariants } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const TransactionCalendar: React.FC = () => {
  const navigate = useNavigate();
  const { transactions, categories, selectedAccountId } = useFinance();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [displayMonth, setDisplayMonth] = useState<Date>(new Date());

  const filteredTransactions = useMemo(() => {
    return selectedAccountId
      ? transactions.filter((t) => t.account_id === selectedAccountId)
      : transactions;
  }, [transactions, selectedAccountId]);

  // Get available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear); // Always include current year
    filteredTransactions.forEach((t) => {
      years.add(getYear(new Date(t.date)));
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [filteredTransactions, currentYear]);

  const goToPreviousYear = () => {
    const currentIndex = availableYears.indexOf(selectedYear);
    if (currentIndex < availableYears.length - 1) {
      const newYear = availableYears[currentIndex + 1];
      setSelectedYear(newYear);
      setDisplayMonth(new Date(newYear, displayMonth.getMonth(), 1));
    }
  };

  const goToNextYear = () => {
    const currentIndex = availableYears.indexOf(selectedYear);
    if (currentIndex > 0) {
      const newYear = availableYears[currentIndex - 1];
      setSelectedYear(newYear);
      setDisplayMonth(new Date(newYear, displayMonth.getMonth(), 1));
    }
  };

  const handleYearChange = (year: string) => {
    const newYear = parseInt(year, 10);
    setSelectedYear(newYear);
    setDisplayMonth(new Date(newYear, displayMonth.getMonth(), 1));
  };

  const handleMonthChange = (month: Date) => {
    setDisplayMonth(month);
    setSelectedYear(getYear(month));
  };

  const handleMonthSelect = (monthIndex: string) => {
    const newMonth = setMonth(displayMonth, parseInt(monthIndex, 10));
    setDisplayMonth(newMonth);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const selectedDateTransactions = useMemo(() => {
    if (!selectedDate) return [];
    return filteredTransactions.filter((t) =>
      isSameDay(new Date(t.date), selectedDate)
    );
  }, [filteredTransactions, selectedDate]);

  const dailyTotals = useMemo(() => {
    const income = selectedDateTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = selectedDateTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const net = income - expense;
    return { income, expense, net };
  }, [selectedDateTransactions]);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  // Calculate net balance for each date
  const dateBalances = useMemo(() => {
    const balances = new Map<string, number>();
    filteredTransactions.forEach((t) => {
      const dateKey = format(new Date(t.date), 'yyyy-MM-dd');
      const current = balances.get(dateKey) || 0;
      const amount = Number(t.amount);
      balances.set(dateKey, current + (t.type === 'income' ? amount : -amount));
    });
    return balances;
  }, [filteredTransactions]);

  // Custom day content renderer with inline styles for color override
  const renderDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const balance = dateBalances.get(dateKey);
    
    let style: React.CSSProperties = {};
    if (balance !== undefined) {
      if (balance > 0) {
        // Green for positive balance (income > expense)
        style = { color: '#22c55e', fontWeight: 700 };
      } else if (balance < 0) {
        // Red for negative balance (expense > income)
        style = { color: '#ef4444', fontWeight: 700 };
      }
    }

    return (
      <span style={style}>
        {day.getDate()}
      </span>
    );
  };

  const canGoPrevious = availableYears.indexOf(selectedYear) < availableYears.length - 1;
  const canGoNext = availableYears.indexOf(selectedYear) > 0;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Transaction Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Month & Year Navigation */}
        <div className="flex items-center justify-center gap-2">
          <Select value={getMonth(displayMonth).toString()} onValueChange={handleMonthSelect}>
            <SelectTrigger className="w-[110px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {months.map((month, index) => (
                <SelectItem key={month} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[80px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-center">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={displayMonth}
            onMonthChange={handleMonthChange}
            showOutsideDays={true}
            className="p-3 pointer-events-auto rounded-md border"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
              ),
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
              day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-full"),
              day_range_end: "day-range-end",
              day_selected:
                "!bg-primary/20 border-2 border-dashed border-primary !rounded-full hover:!bg-primary/30 focus:!bg-primary/20",
              day_today: "bg-primary/30 text-foreground border-2 border-dashed border-primary !rounded-full",
              day_outside:
                "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
            }}
            components={{
              IconLeft: () => <ChevronLeft className="h-4 w-4" />,
              IconRight: () => <ChevronRight className="h-4 w-4" />,
              DayContent: ({ date }) => renderDay(date),
            }}
          />
        </div>

        {selectedDate && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm font-medium border-b border-border pb-2">
              <span className="text-foreground">
                {format(selectedDate, 'MMMM d, yyyy')}
              </span>
              <span className="text-muted-foreground">
                {selectedDateTransactions.length} transaction{selectedDateTransactions.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Daily Summary */}
            {(dailyTotals.income > 0 || dailyTotals.expense > 0) && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border border-success/20">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <div>
                      <p className="text-xs text-muted-foreground">Income</p>
                      <p className="text-sm font-semibold text-success">
                        {formatCurrency(dailyTotals.income)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    <div>
                      <p className="text-xs text-muted-foreground">Expense</p>
                      <p className="text-sm font-semibold text-destructive">
                        {formatCurrency(dailyTotals.expense)}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Net Value */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/50">
                  <span className="text-sm font-medium text-muted-foreground">Net</span>
                  <span className={cn(
                    'text-sm font-bold',
                    dailyTotals.net > 0 ? 'text-success' : 
                    dailyTotals.net < 0 ? 'text-destructive' : 
                    'text-muted-foreground'
                  )}>
                    {dailyTotals.net >= 0 ? '+' : ''}{formatCurrency(dailyTotals.net)}
                  </span>
                </div>
              </div>
            )}

            {/* Transaction List */}
<ScrollArea className="h-[200px]">
  {selectedDateTransactions.length > 0 ? (
    <div className="space-y-2 pr-3">
      {selectedDateTransactions.map((transaction) => (
        <div
          key={transaction.id}
          onClick={() => {
            const dateParam = format(selectedDate, 'yyyy-MM-dd');
            navigate(`/transactions?date=${dateParam}`);
          }}
          className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/50 cursor-pointer hover:bg-muted hover:border-primary/30 transition-all duration-200"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {/* CHANGE: Prioritize Title, then Category Name */}
              {transaction.title || getCategoryName(transaction.category_id)}
            </p>
            {transaction.note && (
              <p className="text-xs text-muted-foreground truncate">
                {transaction.note}
              </p>
            )}
          </div>
          <span
            className={cn(
              'text-sm font-semibold ml-2',
              transaction.type === 'income'
                ? 'text-success'
                : 'text-destructive'
            )}
          >
            {transaction.type === 'income' ? '+' : '-'}
            {formatCurrency(Number(transaction.amount))}
          </span>
        </div>
      ))}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-full text-center py-8">
      <CalendarDays className="h-8 w-8 text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">
        No transactions on this day
      </p>
    </div>
  )}
</ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
