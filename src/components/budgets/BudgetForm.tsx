import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFinance } from '@/contexts/FinanceContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface Budget {
  id: string;
  category_id: string;
  amount: number;
  period: string;
}

interface BudgetFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { category_id: string; amount: number; period: string }) => Promise<void>;
  editBudget?: Budget | null;
  existingCategoryIds: string[];
}

export const BudgetForm: React.FC<BudgetFormProps> = ({
  open,
  onClose,
  onSubmit,
  editBudget,
  existingCategoryIds,
}) => {
  const { categories } = useFinance();
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter to expense categories only, and exclude already budgeted ones (unless editing)
  const availableCategories = categories.filter(c => {
    if (c.type !== 'expense') return false;
    if (editBudget && c.id === editBudget.category_id) return true;
    return !existingCategoryIds.includes(c.id);
  });

  useEffect(() => {
    if (editBudget) {
      setCategoryId(editBudget.category_id);
      setAmount(editBudget.amount.toString());
      setPeriod(editBudget.period);
    } else {
      setCategoryId('');
      setAmount('');
      setPeriod('monthly');
    }
  }, [editBudget, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        category_id: categoryId,
        amount: parseFloat(amount),
        period,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editBudget ? 'Edit Budget' : 'Add Budget'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={!!editBudget}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableCategories.length === 0 && !editBudget && (
              <p className="text-sm text-muted-foreground">
                All expense categories have budgets set.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Budget Amount</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !categoryId || !amount}>
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : editBudget ? 'Update' : 'Add Budget'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
