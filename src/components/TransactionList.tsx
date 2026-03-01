import React, { useState, useMemo } from 'react';
import { useFinance, Transaction } from '@/contexts/FinanceContext';
import { useTimezone } from '@/contexts/TimezoneContext';
import {
  format,
  startOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
  isToday,
  isYesterday
} from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Trash2, Search, Filter, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { TransactionDetailDialog } from '@/components/TransactionDetailDialog';
import { DateFilterPopover } from '@/components/DateFilterPopover';
import { cn, formatCurrency } from '@/lib/utils';

interface TransactionListProps {
  onEdit: (transaction: Transaction) => void;
  initialDate?: Date;
  onDateClear?: () => void;
}

type QuickPeriod = 'this-month' | 'this-year' | 'all' | 'custom';

export const TransactionList: React.FC<TransactionListProps> = ({ onEdit, initialDate, onDateClear }) => {
  const { transactions, categories, deleteTransaction, selectedAccountId } = useFinance();
  const { formatDateInTimezone } = useTimezone();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [period, setPeriod] = useState<QuickPeriod>(initialDate ? 'custom' : 'this-month');
  const [startDate, setStartDate] = useState<Date | undefined>(initialDate);
  const [endDate, setEndDate] = useState<Date | undefined>(initialDate);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = useMemo(() => {
    const now = new Date();

    return transactions.filter((t) => {
      if (selectedAccountId && t.account_id !== selectedAccountId) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && t.category_id !== categoryFilter) return false;

      const txDate = parseISO(t.date);
      if (period === 'this-month') {
        if (!isWithinInterval(txDate, { start: startOfMonth(now), end: endOfMonth(now) })) return false;
      } else if (period === 'this-year') {
        if (!isWithinInterval(txDate, { start: startOfYear(now), end: endOfYear(now) })) return false;
      } else if (period === 'custom') {
        if (startDate && startOfDay(txDate) < startOfDay(startDate)) return false;
        if (endDate && startOfDay(txDate) > startOfDay(endDate)) return false;
      }

      if (search) {
        const term = search.toLowerCase();
        return (
          t.title?.toLowerCase().includes(term) ||
          t.category?.name?.toLowerCase().includes(term) ||
          t.note?.toLowerCase().includes(term) ||
          t.amount.toString().includes(term)
        );
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedAccountId, categoryFilter, typeFilter, search, period, startDate, endDate]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(t => {
      const dateKey = format(parseISO(t.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  const getDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM do');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={period} onValueChange={(v: QuickPeriod) => { setPeriod(v); if (v !== 'custom') onDateClear?.(); }}>
            <SelectTrigger className="w-40"><Calendar className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <DateFilterPopover
          startDate={startDate} endDate={endDate}
          onStartDateChange={(d) => { setStartDate(d); setPeriod('custom'); }}
          onEndDateChange={(d) => { setEndDate(d); setPeriod('custom'); }}
          onClear={() => { setPeriod('this-month'); setStartDate(undefined); setEndDate(undefined); onDateClear?.(); }}
        />
      </div>

      <div className="space-y-6">
        {Object.keys(groupedTransactions).length === 0 ? (
          <EmptyState icon={<Search className="h-8 w-8" />} title="No matches found" description="Adjust filters to see more." />
        ) : (
          Object.entries(groupedTransactions).map(([dateStr, txs]) => (
            <div key={dateStr} className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">{getDateHeader(dateStr)}</h3>
              <div className="space-y-1">
                {txs.map((transaction) => (
                  <div key={transaction.id} onClick={() => setSelectedTransaction(transaction)} className="group flex items-center justify-between p-3 bg-card border border-border/50 rounded-xl hover:border-primary/40 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2 rounded-full', transaction.type === 'income' ? 'bg-emerald-500/10' : 'bg-destructive/10')}>
                        {transaction.type === 'income' ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{transaction.title || transaction.category?.name || 'Untitled'}</p>
                        <p className="text-xs text-muted-foreground">{transaction.account?.name} • {transaction.category?.name || 'Uncategorized'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn('text-sm font-bold tabular-nums', transaction.type === 'income' ? 'text-emerald-500' : 'text-destructive')}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount), transaction.account?.currency)}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setDeleteId(transaction.id); }}>
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Transaction" description="This cannot be undone." onConfirm={() => deleteId && deleteTransaction(deleteId)} />
      <TransactionDetailDialog transaction={selectedTransaction} open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)} />
    </div>
  );
};