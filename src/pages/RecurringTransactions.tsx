import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Repeat, Plus, Pencil, Trash2, Pause, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';

interface RecurringTransaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: string;
  amount: number;
  title: string | null;
  note: string | null;
  frequency: string;
  start_date: string;
  next_due_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

const RecurringTransactions: React.FC = () => {
  const { user } = useAuth();
  const { accounts, categories } = useFinance();
  const { toast } = useToast();

  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<RecurringTransaction | null>(null);
  const [deleteItem, setDeleteItem] = useState<RecurringTransaction | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: 'expense',
    account_id: '',
    category_id: '',
    amount: '',
    title: '',
    note: '',
    frequency: 'monthly',
    start_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const fetchItems = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .order('next_due_date', { ascending: true });

    if (error) {
      toast({ title: 'Error loading recurring transactions', description: error.message, variant: 'destructive' });
    } else {
      setItems((data || []) as RecurringTransaction[]);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openForm = (item?: RecurringTransaction) => {
    if (item) {
      setEditItem(item);
      setFormData({
        type: item.type,
        account_id: item.account_id,
        category_id: item.category_id || '',
        amount: item.amount.toString(),
        title: item.title || '',
        note: item.note || '',
        frequency: item.frequency,
        start_date: item.start_date,
      });
    } else {
      setEditItem(null);
      setFormData({
        type: 'expense',
        account_id: accounts[0]?.id || '',
        category_id: '',
        amount: '',
        title: '',
        note: '',
        frequency: 'monthly',
        start_date: format(new Date(), 'yyyy-MM-dd'),
      });
    }
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.account_id || !formData.amount) return;

    const payload = {
      user_id: user.id,
      account_id: formData.account_id,
      category_id: formData.category_id || null,
      type: formData.type,
      amount: parseFloat(formData.amount),
      title: formData.title || null,
      note: formData.note || null,
      frequency: formData.frequency,
      start_date: formData.start_date,
      next_due_date: formData.start_date,
    };

    if (editItem) {
      const { error } = await supabase
        .from('recurring_transactions')
        .update(payload)
        .eq('id', editItem.id);
      if (error) {
        toast({ title: 'Error updating', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Recurring transaction updated' });
      }
    } else {
      const { error } = await supabase
        .from('recurring_transactions')
        .insert(payload);
      if (error) {
        toast({ title: 'Error creating', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Recurring transaction created' });
      }
    }
    setFormOpen(false);
    fetchItems();
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    const { error } = await supabase.from('recurring_transactions').delete().eq('id', deleteItem.id);
    if (error) {
      toast({ title: 'Error deleting', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Recurring transaction deleted' });
    }
    setDeleteItem(null);
    fetchItems();
  };

  const toggleActive = async (item: RecurringTransaction) => {
    const { error } = await supabase
      .from('recurring_transactions')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);
    if (!error) fetchItems();
  };

  const processRecurring = async () => {
    // Process all due recurring transactions
    const today = format(new Date(), 'yyyy-MM-dd');
    const dueItems = items.filter(i => i.is_active && i.next_due_date <= today);

    if (dueItems.length === 0) {
      toast({ title: 'No due transactions', description: 'All recurring transactions are up to date.' });
      return;
    }

    let created = 0;
    for (const item of dueItems) {
      // Create transaction
      const { error: txError } = await supabase.from('transactions').insert({
        user_id: item.user_id,
        account_id: item.account_id,
        category_id: item.category_id,
        type: item.type,
        amount: item.amount,
        title: item.title ? `[Recurring] ${item.title}` : '[Recurring]',
        note: item.note,
        date: item.next_due_date,
      });

      if (!txError) {
        created++;
        // Calculate next due date
        const nextDate = new Date(item.next_due_date);
        switch (item.frequency) {
          case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
          case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
          case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
          case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        }

        await supabase
          .from('recurring_transactions')
          .update({ next_due_date: format(nextDate, 'yyyy-MM-dd') })
          .eq('id', item.id);
      }
    }

    toast({ title: `Processed ${created} recurring transaction${created !== 1 ? 's' : ''}` });
    fetchItems();
  };

  const filteredCategories = categories.filter(c => c.type === formData.type);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  const dueCount = items.filter(i => i.is_active && i.next_due_date <= format(new Date(), 'yyyy-MM-dd')).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Recurring Transactions"
          description="Manage your subscriptions, rent, salary, and other recurring items"
          icon={<Repeat className="h-6 w-6 text-primary" />}
          action={{ label: 'Add Recurring', onClick: () => openForm() }}
        />

        {dueCount > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 flex items-center justify-between">
              <p className="text-sm text-foreground">
                <strong>{dueCount}</strong> recurring transaction{dueCount !== 1 ? 's are' : ' is'} due
              </p>
              <Button size="sm" onClick={processRecurring}>
                Process Now
              </Button>
            </CardContent>
          </Card>
        )}

        {items.length === 0 ? (
          <EmptyState
            icon={<Repeat className="h-8 w-8 text-muted-foreground" />}
            title="No recurring transactions"
            description="Add recurring items like rent, salary, or subscriptions."
            action={
              <Button onClick={() => openForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Recurring
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const account = accounts.find(a => a.id === item.account_id);
              const category = categories.find(c => c.id === item.category_id);
              return (
                <div
                  key={item.id}
                  className={cn(
                    'group flex items-center justify-between p-4 bg-card border border-border/50 rounded-lg hover:border-primary/30 transition-all',
                    !item.is_active && 'opacity-50'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'p-2 rounded-lg',
                      item.type === 'income' ? 'bg-emerald-500/10' : 'bg-destructive/10'
                    )}>
                      <Repeat className={cn('h-4 w-4', item.type === 'income' ? 'text-emerald-500' : 'text-destructive')} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.title || category?.name || 'Untitled'}</p>
                      <p className="text-sm text-muted-foreground">
                        {account?.name} • {item.frequency} • Next: {format(new Date(item.next_due_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>
                      {item.is_active ? 'Active' : 'Paused'}
                    </Badge>
                    <span className={cn(
                      'font-semibold tabular-nums',
                      item.type === 'income' ? 'text-emerald-500' : 'text-destructive'
                    )}>
                      {item.type === 'income' ? '+' : '-'}
                      {formatCurrency(Number(item.amount), account?.currency || 'USD')}
                    </span>
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(item)}>
                        {item.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteItem(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Form Dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editItem ? 'Edit' : 'Add'} Recurring Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v, category_id: '' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Netflix, Rent" />
              </div>
              <div className="space-y-2">
                <Label>Account</Label>
                <Select value={formData.account_id} onValueChange={v => setFormData({ ...formData, account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category_id} onValueChange={v => setFormData({ ...formData, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={formData.frequency} onValueChange={v => setFormData({ ...formData, frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} required />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button type="submit">{editItem ? 'Update' : 'Add'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <ConfirmDialog
          open={!!deleteItem}
          onOpenChange={() => setDeleteItem(null)}
          title="Delete Recurring Transaction"
          description={`Are you sure you want to delete "${deleteItem?.title || 'this recurring transaction'}"?`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
        />
      </div>
    </AppLayout>
  );
};

export default RecurringTransactions;
