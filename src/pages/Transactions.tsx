import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { TransactionList } from '@/components/TransactionList';
import { TransactionForm } from '@/components/forms/TransactionForm';
import { AccountFilter } from '@/components/dashboard/AccountFilter';
import { PageHeader } from '@/components/ui/page-header';
import { ArrowRightLeft } from 'lucide-react';
import { Transaction } from '@/contexts/FinanceContext';
import { parseISO, isValid } from 'date-fns';

const Transactions: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();

  const initialDate = useMemo(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = parseISO(dateParam);
      return isValid(parsed) ? parsed : undefined;
    }
    return undefined;
  }, [searchParams]);

  const handleClearUrlDate = useCallback(() => {
    if (searchParams.has('date')) {
      searchParams.delete('date');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const toggleForm = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) setEditingTransaction(undefined);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <PageHeader
          icon={<ArrowRightLeft className="h-6 w-6 text-primary" />}
          title="Transactions"
          description="View and manage your financial history"
          action={{ label: 'Add Transaction', onClick: () => toggleForm(true) }}
        />

        <div className="space-y-4">
          <AccountFilter />
          <TransactionList
            onEdit={handleEdit}
            initialDate={initialDate}
            onDateClear={handleClearUrlDate}
          />
        </div>

        <TransactionForm
          open={isFormOpen}
          onOpenChange={toggleForm}
          transaction={editingTransaction}
        />
      </div>
    </AppLayout>
  );
};

export default Transactions;