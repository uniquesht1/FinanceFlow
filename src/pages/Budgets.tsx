import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { Plus, Target } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BudgetCard } from '@/components/budgets/BudgetCard';
import { BudgetForm } from '@/components/budgets/BudgetForm';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  period: string;
  created_at: string;
  updated_at: string;
}

const Budgets: React.FC = () => {
  const { user } = useAuth();
  const { categories, transactions, accounts } = useFinance();
  const { toast } = useToast();
  
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [deleteBudget, setDeleteBudget] = useState<Budget | null>(null);

  // Get primary currency from first account
  const primaryCurrency = accounts[0]?.currency || 'USD';

  const fetchBudgets = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      toast({ title: 'Error loading budgets', description: error.message, variant: 'destructive' });
    } else {
      setBudgets(data || []);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // Calculate spending per category for current period
  const categorySpending = useMemo(() => {
    const spending: Record<string, { monthly: number; weekly: number }> = {};
    
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

    transactions.forEach(t => {
      if (t.type !== 'expense' || !t.category_id) return;
      
      const date = new Date(t.date);
      
      if (!spending[t.category_id]) {
        spending[t.category_id] = { monthly: 0, weekly: 0 };
      }

      if (date >= monthStart && date <= monthEnd) {
        spending[t.category_id].monthly += Number(t.amount);
      }
      if (date >= weekStart && date <= weekEnd) {
        spending[t.category_id].weekly += Number(t.amount);
      }
    });

    return spending;
  }, [transactions]);

  const getSpentAmount = (budget: Budget) => {
    const catSpending = categorySpending[budget.category_id];
    if (!catSpending) return 0;
    return budget.period === 'weekly' ? catSpending.weekly : catSpending.monthly;
  };

  const handleAddBudget = async (data: { category_id: string; amount: number; period: string }) => {
    if (!user) return;

    const { error } = await supabase.from('budgets').insert({
      user_id: user.id,
      category_id: data.category_id,
      amount: data.amount,
      period: data.period,
    });

    if (error) {
      toast({ title: 'Error creating budget', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Budget created successfully' });
      fetchBudgets();
    }
  };

  const handleUpdateBudget = async (data: { category_id: string; amount: number; period: string }) => {
    if (!editBudget) return;

    const { error } = await supabase
      .from('budgets')
      .update({ amount: data.amount, period: data.period })
      .eq('id', editBudget.id);

    if (error) {
      toast({ title: 'Error updating budget', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Budget updated successfully' });
      fetchBudgets();
    }
  };

  const handleDeleteBudget = async () => {
    if (!deleteBudget) return;

    const { error } = await supabase.from('budgets').delete().eq('id', deleteBudget.id);

    if (error) {
      toast({ title: 'Error deleting budget', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Budget deleted successfully' });
      fetchBudgets();
    }
    setDeleteBudget(null);
  };

  const existingCategoryIds = budgets.map(b => b.category_id);

  // Summary stats
  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + getSpentAmount(b), 0);
  const overBudgetCount = budgets.filter(b => getSpentAmount(b) > b.amount).length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Budgets"
          description="Set spending limits and track your expenses"
          icon={<Target className="h-6 w-6 text-primary" />}
          action={{
            label: 'Add Budget',
            onClick: () => { setEditBudget(null); setFormOpen(true); }
          }}
        />

        {/* Summary Cards */}
        {budgets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: primaryCurrency }).format(totalBudget)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: primaryCurrency }).format(totalSpent)}
                </p>
              </CardContent>
            </Card>
            <Card className={overBudgetCount > 0 ? 'border-destructive/50' : ''}>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Over Budget</p>
                <p className={`text-2xl font-bold ${overBudgetCount > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {overBudgetCount} {overBudgetCount === 1 ? 'category' : 'categories'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Budget List */}
        {budgets.length === 0 ? (
          <EmptyState
            icon={<Target className="h-8 w-8 text-muted-foreground" />}
            title="No budgets yet"
            description="Create your first budget to start tracking your spending limits."
            action={
              <Button onClick={() => { setEditBudget(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Budget
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map(budget => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                category={categories.find(c => c.id === budget.category_id)}
                spent={getSpentAmount(budget)}
                currency={primaryCurrency}
                onEdit={() => { setEditBudget(budget); setFormOpen(true); }}
                onDelete={() => setDeleteBudget(budget)}
              />
            ))}
          </div>
        )}

        {/* Forms and Dialogs */}
        <BudgetForm
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditBudget(null); }}
          onSubmit={editBudget ? handleUpdateBudget : handleAddBudget}
          editBudget={editBudget}
          existingCategoryIds={existingCategoryIds}
        />

        <ConfirmDialog
          open={!!deleteBudget}
          onOpenChange={() => setDeleteBudget(null)}
          title="Delete Budget"
          description={`Are you sure you want to delete the budget for "${categories.find(c => c.id === deleteBudget?.category_id)?.name}"?`}
          confirmLabel="Delete"
          onConfirm={handleDeleteBudget}
          variant="destructive"
        />
      </div>
    </AppLayout>
  );
};

export default Budgets;
