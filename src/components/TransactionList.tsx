import React, { useState, useMemo } from 'react';
import { useFinance, Transaction } from '@/contexts/FinanceContext';
import { useTimezone } from '@/contexts/TimezoneContext';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Trash2, Search, Filter } from 'lucide-react';
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

// ==========================================
// Transaction List Component
// ==========================================

interface TransactionListProps {
  onEdit: (transaction: Transaction) => void;
  initialDate?: Date;
  onDateClear?: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ onEdit, initialDate, onDateClear }) => {
  const { transactions, categories, deleteTransaction, selectedAccountId } = useFinance();
  const { formatDateInTimezone } = useTimezone();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(initialDate);
  const [endDate, setEndDate] = useState<Date | undefined>(initialDate);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Filter and sort transactions based on current filters
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (selectedAccountId && t.account_id !== selectedAccountId) return false;
        if (categoryFilter !== 'all' && t.category_id !== categoryFilter) return false;
        if (typeFilter !== 'all' && t.type !== typeFilter) return false;
        
        // Date filtering
        const transactionDate = startOfDay(new Date(t.date));
        if (startDate && transactionDate < startOfDay(startDate)) return false;
        if (endDate && transactionDate > endOfDay(endDate)) return false;
        
        if (search) {
          const searchLower = search.toLowerCase();
          const matchesCategory = t.category?.name?.toLowerCase().includes(searchLower);
          const matchesNote = t.note?.toLowerCase().includes(searchLower);
          const matchesAccount = t.account?.name?.toLowerCase().includes(searchLower);
          const matchesTitle = t.title?.toLowerCase().includes(searchLower);
          const matchesAmount = !isNaN(Number(search)) && t.amount.toString().includes(search);
          if (!matchesCategory && !matchesNote && !matchesAccount && !matchesTitle && !matchesAmount) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedAccountId, categoryFilter, typeFilter, search, startDate, endDate]);

  const clearDateFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    onDateClear?.();
  };

  const hasDateFilter = startDate || endDate;

  const getDateFilterLabel = () => {
    if (startDate && endDate) {
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
    }
    if (startDate) {
      return `From ${format(startDate, 'MMM d')}`;
    }
    if (endDate) {
      return `Until ${format(endDate, 'MMM d')}`;
    }
    return 'Filter by date';
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTransaction(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40 transition-all duration-200 hover:border-primary/50">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48 transition-all duration-200 hover:border-primary/50">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Filter */}
        <DateFilterPopover
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onClear={clearDateFilter}
        />
      </div>

      {/* Transaction list */}
      <div className="space-y-2">
        {filteredTransactions.length === 0 ? (
          <EmptyState
            icon={<Search className="h-8 w-8 text-muted-foreground/50" />}
            title="No transactions found"
            description="Try adjusting your filters or add a new transaction."
            className="animate-fade-up"
          />
        ) : (
          filteredTransactions.map((transaction, index) => (
            <div
              key={transaction.id}
              onClick={() => setSelectedTransaction(transaction)}
              className="group flex items-center justify-between p-4 bg-card border border-border/50 rounded-lg hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 animate-fade-up cursor-pointer"
              style={{ animationDelay: `${Math.min(index * 50, 300)}ms`, animationFillMode: 'both' }}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'p-2.5 rounded-lg transition-transform duration-200 group-hover:scale-110',
                    transaction.type === 'income' ? 'bg-emerald-500/10' : 'bg-destructive/10'
                  )}
                >
                  {transaction.type === 'income' ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">
                    {transaction.title || transaction.category?.name || 'Untitled'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {transaction.account?.name} • {formatDateInTimezone(transaction.date)}
                  </p>
                  <p className="text-sm text-muted-foreground/80">
                    {transaction.category?.name || 'Uncategorized'}
                  </p>
                  {transaction.note && (
                    <p className="text-sm text-muted-foreground/60 mt-1 line-clamp-1">{transaction.note}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    transaction.type === 'income' ? 'text-emerald-500' : 'text-destructive'
                  )}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(Number(transaction.amount), transaction.account?.currency || 'USD')}
                </span>
                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(transaction.id);
                    }}
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation */}
      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />

      {/* Transaction Detail Dialog */}
      <TransactionDetailDialog
        transaction={selectedTransaction}
        open={!!selectedTransaction}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
      />
    </div>
  );
};
