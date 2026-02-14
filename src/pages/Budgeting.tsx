import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Check, X, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TransactionForm } from '@/components/forms/TransactionForm';

interface TrackerItem {
  id: string;
  user_id: string;
  type: 'expense' | 'income';
  title: string;
  estimated_amount: number;
  is_completed: boolean;
  note: string | null;
  created_at: string;
}

const Tracker: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<TrackerItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New item inputs
  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newIncomeTitle, setNewIncomeTitle] = useState('');
  const [newIncomeAmount, setNewIncomeAmount] = useState('');
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');

  // Confirmation dialog state
  const [confirmItem, setConfirmItem] = useState<TrackerItem | null>(null);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [pendingItem, setPendingItem] = useState<TrackerItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<TrackerItem | null>(null);

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('tracker_items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Failed to fetch tracker items');
    } else {
      setItems(data as TrackerItem[]);
    }
    setLoading(false);
  };

  const addItem = async (type: 'expense' | 'income') => {
    const title = type === 'expense' ? newExpenseTitle : newIncomeTitle;
    const amount = type === 'expense' ? newExpenseAmount : newIncomeAmount;
    
    if (!title.trim() || !amount) {
      toast.error('Please enter title and amount');
      return;
    }

    const { error } = await supabase.from('tracker_items').insert({
      user_id: user?.id,
      type,
      title: title.trim(),
      estimated_amount: parseFloat(amount),
    });

    if (error) {
      toast.error('Failed to add item');
    } else {
      toast.success('Item added');
      if (type === 'expense') {
        setNewExpenseTitle('');
        setNewExpenseAmount('');
      } else {
        setNewIncomeTitle('');
        setNewIncomeAmount('');
      }
      fetchItems();
    }
  };

  const handleCheckboxClick = (item: TrackerItem) => {
    if (item.is_completed) return; // Already completed, can't toggle
    setConfirmItem(item);
  };

  const handleConfirmTransaction = () => {
    if (confirmItem) {
      setPendingItem(confirmItem);
      setConfirmItem(null);
      setShowTransactionForm(true);
    }
  };

  const handleTransactionSuccess = async () => {
    if (pendingItem) {
      // Mark item as completed
      await supabase
        .from('tracker_items')
        .update({ is_completed: true })
        .eq('id', pendingItem.id);
      
      setPendingItem(null);
      fetchItems();
    }
  };

  const handleDeleteClick = (item: TrackerItem) => {
    if (item.is_completed) {
      // Completed items delete directly without confirmation
      deleteItem(item.id);
    } else {
      // Non-completed items show confirmation dialog
      setDeleteConfirmItem(item);
    }
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('tracker_items').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Item deleted');
      fetchItems();
    }
    setDeleteConfirmItem(null);
  };

  const startEdit = (item: TrackerItem) => {
    if (item.is_completed) return; // Can't edit completed items
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditAmount(item.estimated_amount.toString());
  };

  const saveEdit = async (id: string) => {
    if (!editTitle.trim()) {
      toast.error('Title cannot be empty');
      return;
    }
    const { error } = await supabase
      .from('tracker_items')
      .update({ 
        title: editTitle.trim(),
        estimated_amount: parseFloat(editAmount) 
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update');
    } else {
      setEditingId(null);
      fetchItems();
    }
  };

  const expenseItems = items.filter(i => i.type === 'expense');
  const incomeItems = items.filter(i => i.type === 'income');

  const ItemList = ({ items, type }: { items: TrackerItem[]; type: 'expense' | 'income' }) => (
    <div className="space-y-2">
      {items.map(item => (
        <div
          key={item.id}
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg border transition-all',
            item.is_completed 
              ? 'bg-muted/50 border-border/50' 
              : 'bg-card border-border hover:border-primary/30'
          )}
        >
          <Checkbox
            checked={item.is_completed}
            onCheckedChange={() => handleCheckboxClick(item)}
            disabled={item.is_completed}
            className="shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium truncate',
              item.is_completed && 'line-through text-muted-foreground'
            )}>
              {item.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {editingId === item.id ? (
              <>
                <Input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => e.stopPropagation()}
                  placeholder="Title"
                  className="flex-1 h-8 text-sm min-w-0"
                  autoFocus
                />
                <Input
                  type="number"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  className="w-24 h-8 text-sm"
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(item.id)}>
                  <Check className="h-3.5 w-3.5 text-green-500" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <span className={cn(
                  'text-sm font-semibold tabular-nums',
                  type === 'expense' ? 'text-destructive' : 'text-green-500'
                )}>
                  ₹{item.estimated_amount.toLocaleString()}
                </span>
                {!item.is_completed && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(item)}>
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteClick(item)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No items yet</p>
      )}
    </div>
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Budgeting"
          description="Plan expenses and track money to collect"
        />

        <div className="grid md:grid-cols-2 gap-6">
          {/* Expense Wishlist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                Expense Wishlist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Item name..."
                  value={newExpenseTitle}
                  onChange={e => setNewExpenseTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem('expense')}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="₹ Amount"
                  value={newExpenseAmount}
                  onChange={e => setNewExpenseAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem('expense')}
                  className="w-28"
                />
                <Button size="icon" onClick={() => addItem('expense')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ItemList items={expenseItems} type="expense" />
            </CardContent>
          </Card>

          {/* Income Reminders */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Income Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Get money from Ram"
                  value={newIncomeTitle}
                  onChange={e => setNewIncomeTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem('income')}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="₹ Amount"
                  value={newIncomeAmount}
                  onChange={e => setNewIncomeAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem('income')}
                  className="w-28"
                />
                <Button size="icon" onClick={() => addItem('income')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ItemList items={incomeItems} type="income" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmItem} onOpenChange={(open) => !open && setConfirmItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add as Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to add "{confirmItem?.title}" as a {confirmItem?.type} transaction for ₹{confirmItem?.estimated_amount.toLocaleString()}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTransaction}>
              Yes, add transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmItem} onOpenChange={(open) => !open && setDeleteConfirmItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmItem?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmItem && deleteItem(deleteConfirmItem.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transaction Form */}
      <TransactionForm
        open={showTransactionForm}
        onOpenChange={setShowTransactionForm}
        initialValues={pendingItem ? {
          type: pendingItem.type,
          amount: pendingItem.estimated_amount.toString(),
          note: pendingItem.title
        } : undefined}
        onSuccess={handleTransactionSuccess}
      />
    </AppLayout>
  );
};

export default Tracker;
