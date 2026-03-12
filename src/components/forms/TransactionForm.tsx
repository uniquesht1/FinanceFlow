import React, { useState } from 'react';
import { useFinance, Transaction } from '@/contexts/FinanceContext';
import { useTimezone } from '@/contexts/TimezoneContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface InitialValues {
  type?: 'income' | 'expense';
  amount?: string;
  note?: string;
}

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction;
  initialValues?: InitialValues;
  onSuccess?: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  open,
  onOpenChange,
  transaction,
  initialValues,
  onSuccess
}) => {
  const { accounts, categories, addTransaction, updateTransaction, addTransfer } = useFinance();
  const { formatDateTimeLocalValue, parseDateTimeLocalValue } = useTimezone();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getDefaultDateTime = () => {
    // datetime-local expects a "wall-clock" value, not UTC ISO.
    return formatDateTimeLocalValue(new Date());
  };

  const [formData, setFormData] = useState<{
    type: string;
    account_id: string;
    to_account_id: string;
    category_id: string;
    amount: string;
    date: string;
    note: string;
    title: string;
  }>({
    type: transaction?.type || 'expense',
    account_id: transaction?.account_id || '',
    to_account_id: '',
    category_id: transaction?.category_id || '',
    amount: transaction?.amount?.toString() || '',
    date: transaction?.date ? formatDateTimeLocalValue(new Date(transaction.date)) : getDefaultDateTime(),
    note: transaction?.note || '',
    title: transaction?.title || ''
  });

  React.useEffect(() => {
    if (open) {
      const defaultDateTime = formatDateTimeLocalValue(new Date());
      setFormData({
        type: initialValues?.type || transaction?.type || 'expense',
        account_id: transaction?.account_id || accounts[0]?.id || '',
        to_account_id: '',
        category_id: transaction?.category_id || '',
        amount: initialValues?.amount || transaction?.amount?.toString() || '',
        date: transaction?.date ? formatDateTimeLocalValue(new Date(transaction.date)) : defaultDateTime,
        note: initialValues?.note || transaction?.note || '',
        title: transaction?.title || ''
      });
    }
  }, [open, transaction, accounts, initialValues, formatDateTimeLocalValue]);

  const isTransfer = formData.type === 'transfer' || transaction?.is_transfer;
  const filteredCategories = categories.filter((c) => c.type === (isTransfer ? 'expense' : formData.type));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.account_id || !formData.amount) return;

    setIsSubmitting(true);
    try {
      if (isTransfer) {
        if (!formData.to_account_id || formData.to_account_id === formData.account_id) {
          setIsSubmitting(false);
          return;
        }
        const dateIso = parseDateTimeLocalValue(formData.date);
        await addTransfer(
          formData.account_id,
          formData.to_account_id,
          parseFloat(formData.amount),
          formData.title || undefined,
          formData.note || undefined,
          dateIso
        );
        onSuccess?.();
      } else if (transaction) {
        const dateIso = parseDateTimeLocalValue(formData.date);
        await updateTransaction(transaction.id, {
          type: formData.type as 'income' | 'expense',
          account_id: formData.account_id,
          date: dateIso,
          amount: parseFloat(formData.amount),
          category_id: formData.category_id || null,
          title: formData.title || null,
          note: formData.note || null,
        });
      } else {
        const dateIso = parseDateTimeLocalValue(formData.date);
        await addTransaction({
          ...formData,
          date: dateIso,
          amount: parseFloat(formData.amount),
          category_id: formData.category_id || null,
          title: formData.title || null
        } as any);
        onSuccess?.();
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const setNow = () => {
    setFormData({ ...formData, date: formatDateTimeLocalValue(new Date()) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as 'income' | 'expense' | 'transfer', category_id: '', to_account_id: '' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  {!transaction && <SelectItem value="transfer">Transfer</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title (optional)</Label>
            <Input
              placeholder="e.g., Grocery shopping, Salary..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{isTransfer ? 'From Account' : 'Account'}</Label>
            <Select
              value={formData.account_id}
              onValueChange={(value) => setFormData({ ...formData, account_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isTransfer && (
            <div className="space-y-2">
              <Label>To Account</Label>
              <Select
                value={formData.to_account_id}
                onValueChange={(value) => setFormData({ ...formData, to_account_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter(a => a.id !== formData.account_id)
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isTransfer && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Date & Time</Label>
            <div className="flex gap-2">
              <Input
                type="datetime-local"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={setNow}>
                Now
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea
              placeholder="Add a note..."
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : transaction ? 'Update' : isTransfer ? 'Transfer' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
