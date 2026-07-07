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
import type { Account } from '@/types';

interface TransactionListProps {
  onEdit: (transaction: Transaction) => void;
  initialDate?: Date;
  onDateClear?: () => void;
}

type QuickPeriod = 'this-month' | 'this-year' | 'all' | 'custom';
type PageSizeOption = '20' | '50' | '100' | 'all';

export const TransactionList: React.FC<TransactionListProps> = ({ onEdit, initialDate, onDateClear }) => {
  const { transactions, categories, deleteTransaction, selectedAccountId, accounts } = useFinance();
  const { formatDateInTimezone } = useTimezone();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [period, setPeriod] = useState<QuickPeriod>(initialDate ? 'custom' : 'all');

  // Compute running balance for each transaction anchored to current_balance (DB ground truth).
  // We work BACKWARDS from the most recent transaction so the latest tx always shows the
  // correct live balance, and older txs show what the balance was at that point in time.
  const runningBalances = useMemo(() => {
    const balances: Record<string, number> = {};

    // Group transactions by account
    const txByAccount: Record<string, Transaction[]> = {};
    transactions.forEach((tx) => {
      if (!txByAccount[tx.account_id]) txByAccount[tx.account_id] = [];
      txByAccount[tx.account_id].push(tx);
    });

    // For each account, sort newest → oldest then walk backwards from current_balance
    accounts.forEach((acc) => {
      const accTxs = txByAccount[acc.id] || [];

      // Sort newest first lexicographically (extremely robust against parse issues)
      const sorted = [...accTxs].sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;

        const createdA = a.created_at || '';
        const createdB = b.created_at || '';
        return createdB.localeCompare(createdA);
      });

      // Anchor to the DB-maintained current_balance (correct ground truth) with strict fallback
      const startingBal = Number(acc.starting_balance || 0);
      let runningBal = Number(
        acc.current_balance !== null && acc.current_balance !== undefined
          ? acc.current_balance
          : startingBal
      );

      sorted.forEach((tx) => {
        // The balance displayed for this tx is the balance AFTER it was applied
        balances[tx.id] = Math.round(runningBal * 100) / 100;
        // Walk backwards: undo this tx to get balance before it
        if (tx.type === 'income') runningBal -= Number(tx.amount);
        else if (tx.type === 'expense') runningBal += Number(tx.amount);
      });
    });

    return balances;
  }, [transactions, accounts]);
  const [startDate, setStartDate] = useState<Date | undefined>(initialDate);
  const [endDate, setEndDate] = useState<Date | undefined>(initialDate);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [pageSize, setPageSize] = useState<PageSizeOption>('20');
  const [currentPage, setCurrentPage] = useState(1);
  const [groupBy, setGroupBy] = useState<'day' | 'category'>('day');

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
      period !== 'all' ||
      Boolean(startDate) ||
      Boolean(endDate),
    [search, categoryFilter, typeFilter, period, startDate, endDate]
  );

  const clearAllFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setTypeFilter('all');
    setPeriod('all');
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
      let key = '';
      if (groupBy === 'day') {
        key = format(parseISO(t.date), 'yyyy-MM-dd');
      } else {
        key = t.is_transfer ? 'Transfer' : (t.category?.name || 'Uncategorized');
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [paginatedTransactions, groupBy]);

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

  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {visiblePages.map((page, idx) => {
          const previous = visiblePages[idx - 1];
          const shouldShowGap = previous !== undefined && page - previous > 1;

          return (
            <React.Fragment key={page}>
              {shouldShowGap && <span className="px-1 text-xs text-muted-foreground select-none">...</span>}
              <Button
                variant={page === currentPage ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8 text-xs font-medium"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            </React.Fragment>
          );
        })}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

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
          onClear={() => { setPeriod('all'); setStartDate(undefined); setEndDate(undefined); onDateClear?.(); }}
        />
        <Select value={groupBy} onValueChange={(v: 'day' | 'category') => setGroupBy(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Group by Day</SelectItem>
            <SelectItem value="category">Group by Category</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground hover:text-foreground h-9 px-3">
            Clear all filters
          </Button>
        )}
      </div>

      {filteredTransactions.length > 0 && totalPages > 1 && (
        <div className="flex justify-end -mb-2">
          {renderPaginationControls()}
        </div>
      )}

      <div className="space-y-6">
        {Object.keys(groupedTransactions).length === 0 ? (
          <EmptyState icon={<Search className="h-8 w-8" />} title="No matches found" description={hasActiveFilters ? 'Try removing one or more filters.' : 'Your transactions will appear here once you add them.'} />
        ) : (
          Object.entries(groupedTransactions).map(([groupKey, txs]) => (
            <div key={groupKey} className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                {groupBy === 'day' ? getDateHeader(groupKey) : groupKey}
              </h3>
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
                      <div className="flex flex-col items-end">
                        <span className={cn('text-sm font-bold tabular-nums text-right', transaction.type === 'income' ? 'text-emerald-500' : 'text-destructive')}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount), transaction.account?.currency)}
                        </span>
                        {runningBalances[transaction.id] !== undefined && (
                          <span className="text-xs text-muted-foreground font-normal tabular-nums mt-0.5">
                            Bal: {formatCurrency(runningBalances[transaction.id], transaction.account?.currency)}
                          </span>
                        )}
                      </div>
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

      {filteredTransactions.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/60 pt-4 mt-6">
          <p className="text-sm text-muted-foreground text-center sm:text-left order-2 sm:order-1">
            Showing <span className="font-medium text-foreground">{pageStart}–{pageEnd}</span> of <span className="font-medium text-foreground">{filteredTransactions.length}</span> transaction{filteredTransactions.length !== 1 ? 's' : ''}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 order-1 sm:order-2 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page:</span>
              <Select value={pageSize} onValueChange={(value) => setPageSize(value as PageSizeOption)}>
                <SelectTrigger className="w-[85px] h-8 text-xs bg-background">
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {renderPaginationControls()}
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Transaction" description="This cannot be undone." onConfirm={() => deleteId && deleteTransaction(deleteId)} />
      <TransactionDetailDialog transaction={selectedTransaction} open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)} />
    </div>
  );
};
