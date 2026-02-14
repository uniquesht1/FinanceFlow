import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AccountForm } from '@/components/forms/AccountForm';
import { useFinance, Account } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingPage } from '@/components/ui/loading-spinner';
import { Pencil, Trash2, Wallet, CreditCard, Banknote, TrendingUp, PiggyBank } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

// ==========================================
// Account Icon Mapping
// ==========================================

const ACCOUNT_ICONS: Record<string, React.FC<{ className?: string }>> = {
  checking: Wallet,
  savings: PiggyBank,
  credit: CreditCard,
  cash: Banknote,
  investment: TrendingUp,
};

// ==========================================
// Accounts Page
// ==========================================

const Accounts: React.FC = () => {
  const { accounts, transactions, deleteAccount, loading } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Calculate current balance for each account
  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    accounts.forEach((account) => {
      const accountTransactions = transactions.filter((t) => t.account_id === account.id);
      const income = accountTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = accountTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      balances[account.id] = Number(account.starting_balance) + income - expenses;
    });
    return balances;
  }, [accounts, transactions]);

  const handleEdit = (account: Account) => {
    setEditAccount(account);
    setShowForm(true);
  };

  const handleCloseForm = (open: boolean) => {
    setShowForm(open);
    if (!open) setEditAccount(undefined);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteAccount(deleteId);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingPage message="Loading accounts..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          icon={<Wallet className="h-6 w-6 text-primary" />}
          title="Accounts"
          description="Manage your financial accounts"
          action={{ label: 'Add Account', onClick: () => setShowForm(true) }}
        />

        {accounts.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="py-8">
              <EmptyState
                icon={<Wallet className="h-8 w-8 text-primary" />}
                title="No accounts yet"
                description="Add your first account to start tracking finances."
                action={
                  <Button onClick={() => setShowForm(true)} className="shadow-lg shadow-primary/25">
                    Add Your First Account
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account, index) => {
              const Icon = ACCOUNT_ICONS[account.type] || Wallet;
              const balance = accountBalances[account.id] || 0;
              
              return (
                <Card 
                  key={account.id} 
                  className="group relative overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 animate-fade-up"
                  style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-primary/10 transition-transform duration-200 group-hover:scale-110">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base group-hover:text-primary transition-colors duration-200">
                          {account.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground capitalize">{account.type}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEdit(account)}
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setDeleteId(account.id)}
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <p
                      className={cn(
                        'text-2xl font-bold tabular-nums transition-transform duration-200 group-hover:scale-105 origin-left',
                        balance >= 0 ? 'text-foreground' : 'text-destructive'
                      )}
                    >
                      {formatCurrency(balance, account.currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Starting: {formatCurrency(Number(account.starting_balance), account.currency)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <AccountForm open={showForm} onOpenChange={handleCloseForm} account={editAccount} />

        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={() => setDeleteId(null)}
          title="Delete Account"
          description="Are you sure you want to delete this account? All transactions associated with this account will also be deleted. This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
        />
      </div>
    </AppLayout>
  );
};

export default Accounts;
