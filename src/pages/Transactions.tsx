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

// ==========================================
// Transactions Page
// ==========================================

const Transactions: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | undefined>();

  const initialDate = useMemo(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = parseISO(dateParam);
      return isValid(parsed) ? parsed : undefined;
    }
    return undefined;
  }, [searchParams]);

  const clearUrlDateParam = useCallback(() => {
    if (searchParams.has('date')) {
      searchParams.delete('date');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleEdit = (transaction: Transaction) => {
    setEditTransaction(transaction);
    setShowForm(true);
  };

  const handleCloseForm = (open: boolean) => {
    setShowForm(open);
    if (!open) setEditTransaction(undefined);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          icon={<ArrowRightLeft className="h-6 w-6 text-primary" />}
          title="Transactions"
          description="Manage all your transactions"
          action={{ label: 'Add Transaction', onClick: () => setShowForm(true) }}
        />

        <AccountFilter />
        <TransactionList onEdit={handleEdit} initialDate={initialDate} onDateClear={clearUrlDateParam} />

        <TransactionForm
          open={showForm}
          onOpenChange={handleCloseForm}
          transaction={editTransaction}
        />
      </div>
    </AppLayout>
  );
};

export default Transactions;
