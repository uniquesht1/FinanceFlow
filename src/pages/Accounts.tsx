import React, { useState } from 'react';
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

const ACCOUNT_ICONS: Record<string, React.FC<{ className?: string }>> = {
  checking: Wallet,
  savings: PiggyBank,
  credit: CreditCard,
  cash: Banknote,
  investment: TrendingUp,
};

const Accounts: React.FC = () => {
  const { accounts, deleteAccount, loading, hideMoney } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  return (
    <AppLayout>
      {/* Stable layout — only inner content reacts */}
      {loading && accounts.length === 0 ? (
        <LoadingPage message="Loading accounts..." />
      ) : (
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
                    <Button onClick={() => setShowForm(true)}>
                      Add Your First Account
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => {
                const Icon = ACCOUNT_ICONS[account.type] || Wallet;
                const balance = Number(account.current_balance);

                return (
                  <Card
                    key={account.id}
                    className="group relative overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                  >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {account.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground capitalize">
                            {account.type}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(account)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(account.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <p
                        className={cn(
                          'text-2xl font-bold tabular-nums',
                          balance >= 0
                            ? 'text-foreground'
                            : 'text-destructive'
                        )}
                      >
                        {hideMoney ? '******' : formatCurrency(balance, account.currency)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Starting:{' '}
                        {hideMoney
                          ? '******'
                          : formatCurrency(
                            Number(account.starting_balance),
                            account.currency
                          )}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <AccountForm
            open={showForm}
            onOpenChange={handleCloseForm}
            account={editAccount}
          />

          <ConfirmDialog
            open={!!deleteId}
            onOpenChange={() => setDeleteId(null)}
            title="Delete Account"
            description="Are you sure you want to delete this account? All transactions associated with this account will also be deleted. This action cannot be undone."
            confirmLabel="Delete"
            onConfirm={handleDelete}
          />
        </div>
      )}
    </AppLayout>
  );
};

export default Accounts;