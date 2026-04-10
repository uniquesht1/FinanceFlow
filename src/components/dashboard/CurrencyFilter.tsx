import React from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

// Currency symbol mapping
const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<string, string> = {
    USD: '$',
    AUD: 'A$',
    NPR: 'रू',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    JPY: '¥',
    CAD: 'C$',
    CHF: 'CHF',
    CNY: '¥',
  };
  return symbols[currency] || currency;
};

export const CurrencyFilter: React.FC = () => {
  const {
    availableCurrencies,
    selectedCurrency,
    setSelectedCurrency,
    selectedAccountId
  } = useFinance();

  // Only show when there are multiple currencies and "All Accounts" is selected
  // When a specific account is selected, the currency is determined by that account
  if (selectedAccountId !== null || availableCurrencies.length <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 animate-fade-up" style={{ animationDelay: '150ms' }}>
      <span className="text-sm text-muted-foreground mr-1">Currency:</span>
      {availableCurrencies.map((currency, index) => (
        <Button
          key={currency}
          variant={selectedCurrency === currency ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCurrency(currency)}
          className={cn(
            'transition-all duration-200 hover:scale-105',
            selectedCurrency === currency
              ? 'shadow-md shadow-primary/25'
              : 'hover:border-primary/50'
          )}
          style={{ animationDelay: `${(index + 1) * 50}ms` }}
        >
          {selectedCurrency === currency && <Check className="h-3 w-3 mr-1.5" />}
          {getCurrencySymbol(currency)} {currency}
        </Button>
      ))}
    </div>
  );
};
