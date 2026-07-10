import React, { useState, useEffect } from 'react';
import { Transaction, useFinance } from '@/contexts/FinanceContext';
import { useTimezone } from '@/contexts/TimezoneContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import {
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  Wallet,
  Tag,
  FileText,
  Pencil,
  X,
  Check,
} from 'lucide-react';

interface TransactionDetailDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TransactionDetailDialog: React.FC<TransactionDetailDialogProps> = ({
  transaction,
  open,
  onOpenChange,
}) => {
  const { accounts, categories, transactions, updateTransaction, updateTransfer } = useFinance();
  const { formatDateInTimezone, formatDateTimeLocalValue, parseDateTimeLocalValue } = useTimezone();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category_id: '',
    account_id: '',
    from_account_id: '',
    to_account_id: '',
    date: new Date(),
    note: '',
    title: '',
  });

  const counterpart = React.useMemo(() => {
    if (!transaction || !transaction.is_transfer) return null;
    const candidates = transactions.filter(
      (t) =>
        t.id !== transaction.id &&
        t.is_transfer &&
        t.user_id === transaction.user_id &&
        Number(t.amount) === Number(transaction.amount) &&
        t.type !== transaction.type
    );
    let bestMatch: Transaction | null = null;
    let minDiff = Infinity;
    const txTime = new Date(transaction.date).getTime();
    for (const t of candidates) {
      const diff = Math.abs(new Date(t.date).getTime() - txTime);
      if (diff < minDiff && diff < 1000 * 60 * 60 * 24) {
        minDiff = diff;
        bestMatch = t;
      }
    }
    return bestMatch;
  }, [transaction, transactions]);

  useEffect(() => {
    if (transaction) {
      let fromAccountId = '';
      let toAccountId = '';
      if (transaction.is_transfer) {
        if (transaction.type === 'expense') {
          fromAccountId = transaction.account_id;
          toAccountId = counterpart ? counterpart.account_id : '';
        } else {
          fromAccountId = counterpart ? counterpart.account_id : '';
          toAccountId = transaction.account_id;
        }
      }

      setEditData({
        amount: String(transaction.amount),
        type: transaction.type as 'income' | 'expense',
        category_id: transaction.category_id || '',
        account_id: transaction.account_id,
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        date: new Date(transaction.date),
        note: transaction.note || '',
        title: transaction.title || '',
      });
      setIsEditing(false);
    }
  }, [transaction, counterpart]);

  if (!transaction) return null;

  const handleSave = async () => {
    const amount = Number(editData.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Amount must be greater than 0.',
        variant: 'destructive',
      });
      return;
    }

    if (transaction.is_transfer) {
      if (!editData.from_account_id || !editData.to_account_id) {
        toast({
          title: 'Missing accounts',
          description: 'Please select both source and destination accounts.',
          variant: 'destructive',
        });
        return;
      }
      if (editData.from_account_id === editData.to_account_id) {
        toast({
          title: 'Invalid accounts',
          description: 'Source and destination accounts must be different.',
          variant: 'destructive',
        });
        return;
      }

      const expenseLegId = transaction.type === 'expense' ? transaction.id : counterpart?.id;
      const incomeLegId = transaction.type === 'income' ? transaction.id : counterpart?.id;

      if (!expenseLegId || !incomeLegId) {
        toast({
          title: 'Error updating transfer',
          description: 'Could not find the counterpart transaction.',
          variant: 'destructive',
        });
        return;
      }

      await updateTransfer(expenseLegId, incomeLegId, {
        fromAccountId: editData.from_account_id,
        toAccountId: editData.to_account_id,
        amount,
        title: editData.title || undefined,
        note: editData.note || undefined,
        date: editData.date.toISOString(),
      });
    } else {
      if (!editData.account_id) {
        toast({
          title: 'Missing account',
          description: 'Please select an account.',
          variant: 'destructive',
        });
        return;
      }

      await updateTransaction(transaction.id, {
        amount,
        type: editData.type,
        category_id: editData.category_id || null,
        account_id: editData.account_id,
        date: editData.date.toISOString(),
        note: editData.note || null,
        title: editData.title || null,
      });
    }

    setIsEditing(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (transaction) {
      let fromAccountId = '';
      let toAccountId = '';
      if (transaction.is_transfer) {
        if (transaction.type === 'expense') {
          fromAccountId = transaction.account_id;
          toAccountId = counterpart ? counterpart.account_id : '';
        } else {
          fromAccountId = counterpart ? counterpart.account_id : '';
          toAccountId = transaction.account_id;
        }
      }

      setEditData({
        amount: String(transaction.amount),
        type: transaction.type as 'income' | 'expense',
        category_id: transaction.category_id || '',
        account_id: transaction.account_id,
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        date: new Date(transaction.date),
        note: transaction.note || '',
        title: transaction.title || '',
      });
    }
    setIsEditing(false);
  };

  const filteredCategories = categories.filter((c) => c.type === editData.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
        {/* Header with amount */}
        <div
          className={cn(
            'px-6 pt-6 pb-5 text-center',
            transaction.type === 'income'
              ? 'bg-emerald-500/5'
              : 'bg-destructive/5'
          )}
        >
          <div
            className={cn(
              'inline-flex items-center justify-center w-10 h-10 rounded-full mb-3',
              transaction.type === 'income'
                ? 'bg-emerald-500/10'
                : 'bg-destructive/10'
            )}
          >
            {transaction.type === 'income' ? (
              <ArrowUpRight className="h-5 w-5 text-emerald-500" />
            ) : (
              <ArrowDownRight className="h-5 w-5 text-destructive" />
            )}
          </div>
          {isEditing ? (
            <Input
              type="number"
              value={editData.amount}
              onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
              className="text-2xl font-semibold text-center border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
          ) : (
            <p
              className={cn(
                'text-3xl font-semibold tracking-tight',
                transaction.type === 'income' ? 'text-emerald-500' : 'text-destructive'
              )}
            >
              {transaction.type === 'income' ? '+' : '-'}
              {formatCurrency(Number(transaction.amount), transaction.account?.currency || 'USD')}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {formatDateInTimezone(transaction.date)}
          </p>
        </div>

        {/* Details */}
        <div className="px-6 py-4 space-y-3">
          {/* Title */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Title</span>
            {isEditing ? (
              <Input
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                placeholder="Enter title..."
                className="w-44 h-8"
              />
            ) : (
              <span className="text-sm font-medium">{transaction.title || 'Untitled'}</span>
            )}
          </div>
          {/* Type - only in edit mode */}
          {isEditing && !transaction.is_transfer && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Type</span>
              <Select
                value={editData.type}
                onValueChange={(value: 'income' | 'expense') =>
                  setEditData({ ...editData, type: value, category_id: '' })
                }
              >
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date & Time - only in edit mode */}
          {isEditing && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Date & Time</span>
              <DateTimePicker
                date={editData.date}
                onChange={(newDate) => setEditData({ ...editData, date: newDate })}
                className="w-44"
              />
            </div>
          )}

          {/* Account/From-To Accounts */}
          {transaction.is_transfer ? (
            <>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">From Account</span>
                {isEditing ? (
                  <Select
                    value={editData.from_account_id}
                    onValueChange={(value) => setEditData({ ...editData, from_account_id: value })}
                  >
                    <SelectTrigger className="w-44 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm font-medium">
                    {transaction.type === 'expense' ? transaction.account?.name : counterpart?.account?.name || 'Unknown'}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">To Account</span>
                {isEditing ? (
                  <Select
                    value={editData.to_account_id}
                    onValueChange={(value) => setEditData({ ...editData, to_account_id: value })}
                  >
                    <SelectTrigger className="w-44 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm font-medium">
                    {transaction.type === 'income' ? transaction.account?.name : counterpart?.account?.name || 'Unknown'}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Account</span>
              {isEditing ? (
                <Select
                  value={editData.account_id}
                  onValueChange={(value) => setEditData({ ...editData, account_id: value })}
                >
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm font-medium">{transaction.account?.name || 'Unknown'}</span>
              )}
            </div>
          )}

          {/* Category */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Category</span>
            {isEditing && !transaction.is_transfer ? (
              // Only show category selector if it's NOT a transfer
              !transaction.is_transfer ? (
                <Select
                  value={editData.category_id}
                  onValueChange={(value) => setEditData({ ...editData, category_id: value })}
                >
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm font-medium text-muted-foreground italic">Fixed (Transfer)</span>
              )
            ) : (
              <span className="text-sm font-medium">
                {/* Minimal Change: display 'Transfer' instead of 'Uncategorized' */}
                {transaction.is_transfer ? 'Transfer' : (transaction.category?.name || 'Uncategorized')}
              </span>
            )}
          </div>

          {/* Note */}
          {(transaction.note || isEditing) && (
            <div className="pt-2">
              <span className="text-sm text-muted-foreground">Note</span>
              {isEditing ? (
                <Textarea
                  value={editData.note}
                  onChange={(e) => setEditData({ ...editData, note: e.target.value })}
                  placeholder="Add a note..."
                  className="mt-2 min-h-[60px] resize-none"
                />
              ) : (
                <p className="text-sm mt-1 text-foreground/80">{transaction.note}</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-2">
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCancel}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave}>
                Save
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
