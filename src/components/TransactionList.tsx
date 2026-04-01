import React, { useState, useMemo, useEffect } from 'react';
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
import { ArrowUpRight, ArrowDownRight, Trash2, Search, Filter, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
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
type PageSizeOption = '20' | '50' | '100' | 'all';

export const TransactionList: React.FC<TransactionListProps> = ({ onEdit, initialDate, onDateClear }) => {
  const { transactions, categories, deleteTransaction, selectedAccountId } = useFinance();
  const { formatDateInTimezone } = useTimezone();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [period, setPeriod] = useState<QuickPeriod>(initialDate ? 'custom' : 'this-month');
  const [startDate, setStartDate] = useState<Date | undefined>(initialDate);
  const [endDate, setEndDate] = useState<Date | undefined>(initialDate);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [pageSize, setPageSize] = useState<PageSizeOption>('20');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search]);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(search.trim()) ||
      categoryFilter !== 'all' ||
      typeFilter !== 'all' ||
      period !== 'this-month' ||
      Boolean(startDate) ||
      Boolean(endDate),
    [search, categoryFilter, typeFilter, period, startDate, endDate]
  );

  const clearAllFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setTypeFilter('all');
    setPeriod('this-month');
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(1);
    onDateClear?.();
  };

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

      if (debouncedSearch) {
        const term = debouncedSearch.toLowerCase();
        return (
          t.title?.toLowerCase().includes(term) ||
          t.category?.name?.toLowerCase().includes(term) ||
          (t.is_transfer && 'transfer'.includes(term)) ||
          t.note?.toLowerCase().includes(term) ||
          t.amount.toString().includes(term)
        );
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedAccountId, categoryFilter, typeFilter, debouncedSearch, period, startDate, endDate]);

  const totalTransactions = filteredTransactions.length;
  const resolvedPageSize = useMemo(() => {
    if (pageSize === 'all') {
      return Math.max(totalTransactions, 1);
    }
    return Number(pageSize);
  }, [pageSize, totalTransactions]);

  const totalPages = useMemo(
    () => (pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalTransactions / resolvedPageSize))),
    [pageSize, totalTransactions, resolvedPageSize]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, typeFilter, period, startDate, endDate, selectedAccountId, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedTransactions = useMemo(() => {
    if (pageSize === 'all') {
      return filteredTransactions;
    }
    const start = (currentPage - 1) * resolvedPageSize;
    return filteredTransactions.slice(start, start + resolvedPageSize);
  }, [filteredTransactions, pageSize, currentPage, resolvedPageSize]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    paginatedTransactions.forEach(t => {
      const dateKey = format(parseISO(t.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  }, [paginatedTransactions]);

  const pageStart = totalTransactions === 0 ? 0 : (pageSize === 'all' ? 1 : (currentPage - 1) * resolvedPageSize + 1);
  const pageEnd = totalTransactions === 0 ? 0 : (pageSize === 'all' ? totalTransactions : Math.min(currentPage * resolvedPageSize, totalTransactions));

  const visiblePages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = new Set<number>([1, totalPages, currentPage]);
    if (currentPage - 1 > 1) pages.add(currentPage - 1);
    if (currentPage + 1 < totalPages) pages.add(currentPage + 1);
    if (currentPage - 2 > 1) pages.add(currentPage - 2);
    if (currentPage + 2 < totalPages) pages.add(currentPage + 2);

    return Array.from(pages).sort((a, b) => a - b);
  }, [currentPage, totalPages]);

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

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-card px-3 py-2">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{pageStart}-{pageEnd}</span> of <span className="font-medium text-foreground">{filteredTransactions.length}</span> transaction{filteredTransactions.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2">
          <Select value={pageSize} onValueChange={(value) => setPageSize(value as PageSizeOption)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Page size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">Show 20</SelectItem>
              <SelectItem value="50">Show 50</SelectItem>
              <SelectItem value="100">Show 100</SelectItem>
              <SelectItem value="all">Show All</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear all filters
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {Object.keys(groupedTransactions).length === 0 ? (
          <EmptyState icon={<Search className="h-8 w-8" />} title="No matches found" description={hasActiveFilters ? 'Try removing one or more filters.' : 'Your transactions will appear here once you add them.'} />
        ) : (
          Object.entries(groupedTransactions).map(([dateStr, txs]) => (
            <div key={dateStr} className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">{getDateHeader(dateStr)}</h3>
              <div className="space-y-1">
                {txs.map((transaction) => (
                  <div key={transaction.id} onClick={() => setSelectedTransaction(transaction)} className="group flex items-center justify-between p-3 bg-card border border-border/50 rounded-xl hover:border-primary/40 transition-all cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn('p-2 rounded-full', transaction.type === 'income' ? 'bg-emerald-500/10' : 'bg-destructive/10')}>
                        {transaction.type === 'income' ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{transaction.title || transaction.category?.name || 'Untitled'}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.account?.name} • {transaction.is_transfer ? 'Transfer' : (transaction.category?.name || 'Uncategorized')}
                        </p>
                        <p className="text-[11px] text-muted-foreground/80 mt-0.5">{formatDateInTimezone(transaction.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className={cn('text-sm font-bold tabular-nums text-right', transaction.type === 'income' ? 'text-emerald-500' : 'text-destructive')}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount), transaction.account?.currency)}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setDeleteId(transaction.id); }}>
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

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>

          {visiblePages.map((page, idx) => {
            const previous = visiblePages[idx - 1];
            const shouldShowGap = previous !== undefined && page - previous > 1;

            return (
              <React.Fragment key={page}>
                {shouldShowGap && <span className="px-1 text-sm text-muted-foreground">...</span>}
                <Button
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  className="min-w-9"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              </React.Fragment>
            );
          })}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Transaction" description="This cannot be undone." onConfirm={() => deleteId && deleteTransaction(deleteId)} />
      <TransactionDetailDialog transaction={selectedTransaction} open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)} />
    </div>
  );
};