import React from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export const AccountFilter: React.FC = () => {
  const { accounts, selectedAccountId, setSelectedAccountId } = useFinance();

  return (
    <div className="flex flex-wrap gap-2 animate-fade-up" style={{ animationDelay: '100ms' }}>
      <Button
        variant={selectedAccountId === null ? 'default' : 'outline'}
        size="sm"
        onClick={() => setSelectedAccountId(null)}
        className={cn(
          'transition-all duration-200 hover:scale-105',
          selectedAccountId === null 
            ? 'shadow-md shadow-primary/25' 
            : 'hover:border-primary/50'
        )}
      >
        {selectedAccountId === null && <Check className="h-3 w-3 mr-1.5" />}
        All Accounts
      </Button>
      {accounts.map((account, index) => (
        <Button
          key={account.id}
          variant={selectedAccountId === account.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedAccountId(account.id)}
          className={cn(
            'transition-all duration-200 hover:scale-105',
            selectedAccountId === account.id 
              ? 'shadow-md shadow-primary/25' 
              : 'hover:border-primary/50'
          )}
          style={{ animationDelay: `${(index + 1) * 50}ms` }}
        >
          {selectedAccountId === account.id && <Check className="h-3 w-3 mr-1.5" />}
          {account.name}
        </Button>
      ))}
    </div>
  );
};
